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
    
    if (env.DB) {
      try {
        // 尝试执行一个简单的查询来测试数据库连接
        const result = await env.DB.prepare('SELECT 1 as test').first();
        if (result && result.test === 1) {
          dbStatus = 'connected';
        }
      } catch (error) {
        dbError = error.message;
      }
    }
    
    const response = {
      status: dbStatus === 'connected' ? 'connected' : 'error',
      message: dbStatus === 'connected' ? '书签管理API服务正常运行' : '数据库连接失败',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      endpoints: {
        bookmarks: '/api/bookmarks',
        categories: '/api/categories',
        domains: '/api/domains',
        stats: '/api/stats',
        settings: '/api/settings',
        export: '/api/export',
        import: '/api/import',
        backup: '/api/backup'
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
