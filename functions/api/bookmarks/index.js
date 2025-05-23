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
    // 读取并解析请求数据
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的JSON格式或请求体为空',
        error: error.message
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 检查数据格式并提取字段
    let title, url, domain, path, category_id, subcategory, icon_url, description;
    let bookmarkData = data;

    // 处理Chrome插件格式：{ action: "create", data: bookmarkData }
    if (data.action && data.data) {
      console.log('检测到Chrome插件格式:', data.action);

      if (data.action === 'fullSync' && Array.isArray(data.data)) {
        return await handleBatchCreateBookmarks(db, data.data);
      } else if (data.action === 'create' || data.action === 'update') {
        bookmarkData = data.data;
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: `不支持的操作: ${data.action}`,
          supported_actions: ['create', 'update', 'fullSync']
        }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // 处理批量导入（直接数组格式）
    if (Array.isArray(bookmarkData)) {
      return await handleBatchCreateBookmarks(db, bookmarkData);
    }

    if (bookmarkData.bookmarks && Array.isArray(bookmarkData.bookmarks)) {
      return await handleBatchCreateBookmarks(db, bookmarkData.bookmarks);
    }

    // 处理单个书签 - 提取字段
    title = bookmarkData.title;
    url = bookmarkData.url;
    domain = bookmarkData.domain || (url ? extractDomain(url) : null);
    path = bookmarkData.path || (url ? extractPath(url) : null);
    category_id = bookmarkData.category_id || bookmarkData.categoryId || null;
    subcategory = bookmarkData.subcategory || null;
    icon_url = bookmarkData.icon_url || bookmarkData.iconUrl || bookmarkData.favIconUrl || null;
    description = bookmarkData.description || null;

    // 验证必要字段
    if (!title || !url) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数: title 和 url',
        debug: {
          original_data: data,
          processed_bookmark_data: bookmarkData,
          extracted_fields: {
            title: title || null,
            url: url || null,
            domain: domain || null
          },
          validation: {
            hasTitle: !!title,
            hasUrl: !!url,
            hasAction: !!(data && data.action),
            hasData: !!(data && data.data)
          },
          data_keys: Object.keys(data || {}),
          bookmark_data_keys: Object.keys(bookmarkData || {})
        }
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

// 批量创建书签
async function handleBatchCreateBookmarks(db, bookmarks) {
  try {
    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const bookmark of bookmarks) {
      try {
        const title = bookmark.title;
        const url = bookmark.url;
        const domain = bookmark.domain || extractDomain(url);
        const path = bookmark.path || extractPath(url);
        const category_id = bookmark.category_id || bookmark.categoryId || null;
        const subcategory = bookmark.subcategory || null;
        const icon_url = bookmark.icon_url || bookmark.iconUrl || bookmark.favIconUrl || null;
        const description = bookmark.description || null;

        if (!title || !url) {
          results.push(`跳过无效书签: 缺少标题或URL`);
          skipCount++;
          continue;
        }

        // 检查是否已存在
        const existing = await db.prepare('SELECT id FROM bookmarks WHERE url = ?').bind(url).first();
        if (existing) {
          results.push(`跳过重复书签: ${title}`);
          skipCount++;
          continue;
        }

        // 插入书签
        await db.prepare(`
          INSERT INTO bookmarks (title, url, domain, path, category_id, subcategory, icon_url, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(title, url, domain, path, category_id, subcategory, icon_url, description).run();

        results.push(`成功添加: ${title}`);
        successCount++;

      } catch (error) {
        results.push(`添加失败: ${bookmark.title || 'Unknown'} - ${error.message}`);
        errorCount++;
      }
    }

    // 更新域名统计
    try {
      const domains = await db.prepare('SELECT DISTINCT domain FROM bookmarks').all();
      for (const domainRow of (domains.results || domains)) {
        const count = await db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE domain = ?').bind(domainRow.domain).first();
        await db.prepare(`
          INSERT OR REPLACE INTO domains (domain, bookmark_count)
          VALUES (?, ?)
        `).bind(domainRow.domain, count.count).run();
      }
    } catch (error) {
      console.error('更新域名统计失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `批量导入完成: 成功${successCount}个，跳过${skipCount}个，失败${errorCount}个`,
      summary: {
        total: bookmarks.length,
        success: successCount,
        skipped: skipCount,
        errors: errorCount
      },
      details: results
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('批量创建书签失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '批量创建书签失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 从URL提取域名
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // 如果URL无效，尝试简单的字符串处理
    const match = url.match(/^https?:\/\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
}

// 从URL提取路径
function extractPath(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    // 如果URL无效，返回空路径
    return '/';
  }
}
