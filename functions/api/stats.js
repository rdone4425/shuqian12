/**
 * 统计信息API端点
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
    // 获取书签总数
    const bookmarksCount = await env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
    
    // 获取域名总数
    const domainsCount = await env.DB.prepare('SELECT COUNT(DISTINCT domain) as count FROM bookmarks').first();
    
    // 获取分类总数
    const categoriesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
    
    // 获取最后更新时间
    const lastUpdate = await env.DB.prepare('SELECT MAX(updated_at) as last_update FROM bookmarks').first();
    
    // 获取最近添加的书签数量（最近7天）
    const recentBookmarks = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM bookmarks 
      WHERE created_at >= datetime('now', '-7 days')
    `).first();
    
    // 获取热门域名（前5个）
    const topDomains = await env.DB.prepare(`
      SELECT domain, COUNT(*) as count
      FROM bookmarks 
      GROUP BY domain 
      ORDER BY count DESC 
      LIMIT 5
    `).all();
    
    // 获取分类统计
    const categoryStats = await env.DB.prepare(`
      SELECT c.name, COUNT(b.id) as count
      FROM categories c
      LEFT JOIN bookmarks b ON c.id = b.category_id
      WHERE c.parent_id IS NULL
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `).all();
    
    const stats = {
      bookmarks_count: bookmarksCount.count,
      domains_count: domainsCount.count,
      categories_count: categoriesCount.count,
      last_update: lastUpdate.last_update,
      recent_bookmarks: recentBookmarks.count,
      top_domains: topDomains.results || [],
      category_stats: categoryStats.results || []
    };
    
    return new Response(JSON.stringify({
      success: true,
      stats: stats
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
      message: '获取统计信息失败',
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
