/**
 * 书签管理API端点
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const bookmarkId = pathSegments[pathSegments.length - 1];
    
    switch (request.method) {
      case 'GET':
        if (bookmarkId && bookmarkId !== 'bookmarks') {
          return getBookmark(env, bookmarkId);
        } else {
          return getBookmarks(env, url.searchParams);
        }
      case 'POST':
        return createBookmark(env, request);
      case 'PUT':
        return updateBookmark(env, request, bookmarkId);
      case 'DELETE':
        return deleteBookmark(env, bookmarkId);
      default:
        return new Response(JSON.stringify({
          success: false,
          message: '不支持的请求方法'
        }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
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

// 获取书签列表
async function getBookmarks(env, searchParams) {
  try {
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const domain = searchParams.get('domain') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const search = searchParams.get('search') || '';
    
    let query = 'SELECT * FROM bookmarks WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM bookmarks WHERE 1=1';
    const params = [];
    const countParams = [];
    
    // 添加筛选条件
    if (domain) {
      query += ' AND domain = ?';
      countQuery += ' AND domain = ?';
      params.push(domain);
      countParams.push(domain);
    }
    
    if (category) {
      if (subcategory) {
        query += ' AND category_id = ?';
        countQuery += ' AND category_id = ?';
        params.push(subcategory);
        countParams.push(subcategory);
      } else {
        query += ' AND category_id = ?';
        countQuery += ' AND category_id = ?';
        params.push(category);
        countParams.push(category);
      }
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR url LIKE ?)';
      countQuery += ' AND (title LIKE ? OR url LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }
    
    // 添加排序和分页
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // 执行查询
    const [bookmarks, countResult] = await Promise.all([
      env.DB.prepare(query).bind(...params).all(),
      env.DB.prepare(countQuery).bind(...countParams).first()
    ]);
    
    const total = countResult.total;
    
    return new Response(JSON.stringify({
      success: true,
      bookmarks: bookmarks.results || [],
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
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
      message: '获取书签失败',
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

// 获取单个书签
async function getBookmark(env, id) {
  try {
    const bookmark = await env.DB.prepare('SELECT * FROM bookmarks WHERE id = ?').bind(id).first();
    
    if (!bookmark) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      bookmark: bookmark
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
      message: '获取书签失败',
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

// 创建书签
async function createBookmark(env, request) {
  try {
    const data = await request.json();
    const { title, url, category_id, icon_url } = data;
    
    if (!title || !url) {
      return new Response(JSON.stringify({
        success: false,
        message: '标题和URL是必填字段'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    // 提取域名
    const domain = extractDomain(url);
    
    const result = await env.DB.prepare(`
      INSERT INTO bookmarks (title, url, domain, category_id, icon_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(title, url, domain, category_id || null, icon_url || null).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '书签创建成功',
      id: result.meta.last_row_id
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '创建书签失败',
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

// 更新书签
async function updateBookmark(env, request, id) {
  try {
    const data = await request.json();
    const { title, url, category_id, icon_url } = data;
    
    if (!title || !url) {
      return new Response(JSON.stringify({
        success: false,
        message: '标题和URL是必填字段'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    // 提取域名
    const domain = extractDomain(url);
    
    const result = await env.DB.prepare(`
      UPDATE bookmarks 
      SET title = ?, url = ?, domain = ?, category_id = ?, icon_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(title, url, domain, category_id || null, icon_url || null, id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '书签更新成功'
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
      message: '更新书签失败',
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

// 删除书签
async function deleteBookmark(env, id) {
  try {
    const result = await env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '书签删除成功'
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
      message: '删除书签失败',
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

// 提取域名的辅助函数
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // 如果URL格式不正确，尝试简单的字符串处理
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  }
}
