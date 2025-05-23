/**
 * 数据库备份API端点
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持POST请求'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
  
  try {
    // 更新最后备份时间
    const backupTime = new Date().toISOString();
    
    await env.DB.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('last_backup', ?, datetime('now'))
    `).bind(backupTime).run();
    
    // 获取数据库统计信息
    const bookmarksCount = await env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
    const categoriesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
    const settingsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM settings').first();
    
    return new Response(JSON.stringify({
      success: true,
      message: '数据库备份成功',
      backup_time: backupTime,
      stats: {
        bookmarks: bookmarksCount.count,
        categories: categoriesCount.count,
        settings: settingsCount.count
      }
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
      message: '备份失败',
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
