/**
 * 数据导出API端点
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  
  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持GET请求'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
  
  try {
    // 获取所有书签
    const bookmarks = await env.DB.prepare('SELECT * FROM bookmarks ORDER BY created_at').all();
    
    // 获取所有分类
    const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY parent_id, name').all();
    
    // 获取所有设置
    const settings = await env.DB.prepare('SELECT * FROM settings').all();
    
    const exportData = {
      version: '1.0',
      export_date: new Date().toISOString(),
      data: {
        bookmarks: bookmarks.results || [],
        categories: categories.results || [],
        settings: settings.results || []
      },
      stats: {
        bookmarks_count: (bookmarks.results || []).length,
        categories_count: (categories.results || []).length,
        settings_count: (settings.results || []).length
      }
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: '数据导出成功',
      data: exportData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '导出数据失败',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
