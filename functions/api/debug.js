/**
 * 调试 API
 * 用于诊断Chrome插件请求问题
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
    const url = new URL(request.url);
    const headers = {};
    
    // 收集所有请求头
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }

    let body = null;
    let bodyText = '';
    
    // 尝试读取请求体
    if (method === 'POST' || method === 'PUT') {
      try {
        bodyText = await request.text();
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch (e) {
            body = { error: 'Invalid JSON', raw: bodyText };
          }
        }
      } catch (error) {
        body = { error: 'Failed to read body', message: error.message };
      }
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: method,
      url: url.href,
      pathname: url.pathname,
      search: url.search,
      searchParams: Object.fromEntries(url.searchParams),
      headers: headers,
      body: body,
      bodyText: bodyText,
      contentType: headers['content-type'] || 'not specified',
      userAgent: headers['user-agent'] || 'not specified',
      origin: headers['origin'] || 'not specified',
      referer: headers['referer'] || 'not specified'
    };

    // 检查数据库连接
    let dbStatus = 'not checked';
    if (env.DB) {
      try {
        await env.DB.prepare('SELECT 1').first();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error: ' + error.message;
      }
    } else {
      dbStatus = 'not bound';
    }

    debugInfo.database = dbStatus;

    // 如果是书签相关的请求，进行额外检查
    if (url.pathname.includes('bookmarks')) {
      debugInfo.bookmarkAnalysis = analyzeBookmarkRequest(body, method);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Debug information collected',
      debug: debugInfo
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Debug failed: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 分析书签请求
function analyzeBookmarkRequest(body, method) {
  const analysis = {
    method: method,
    hasBody: !!body,
    bodyType: typeof body,
    isArray: Array.isArray(body),
    issues: [],
    suggestions: []
  };

  if (method === 'POST' && body) {
    // 检查单个书签格式
    if (body.title && body.url) {
      analysis.format = 'single_bookmark';
      analysis.fields = {
        title: !!body.title,
        url: !!body.url,
        domain: !!body.domain,
        path: !!body.path,
        category_id: !!body.category_id,
        icon_url: !!body.icon_url
      };

      if (!body.domain) {
        analysis.suggestions.push('建议包含 domain 字段');
      }
    }
    // 检查批量书签格式
    else if (Array.isArray(body)) {
      analysis.format = 'bookmark_array';
      analysis.count = body.length;
      
      if (body.length > 0) {
        const firstItem = body[0];
        analysis.firstItemFields = {
          title: !!firstItem.title,
          url: !!firstItem.url,
          domain: !!firstItem.domain
        };
      }
    }
    // 检查包含bookmarks数组的对象
    else if (body.bookmarks && Array.isArray(body.bookmarks)) {
      analysis.format = 'bookmarks_object';
      analysis.count = body.bookmarks.length;
    }
    else {
      analysis.format = 'unknown';
      analysis.issues.push('无法识别的数据格式');
      analysis.suggestions.push('请发送包含 title 和 url 的对象');
    }
  }

  return analysis;
}
