/**
 * Chrome插件格式测试 API
 * 测试Chrome插件的实际数据格式
 */

import { CORS_HEADERS } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '请使用POST方法测试Chrome插件格式'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 解析请求数据
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的JSON格式',
        error: error.message
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 分析Chrome插件格式
    const analysis = {
      received_data: data,
      data_type: typeof data,
      is_array: Array.isArray(data),
      has_action: !!(data && data.action),
      has_data: !!(data && data.data),
      format_detected: 'unknown'
    };

    let bookmarkData = null;
    let processedSuccessfully = false;

    // 检测Chrome插件格式
    if (data.action && data.data) {
      analysis.format_detected = 'chrome_plugin';
      analysis.action = data.action;
      analysis.action_type = typeof data.action;
      analysis.data_type_inner = typeof data.data;
      analysis.data_is_array = Array.isArray(data.data);

      if (data.action === 'create' || data.action === 'update') {
        bookmarkData = data.data;
        analysis.bookmark_data = bookmarkData;
        analysis.bookmark_fields = {
          title: bookmarkData.title || null,
          url: bookmarkData.url || null,
          id: bookmarkData.id || null,
          dateAdded: bookmarkData.dateAdded || null,
          path: bookmarkData.path || null
        };

        if (bookmarkData.title && bookmarkData.url) {
          processedSuccessfully = true;
          analysis.validation = 'success';
        } else {
          analysis.validation = 'missing_required_fields';
          analysis.missing_fields = {
            title: !bookmarkData.title,
            url: !bookmarkData.url
          };
        }
      } else if (data.action === 'fullSync' && Array.isArray(data.data)) {
        analysis.sync_type = 'full_sync';
        analysis.bookmark_count = data.data.length;
        analysis.first_bookmark = data.data.length > 0 ? data.data[0] : null;
        processedSuccessfully = true;
      } else {
        analysis.validation = 'unsupported_action';
        analysis.supported_actions = ['create', 'update', 'fullSync'];
      }
    } else if (data.title && data.url) {
      analysis.format_detected = 'direct_bookmark';
      bookmarkData = data;
      processedSuccessfully = true;
      analysis.validation = 'success';
    } else if (Array.isArray(data)) {
      analysis.format_detected = 'bookmark_array';
      analysis.bookmark_count = data.length;
      analysis.first_bookmark = data.length > 0 ? data[0] : null;
      processedSuccessfully = true;
    } else {
      analysis.validation = 'unknown_format';
      analysis.data_keys = Object.keys(data || {});
    }

    // 生成建议
    const suggestions = [];
    if (!processedSuccessfully) {
      if (analysis.format_detected === 'unknown') {
        suggestions.push('数据格式不符合预期，请检查发送的数据结构');
      }
      if (analysis.validation === 'missing_required_fields') {
        suggestions.push('缺少必要字段：title 和 url');
      }
      if (analysis.validation === 'unsupported_action') {
        suggestions.push(`不支持的操作：${data.action}，支持的操作：create, update, fullSync`);
      }
    } else {
      suggestions.push('数据格式正确，可以正常处理');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Chrome插件格式测试完成',
      analysis: analysis,
      processed_successfully: processedSuccessfully,
      suggestions: suggestions,
      next_steps: processedSuccessfully ? 
        ['数据格式正确，可以使用 /api/bookmarks 进行实际同步'] :
        ['请检查数据格式', '确保包含必要的 title 和 url 字段', '使用正确的 Chrome 插件格式']
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Chrome插件格式测试失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
