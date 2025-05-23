/**
 * 路径保护调试 API
 * 用于检查路径保护设置和状态
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

    // 检查数据库是否已初始化
    let dbInitialized = false;
    try {
      await db.prepare('SELECT 1 FROM settings LIMIT 1').first();
      dbInitialized = true;
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未初始化',
        dbInitialized: false
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

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

    // 分析路径保护状态
    const analysis = {
      dbInitialized: dbInitialized,
      settings: settings,
      pathProtection: {
        homePathEnabled: settings.enable_home_path === 'true',
        homePathSet: !!settings.home_path,
        adminPathSet: !!settings.admin_path,
        homePathValue: settings.home_path || null,
        adminPathValue: settings.admin_path || null
      },
      urls: {
        currentDomain: new URL(request.url).origin
      }
    };

    // 生成测试URL
    if (settings.home_path && settings.enable_home_path === 'true') {
      analysis.urls.protectedHomePage = `${analysis.urls.currentDomain}/${settings.home_path}/`;
      analysis.urls.blockedHomePage = `${analysis.urls.currentDomain}/`;
    }

    if (settings.admin_path) {
      analysis.urls.protectedAdminPage = `${analysis.urls.currentDomain}/${settings.admin_path}/admin.html`;
      analysis.urls.blockedAdminPage = `${analysis.urls.currentDomain}/admin.html`;
    }

    // 生成建议
    const suggestions = [];
    
    if (!settings.admin_path && !settings.home_path) {
      suggestions.push('未设置任何路径保护，所有页面都可以通过默认路径访问');
    }
    
    if (settings.enable_home_path === 'true' && !settings.home_path) {
      suggestions.push('启用了首页路径保护但未设置首页路径');
    }
    
    if (settings.home_path && settings.enable_home_path !== 'true') {
      suggestions.push('设置了首页路径但未启用首页路径保护');
    }

    if (settings.admin_path) {
      suggestions.push(`管理后台路径保护已启用，只能通过 /${settings.admin_path}/admin.html 访问`);
    }

    if (settings.enable_home_path === 'true' && settings.home_path) {
      suggestions.push(`首页路径保护已启用，只能通过 /${settings.home_path}/ 访问`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '路径保护状态检查完成',
      analysis: analysis,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('路径保护调试失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '路径保护调试失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
