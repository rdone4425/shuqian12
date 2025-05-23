/**
 * 数据库状态检查 API
 * 用于检查数据库初始化状态和设置保存情况
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
        message: '数据库未配置',
        status: {
          dbConfigured: false,
          tablesExist: false,
          settingsCount: 0,
          usersCount: 0,
          bookmarksCount: 0
        }
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const status = {
      dbConfigured: true,
      tablesExist: false,
      settingsCount: 0,
      usersCount: 0,
      bookmarksCount: 0,
      categoriesCount: 0,
      tables: [],
      settings: {},
      lastInitTime: null
    };

    try {
      // 检查表是否存在
      const tablesResult = await db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      
      status.tables = (tablesResult.results || tablesResult).map(row => row.name);
      
      const requiredTables = ['settings', 'users', 'bookmarks', 'categories'];
      const existingRequiredTables = status.tables.filter(table => requiredTables.includes(table));
      status.tablesExist = existingRequiredTables.length === requiredTables.length;

      if (status.tablesExist) {
        // 获取各表的记录数
        try {
          const settingsCount = await db.prepare('SELECT COUNT(*) as count FROM settings').first();
          status.settingsCount = settingsCount.count;
        } catch (error) {
          console.error('获取设置数量失败:', error);
        }

        try {
          const usersCount = await db.prepare('SELECT COUNT(*) as count FROM users').first();
          status.usersCount = usersCount.count;
        } catch (error) {
          console.error('获取用户数量失败:', error);
        }

        try {
          const bookmarksCount = await db.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
          status.bookmarksCount = bookmarksCount.count;
        } catch (error) {
          console.error('获取书签数量失败:', error);
        }

        try {
          const categoriesCount = await db.prepare('SELECT COUNT(*) as count FROM categories').first();
          status.categoriesCount = categoriesCount.count;
        } catch (error) {
          console.error('获取分类数量失败:', error);
        }

        // 获取所有设置
        try {
          const settingsResult = await db.prepare('SELECT key, value FROM settings').all();
          const settingsData = settingsResult.results || settingsResult;
          
          for (const setting of settingsData) {
            status.settings[setting.key] = setting.value;
          }
        } catch (error) {
          console.error('获取设置失败:', error);
        }

        // 获取最后初始化时间
        try {
          const lastInit = await db.prepare(`
            SELECT created_at FROM sync_logs 
            WHERE action = 'database_init' 
            ORDER BY created_at DESC 
            LIMIT 1
          `).first();
          
          if (lastInit) {
            status.lastInitTime = lastInit.created_at;
          }
        } catch (error) {
          console.error('获取初始化时间失败:', error);
        }
      }

    } catch (error) {
      console.error('数据库状态检查失败:', error);
      return new Response(JSON.stringify({
        success: false,
        message: '数据库状态检查失败: ' + error.message,
        status: status,
        error: error.toString()
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 判断数据库是否已完全初始化
    const isFullyInitialized = status.tablesExist && 
                              status.settingsCount > 0 && 
                              status.usersCount > 0;

    return new Response(JSON.stringify({
      success: true,
      message: '数据库状态检查完成',
      isInitialized: isFullyInitialized,
      status: status,
      recommendations: generateRecommendations(status),
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据库状态检查失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '数据库状态检查失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 生成建议
function generateRecommendations(status) {
  const recommendations = [];

  if (!status.dbConfigured) {
    recommendations.push('数据库未配置，请检查 D1 数据库绑定');
  } else if (!status.tablesExist) {
    recommendations.push('数据库表不存在，需要运行数据库初始化');
  } else if (status.settingsCount === 0) {
    recommendations.push('设置表为空，需要重新初始化默认设置');
  } else if (status.usersCount === 0) {
    recommendations.push('用户表为空，需要创建管理员账户');
  } else {
    recommendations.push('数据库状态正常');
    
    // 检查路径保护设置
    if (status.settings.admin_path) {
      recommendations.push(`管理后台路径已设置: /${status.settings.admin_path}/admin.html`);
    }
    
    if (status.settings.enable_home_path === 'true' && status.settings.home_path) {
      recommendations.push(`首页路径保护已启用: /${status.settings.home_path}/`);
    }
  }

  return recommendations;
}
