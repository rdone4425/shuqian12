/**
 * 中间件测试 API
 * 用于测试路径匹配逻辑
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持GET请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const testPath = url.searchParams.get('path') || '/';

    // 获取路径保护设置
    const settings = {};
    try {
      const settingsResult = await db.prepare(`
        SELECT key, value FROM settings
        WHERE key IN ('home_path', 'enable_home_path', 'admin_path')
      `).all();

      for (const setting of settingsResult.results || settingsResult) {
        settings[setting.key] = setting.value;
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '获取设置失败: ' + error.message
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 测试路径匹配逻辑
    const analysis = {
      testPath: testPath,
      settings: settings,
      matches: {}
    };

    // 检查是否匹配受保护的首页路径
    const isProtectedHomePath = settings.enable_home_path === 'true' &&
                               settings.home_path &&
                               (testPath === `/${settings.home_path}` || 
                                testPath === `/${settings.home_path}/`);

    analysis.matches.protectedHomePath = {
      enabled: settings.enable_home_path === 'true',
      pathSet: !!settings.home_path,
      expectedPaths: settings.home_path ? [
        `/${settings.home_path}`,
        `/${settings.home_path}/`
      ] : [],
      matches: isProtectedHomePath
    };

    // 检查是否匹配受保护的管理路径
    const isProtectedAdminPath = settings.admin_path &&
                                testPath === `/${settings.admin_path}/admin.html`;

    analysis.matches.protectedAdminPath = {
      pathSet: !!settings.admin_path,
      expectedPath: settings.admin_path ? `/${settings.admin_path}/admin.html` : null,
      matches: isProtectedAdminPath
    };

    // 检查是否应该阻止访问默认路径
    const shouldBlockHomePage = settings.enable_home_path === 'true' &&
                               settings.home_path &&
                               (testPath === '/' || testPath === '/index.html');

    const shouldBlockAdminPage = settings.admin_path &&
                                testPath === '/admin.html';

    analysis.matches.blockedPaths = {
      shouldBlockHomePage: shouldBlockHomePage,
      shouldBlockAdminPage: shouldBlockAdminPage,
      wouldBlock: shouldBlockHomePage || shouldBlockAdminPage
    };

    // 生成建议
    const suggestions = [];
    
    if (isProtectedHomePath) {
      suggestions.push('此路径匹配受保护的首页路径，应该显示首页内容');
    } else if (isProtectedAdminPath) {
      suggestions.push('此路径匹配受保护的管理路径，应该显示管理页面');
    } else if (shouldBlockHomePage || shouldBlockAdminPage) {
      suggestions.push('此路径应该被阻止，显示404页面');
    } else {
      suggestions.push('此路径不受路径保护影响，正常处理');
    }

    return new Response(JSON.stringify({
      success: true,
      message: '路径匹配测试完成',
      analysis: analysis,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('中间件测试失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '中间件测试失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
