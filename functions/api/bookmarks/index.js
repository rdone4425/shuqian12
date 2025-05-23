/**
 * 书签管理 API - 主端点
 * 处理书签的增删改查操作
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 检查数据库绑定
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定，请检查 D1 数据库配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      return await handleGetBookmarks(env.DB, url);
    } else if (method === 'POST') {
      return await handleCreateBookmark(env.DB, request);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '不支持的请求方法'
      }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('书签API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取书签列表
async function handleGetBookmarks(db, url) {
  try {
    const params = url.searchParams;
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const domain = params.get('domain') || '';
    const category = params.get('category') || '';
    const search = params.get('search') || '';
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = '';
    let queryParams = [];
    
    if (domain) {
      whereClause += ' WHERE domain = ?';
      queryParams.push(domain);
    }
    
    if (category) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'category_id = ?';
      queryParams.push(category);
    }
    
    if (search) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += '(title LIKE ? OR url LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // 查询书签总数
    const countQuery = `SELECT COUNT(*) as total FROM bookmarks${whereClause}`;
    const countResult = await db.prepare(countQuery).bind(...queryParams).first();
    const total = countResult?.total || 0;

    // 查询书签列表
    const bookmarksQuery = `
      SELECT id, title, url, domain, path, category_id, subcategory, icon_url, description, created_at, updated_at 
      FROM bookmarks 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const bookmarksResult = await db.prepare(bookmarksQuery)
      .bind(...queryParams, limit, offset)
      .all();

    const bookmarks = bookmarksResult.results || [];

    return new Response(JSON.stringify({
      success: true,
      bookmarks: bookmarks,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取书签失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取书签失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 创建新书签
async function handleCreateBookmark(db, request) {
  try {
    const data = await request.json();
    const { title, url, domain, path, category_id, subcategory, icon_url, description } = data;

    if (!title || !url || !domain) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数: title, url, domain'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 检查是否已存在相同URL的书签
    const existingBookmark = await db.prepare('SELECT id FROM bookmarks WHERE url = ?').bind(url).first();
    if (existingBookmark) {
      return new Response(JSON.stringify({
        success: false,
        message: '该URL的书签已存在'
      }), {
        status: 409,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 插入新书签
    const result = await db.prepare(`
      INSERT INTO bookmarks (title, url, domain, path, category_id, subcategory, icon_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(title, url, domain, path, category_id, subcategory, icon_url, description).run();

    // 更新域名统计
    await db.prepare(`
      INSERT OR REPLACE INTO domains (domain, bookmark_count)
      VALUES (?, (SELECT COUNT(*) FROM bookmarks WHERE domain = ?))
    `).bind(domain, domain).run();

    return new Response(JSON.stringify({
      success: true,
      message: '书签创建成功',
      id: result.meta.last_row_id
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('创建书签失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '创建书签失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
