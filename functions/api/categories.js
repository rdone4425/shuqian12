/**
 * 分类管理API端点
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
    const categoryId = pathSegments[pathSegments.length - 1];

    switch (request.method) {
      case 'GET':
        if (categoryId && categoryId !== 'categories') {
          return getCategory(env, categoryId);
        } else {
          return getCategories(env);
        }
      case 'POST':
        return createCategory(env, request);
      case 'PUT':
        return updateCategory(env, request, categoryId);
      case 'DELETE':
        return deleteCategory(env, categoryId);
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

// 获取所有分类
async function getCategories(env) {
  try {
    // 检查数据库连接
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定',
        error: '请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查表是否存在
    try {
      await env.DB.prepare('SELECT 1 FROM categories LIMIT 1').first();
    } catch (error) {
      if (error.message.includes('no such table')) {
        // 如果表不存在，返回空分类列表
        return new Response(JSON.stringify({
          success: true,
          categories: []
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      throw error; // 重新抛出其他错误
    }

    const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY parent_id, name').all();

    return new Response(JSON.stringify({
      success: true,
      categories: categories.results || []
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
      message: '获取分类失败',
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

// 获取单个分类
async function getCategory(env, id) {
  try {
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();

    if (!category) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
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
      category: category
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
      message: '获取分类失败',
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

// 创建分类
async function createCategory(env, request) {
  try {
    const data = await request.json();
    const { name, parent_id, description } = data;

    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类名称是必填字段'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查分类名称是否已存在
    const existing = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND parent_id = ?')
      .bind(name, parent_id || null).first();

    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类名称已存在'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO categories (name, parent_id, description, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(name, parent_id || null, description || null).run();

    return new Response(JSON.stringify({
      success: true,
      message: '分类创建成功',
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
      message: '创建分类失败',
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

// 更新分类
async function updateCategory(env, request, id) {
  try {
    const data = await request.json();
    const { name, parent_id, description } = data;

    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类名称是必填字段'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查分类是否存在
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
    if (!category) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查分类名称是否已存在（排除当前分类）
    const existing = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND parent_id = ? AND id != ?')
      .bind(name, parent_id || null, id).first();

    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类名称已存在'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    await env.DB.prepare(`
      UPDATE categories
      SET name = ?, parent_id = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name, parent_id || null, description || null, id).run();

    return new Response(JSON.stringify({
      success: true,
      message: '分类更新成功'
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
      message: '更新分类失败',
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

// 删除分类
async function deleteCategory(env, id) {
  try {
    // 检查分类是否存在
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
    if (!category) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 处理子分类 - 将子分类的parent_id设置为NULL（变为顶级分类）
    await env.DB.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').bind(id).run();

    // 处理书签 - 将使用此分类的书签设置为未分类
    await env.DB.prepare('UPDATE bookmarks SET category_id = NULL WHERE category_id = ?').bind(id).run();

    // 删除分类
    const result = await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({
      success: true,
      message: '分类删除成功'
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
      message: '删除分类失败',
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
