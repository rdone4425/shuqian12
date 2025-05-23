/**
 * 请求捕获 API
 * 捕获并记录Chrome插件的实际请求，用于调试
 */

import { CORS_HEADERS } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 捕获请求信息
    const capturedRequest = {
      timestamp: new Date().toISOString(),
      method: method,
      url: request.url,
      headers: {},
      body: null,
      rawBody: '',
      analysis: {}
    };

    // 收集请求头
    for (const [key, value] of request.headers.entries()) {
      capturedRequest.headers[key] = value;
    }

    // 读取请求体
    if (method === 'POST' || method === 'PUT') {
      try {
        capturedRequest.rawBody = await request.text();
        
        if (capturedRequest.rawBody) {
          try {
            capturedRequest.body = JSON.parse(capturedRequest.rawBody);
            capturedRequest.analysis.jsonValid = true;
          } catch (error) {
            capturedRequest.analysis.jsonValid = false;
            capturedRequest.analysis.jsonError = error.message;
          }
        }
      } catch (error) {
        capturedRequest.analysis.bodyReadError = error.message;
      }
    }

    // 分析请求
    capturedRequest.analysis.contentType = capturedRequest.headers['content-type'] || 'not specified';
    capturedRequest.analysis.userAgent = capturedRequest.headers['user-agent'] || 'not specified';
    capturedRequest.analysis.origin = capturedRequest.headers['origin'] || 'not specified';
    capturedRequest.analysis.bodyLength = capturedRequest.rawBody.length;
    capturedRequest.analysis.hasBody = capturedRequest.rawBody.length > 0;

    // 如果是书签相关的请求，进行特殊分析
    if (capturedRequest.body) {
      capturedRequest.analysis.bookmarkAnalysis = analyzeBookmarkData(capturedRequest.body);
    }

    // 记录到数据库（如果可用）
    let logId = null;
    if (env.DB) {
      try {
        // 检查是否有sync_logs表
        const tableCheck = await env.DB.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='sync_logs'
        `).first();

        if (tableCheck) {
          const result = await env.DB.prepare(`
            INSERT INTO sync_logs (type, level, message, details, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `).bind(
            'chrome_plugin',
            'info',
            `Chrome插件请求捕获: ${method} ${new URL(request.url).pathname}`,
            JSON.stringify(capturedRequest)
          ).run();
          
          logId = result.meta.last_row_id;
        }
      } catch (error) {
        capturedRequest.analysis.logError = error.message;
      }
    }

    // 返回捕获的信息
    return new Response(JSON.stringify({
      success: true,
      message: 'Request captured successfully',
      logId: logId,
      captured: capturedRequest,
      recommendations: generateRecommendations(capturedRequest)
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Request capture failed: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 分析书签数据
function analyzeBookmarkData(data) {
  const analysis = {
    dataType: typeof data,
    isArray: Array.isArray(data),
    structure: 'unknown'
  };

  if (data.title && data.url) {
    analysis.structure = 'single_bookmark';
    analysis.fields = {
      title: data.title,
      url: data.url,
      domain: data.domain,
      hasTitle: !!data.title,
      hasUrl: !!data.url,
      hasDomain: !!data.domain
    };
  } else if (Array.isArray(data)) {
    analysis.structure = 'bookmark_array';
    analysis.count = data.length;
    if (data.length > 0) {
      analysis.firstItem = {
        hasTitle: !!data[0].title,
        hasUrl: !!data[0].url,
        hasDomain: !!data[0].domain
      };
    }
  } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
    analysis.structure = 'bookmarks_wrapper';
    analysis.count = data.bookmarks.length;
  } else {
    analysis.structure = 'unknown';
    analysis.keys = Object.keys(data);
  }

  return analysis;
}

// 生成建议
function generateRecommendations(capturedRequest) {
  const recommendations = [];

  if (capturedRequest.method === 'POST') {
    if (!capturedRequest.analysis.hasBody) {
      recommendations.push('POST请求没有请求体，Chrome插件可能没有发送数据');
    } else if (!capturedRequest.analysis.jsonValid) {
      recommendations.push('请求体不是有效的JSON格式');
    } else if (capturedRequest.body) {
      const bookmarkAnalysis = capturedRequest.analysis.bookmarkAnalysis;
      
      if (bookmarkAnalysis.structure === 'single_bookmark') {
        if (!bookmarkAnalysis.fields.hasTitle) {
          recommendations.push('缺少title字段');
        }
        if (!bookmarkAnalysis.fields.hasUrl) {
          recommendations.push('缺少url字段');
        }
        if (!bookmarkAnalysis.fields.hasDomain) {
          recommendations.push('建议添加domain字段（可自动提取）');
        }
      } else if (bookmarkAnalysis.structure === 'unknown') {
        recommendations.push('数据结构不符合预期，请检查Chrome插件的数据格式');
      }
    }
  }

  if (capturedRequest.analysis.contentType !== 'application/json') {
    recommendations.push('建议设置Content-Type为application/json');
  }

  return recommendations;
}
