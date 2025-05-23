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
          // 检查是否是Chrome插件请求（通过User-Agent或特定参数）
          const userAgent = request.headers.get('user-agent') || '';
          const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Firefox');
          return getBookmarks(env, url.searchParams, isChrome);
        }
      case 'POST':
        // 检查是否是Chrome插件的同步请求
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const body = await request.clone().json();
          // 如果包含action字段，说明是Chrome插件的请求格式
          if (body.action) {
            return handleChromeExtensionSync(env, request);
          }
        }
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
async function getBookmarks(env, searchParams, isChrome = false) {
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

    // 根据请求来源返回不同格式
    if (isChrome) {
      // Chrome插件期望的格式
      return new Response(JSON.stringify({
        success: true,
        message: '书签获取成功',
        data: bookmarks.results || [],
        pagination: {
          total: total,
          limit: limit,
          offset: (page - 1) * limit,
          hasMore: page < Math.ceil(total / limit)
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } else {
      // 书签管理系统期望的格式
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
    }
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
    const { title, url, category_id, subcategory_id, description, icon_url, tags } = data;

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

    // 提取域名和路径
    const { domain, path } = extractUrlParts(url);

    const result = await env.DB.prepare(`
      INSERT INTO bookmarks (title, url, domain, path, description, category_id, subcategory_id, icon_url, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      url,
      domain,
      path,
      description || '',
      category_id || null,
      subcategory_id || null,
      icon_url || '',
      tags || ''
    ).run();

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
    const { title, url, category_id, subcategory_id, description, icon_url, tags } = data;

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

    // 提取域名和路径
    const { domain, path } = extractUrlParts(url);

    const result = await env.DB.prepare(`
      UPDATE bookmarks
      SET title = ?, url = ?, domain = ?, path = ?, description = ?, category_id = ?, subcategory_id = ?, icon_url = ?, tags = ?
      WHERE id = ?
    `).bind(
      title,
      url,
      domain,
      path,
      description || '',
      category_id || null,
      subcategory_id || null,
      icon_url || '',
      tags || '',
      id
    ).run();

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

// 提取域名和路径的辅助函数
function extractUrlParts(url) {
  try {
    const urlObj = new URL(url);
    return {
      domain: urlObj.hostname,
      path: urlObj.pathname + urlObj.search + urlObj.hash
    };
  } catch (error) {
    // 如果URL格式不正确，尝试简单的字符串处理
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)(.*)/);
    return {
      domain: match ? match[1] : url,
      path: match ? match[2] : ''
    };
  }
}

// 处理Chrome插件同步请求
async function handleChromeExtensionSync(env, request) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'fullSync':
        return await handleFullSync(data, env);
      case 'create':
        return await handleCreateBookmarkFromChrome(data, env);
      case 'update':
        return await handleUpdateBookmarkFromChrome(data, env);
      case 'remove':
        return await handleRemoveBookmarkFromChrome(data, env);
      case 'move':
        return await handleMoveBookmarkFromChrome(data, env);
      default:
        return new Response(JSON.stringify({
          success: false,
          message: '未知的操作类型'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Chrome插件同步失败',
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

// 处理完整同步
async function handleFullSync(bookmarks, env) {
  try {
    if (!Array.isArray(bookmarks)) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签数据格式错误'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 清空现有书签
    await env.DB.prepare('DELETE FROM bookmarks').run();

    let insertedCount = 0;
    let skippedCount = 0;

    // 批量插入新书签
    for (const bookmark of bookmarks) {
      try {
        const { domain, path } = extractUrlParts(bookmark.url);

        await env.DB.prepare(`
          INSERT INTO bookmarks (title, url, domain, path, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          bookmark.title || '未命名书签',
          bookmark.url,
          domain,
          path,
          new Date(bookmark.date_added || Date.now()).toISOString(),
          new Date(bookmark.last_modified || Date.now()).toISOString()
        ).run();

        insertedCount++;
      } catch (error) {
        console.error('插入书签失败:', error);
        skippedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `完整同步完成，插入 ${insertedCount} 个书签，跳过 ${skippedCount} 个`,
      data: {
        inserted: insertedCount,
        skipped: skippedCount,
        total: bookmarks.length
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
      message: '完整同步失败',
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

// 处理Chrome插件创建书签
async function handleCreateBookmarkFromChrome(bookmark, env) {
  try {
    const { domain, path } = extractUrlParts(bookmark.url);

    const result = await env.DB.prepare(`
      INSERT INTO bookmarks (title, url, domain, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      bookmark.title || '未命名书签',
      bookmark.url,
      domain,
      path,
      new Date(bookmark.date_added || Date.now()).toISOString(),
      new Date(bookmark.last_modified || Date.now()).toISOString()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: '书签创建成功',
      data: {
        id: result.meta.last_row_id,
        title: bookmark.title,
        url: bookmark.url
      }
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

// 处理Chrome插件更新书签
async function handleUpdateBookmarkFromChrome(bookmark, env) {
  try {
    const { domain, path } = extractUrlParts(bookmark.url);

    const result = await env.DB.prepare(`
      UPDATE bookmarks
      SET title = ?, url = ?, domain = ?, path = ?, updated_at = ?
      WHERE url = ?
    `).bind(
      bookmark.title || '未命名书签',
      bookmark.url,
      domain,
      path,
      new Date(bookmark.last_modified || Date.now()).toISOString(),
      bookmark.url
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: '书签更新成功',
      data: {
        changes: result.changes,
        title: bookmark.title,
        url: bookmark.url
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

// 处理Chrome插件删除书签
async function handleRemoveBookmarkFromChrome(bookmark, env) {
  try {
    const result = await env.DB.prepare(`
      DELETE FROM bookmarks WHERE url = ?
    `).bind(bookmark.url).run();

    return new Response(JSON.stringify({
      success: true,
      message: '书签删除成功',
      data: {
        changes: result.changes,
        url: bookmark.url
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

// 处理Chrome插件移动书签
async function handleMoveBookmarkFromChrome(bookmark, env) {
  // 移动操作在当前数据库结构中等同于更新
  return handleUpdateBookmarkFromChrome(bookmark, env);
}

// 兼容旧的函数名
function extractDomain(url) {
  return extractUrlParts(url).domain;
}
