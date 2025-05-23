/**
 * 域名统计API端点
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
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const domain = pathSegments[pathSegments.length - 1];
    
    if (domain && domain !== 'domains') {
      return getDomainBookmarks(env, domain);
    } else {
      return getDomains(env);
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误',
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

// 获取所有域名统计
async function getDomains(env) {
  try {
    const domains = await env.DB.prepare(`
      SELECT domain, COUNT(*) as count
      FROM bookmarks 
      GROUP BY domain 
      ORDER BY count DESC, domain ASC
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      domains: (domains.results || []).map(d => d.domain)
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
      message: '获取域名列表失败',
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

// 获取特定域名的书签
async function getDomainBookmarks(env, domain) {
  try {
    const bookmarks = await env.DB.prepare(`
      SELECT * FROM bookmarks 
      WHERE domain = ? 
      ORDER BY created_at DESC
    `).bind(domain).all();
    
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM bookmarks WHERE domain = ?
    `).bind(domain).first();
    
    return new Response(JSON.stringify({
      success: true,
      domain: domain,
      count: count.count,
      bookmarks: bookmarks.results || []
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
      message: '获取域名书签失败',
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
