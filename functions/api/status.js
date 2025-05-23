/**
 * API状态检查端点
 */

export async function onRequest(context) {
  const { request, env } = context;

  // CORS 头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // 检查数据库连接
    let dbStatus = 'disconnected';
    let dbError = null;
    let tablesStatus = {};
    let isReady = false;

    if (!env.DB) {
      dbStatus = 'not_bound';
      dbError = '数据库未绑定，请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）';
    } else {
      try {
        // 尝试执行一个简单的查询来测试数据库连接
        const result = await env.DB.prepare('SELECT 1 as test').first();
        if (result && result.test === 1) {
          dbStatus = 'connected';

          // 检查表是否存在
          const requiredTables = ['bookmarks', 'categories', 'settings'];
          for (const tableName of requiredTables) {
            try {
              await env.DB.prepare(`SELECT 1 FROM ${tableName} LIMIT 1`).first();
              tablesStatus[tableName] = 'exists';
            } catch (error) {
              if (error.message.includes('no such table')) {
                tablesStatus[tableName] = 'missing';
              } else {
                tablesStatus[tableName] = 'error';
              }
            }
          }

          // 检查是否所有表都存在
          isReady = Object.values(tablesStatus).every(status => status === 'exists');
        }
      } catch (error) {
        dbError = error.message;
        dbStatus = 'error';
      }
    }

    const response = {
      status: isReady ? 'ready' : (dbStatus === 'connected' ? 'needs_setup' : 'error'),
      message: isReady ? '书签管理API服务正常运行' :
               (dbStatus === 'connected' ? '数据库已连接，但需要初始化表结构' :
                (dbStatus === 'not_bound' ? '数据库未绑定' : '数据库连接失败')),
      database: dbStatus,
      tables: tablesStatus,
      ready: isReady,
      timestamp: new Date().toISOString(),
      endpoints: {
        bookmarks: '/api/bookmarks',
        categories: '/api/categories',
        domains: '/api/domains',
        stats: '/api/stats',
        settings: '/api/settings',
        export: '/api/export',
        import: '/api/import',
        backup: '/api/backup',
        setup: '/api/setup'
      }
    };

    if (dbError) {
      response.error = dbError;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: '服务器内部错误',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
