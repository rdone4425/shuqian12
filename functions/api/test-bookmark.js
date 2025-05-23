/**
 * 书签测试 API
 * 专门用于Chrome插件调试，提供详细的请求信息
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
    // 收集请求信息
    const requestInfo = {
      method: method,
      url: request.url,
      headers: {},
      timestamp: new Date().toISOString()
    };

    // 收集所有请求头
    for (const [key, value] of request.headers.entries()) {
      requestInfo.headers[key] = value;
    }

    let body = null;
    let rawBody = '';

    // 读取请求体
    if (method === 'POST' || method === 'PUT') {
      try {
        rawBody = await request.text();
        requestInfo.rawBody = rawBody;
        requestInfo.bodyLength = rawBody.length;

        if (rawBody) {
          try {
            body = JSON.parse(rawBody);
            requestInfo.parsedBody = body;
            requestInfo.jsonValid = true;
          } catch (error) {
            requestInfo.jsonValid = false;
            requestInfo.jsonError = error.message;
          }
        }
      } catch (error) {
        requestInfo.bodyReadError = error.message;
      }
    }

    // 检查数据库连接
    let dbInfo = { connected: false };
    if (env.DB) {
      try {
        await env.DB.prepare('SELECT 1').first();
        dbInfo.connected = true;
        
        // 检查表是否存在
        try {
          const tableCheck = await env.DB.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'
          `).first();
          dbInfo.bookmarksTableExists = !!tableCheck;
        } catch (error) {
          dbInfo.tableCheckError = error.message;
        }
      } catch (error) {
        dbInfo.connectionError = error.message;
      }
    }

    // 如果是POST请求且有有效的JSON数据，尝试处理书签
    let bookmarkResult = null;
    if (method === 'POST' && body && dbInfo.connected && dbInfo.bookmarksTableExists) {
      bookmarkResult = await processTestBookmark(env.DB, body);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Test endpoint - request processed',
      request: requestInfo,
      database: dbInfo,
      bookmark_processing: bookmarkResult,
      suggestions: generateSuggestions(requestInfo, dbInfo, body)
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Test endpoint error: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 处理测试书签
async function processTestBookmark(db, data) {
  const result = {
    attempted: true,
    success: false,
    analysis: {}
  };

  try {
    // 分析数据格式
    result.analysis = {
      dataType: typeof data,
      isArray: Array.isArray(data),
      hasTitle: !!(data && data.title),
      hasUrl: !!(data && data.url),
      hasDomain: !!(data && data.domain),
      hasBookmarks: !!(data && data.bookmarks),
      keys: typeof data === 'object' ? Object.keys(data) : []
    };

    // 提取书签信息
    let title, url, domain;

    if (data.title && data.url) {
      title = data.title;
      url = data.url;
      domain = data.domain || extractDomain(url);
    } else if (Array.isArray(data) && data.length > 0 && data[0].title && data[0].url) {
      title = data[0].title;
      url = data[0].url;
      domain = data[0].domain || extractDomain(url);
      result.analysis.note = 'Using first item from array';
    } else if (data.bookmarks && Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
      const firstBookmark = data.bookmarks[0];
      title = firstBookmark.title;
      url = firstBookmark.url;
      domain = firstBookmark.domain || extractDomain(url);
      result.analysis.note = 'Using first item from bookmarks array';
    }

    if (title && url && domain) {
      result.analysis.extractedData = { title, url, domain };

      // 检查是否已存在
      const existing = await db.prepare('SELECT id FROM bookmarks WHERE url = ?').bind(url).first();
      if (existing) {
        result.message = 'Bookmark with this URL already exists';
        result.existingId = existing.id;
      } else {
        // 尝试插入（测试模式，实际不插入）
        result.message = 'Bookmark data is valid and would be inserted';
        result.success = true;
        result.wouldInsert = true;
      }
    } else {
      result.message = 'Missing required fields: title, url';
      result.missingFields = {
        title: !title,
        url: !url,
        domain: !domain
      };
    }

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

// 从URL提取域名
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    const match = url.match(/^https?:\/\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
}

// 生成建议
function generateSuggestions(requestInfo, dbInfo, body) {
  const suggestions = [];

  if (!dbInfo.connected) {
    suggestions.push('数据库未连接，请检查D1数据库绑定');
  }

  if (!dbInfo.bookmarksTableExists) {
    suggestions.push('bookmarks表不存在，请先初始化数据库');
  }

  if (requestInfo.method === 'POST') {
    if (!requestInfo.jsonValid) {
      suggestions.push('JSON格式无效，请检查请求体格式');
    } else if (!body) {
      suggestions.push('请求体为空，请发送书签数据');
    } else if (!body.title || !body.url) {
      suggestions.push('缺少必要字段：title 和 url');
    }
  }

  if (requestInfo.headers['content-type'] !== 'application/json') {
    suggestions.push('建议设置 Content-Type: application/json');
  }

  return suggestions;
}
