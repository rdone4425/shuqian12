/**
 * 书签管理 API - 主端点
 * 处理书签的增删改查操作
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { createCacheInstance, CACHE_STRATEGIES } from '../../utils/cache.js';

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

    // 创建缓存实例
    const cache = createCacheInstance(env.CACHE);

    if (method === 'GET') {
      return await handleGetBookmarks(env.DB, url, cache);
    } else if (method === 'POST') {
      return await handleCreateBookmark(env.DB, request, cache);
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
async function handleGetBookmarks(db, url, cache) {
  try {
    const params = url.searchParams;
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const domain = params.get('domain') || '';
    const category = params.get('category') || '';
    const search = params.get('search') || '';
    const offset = (page - 1) * limit;

    // 检查是否可以使用缓存
    const cacheParams = { page, limit, domain, category, search };
    const shouldCache = CACHE_STRATEGIES.BOOKMARKS_LIST.shouldCache(cacheParams);

    if (shouldCache && cache) {
      const cached = await cache.get('bookmarks_list', cacheParams);
      if (cached) {
        return new Response(JSON.stringify({
          success: true,
          ...cached,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

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

    const responseData = {
      success: true,
      bookmarks: bookmarks,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
      timestamp: new Date().toISOString()
    };

    // 如果符合缓存条件，设置缓存
    if (shouldCache && cache) {
      await cache.set('bookmarks_list', responseData, cacheParams);
    }

    return new Response(JSON.stringify(responseData), {
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
async function handleCreateBookmark(db, request, cache) {
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

    // 清除相关缓存
    if (cache) {
      await cache.invalidateRelated(['bookmarks', 'stats']);
    }

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

// 批量创建书签 - 优化版本
async function handleBatchCreateBookmarks(db, bookmarks) {
  try {
    console.log(`开始批量处理 ${bookmarks.length} 个书签`);
    console.log('书签数据示例:', bookmarks.slice(0, 2)); // 显示前2个书签的数据结构
    const startTime = Date.now();

    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 预处理书签数据
    const validBookmarks = [];
    const invalidBookmarks = [];

    for (const bookmark of bookmarks) {
      try {
        const title = bookmark.title;
        const url = bookmark.url;

        if (!title || !url) {
          invalidBookmarks.push(bookmark);
          continue;
        }

        // 验证URL格式
        let domain, path;
        try {
          domain = bookmark.domain || extractDomain(url);
          path = bookmark.path || extractPath(url);
        } catch (urlError) {
          console.error(`URL处理失败: ${url}`, urlError);
          invalidBookmarks.push(bookmark);
          continue;
        }

        validBookmarks.push({
          title: String(title).trim(),
          url: String(url).trim(),
          domain: domain,
          path: path,
          category_id: bookmark.category_id || bookmark.categoryId || null,
          subcategory: bookmark.subcategory || null,
          icon_url: bookmark.icon_url || bookmark.iconUrl || bookmark.favIconUrl || null,
          description: bookmark.description || null
        });
      } catch (bookmarkError) {
        console.error('处理单个书签失败:', bookmark, bookmarkError);
        invalidBookmarks.push(bookmark);
      }
    }

    console.log(`预处理完成: ${validBookmarks.length} 有效, ${invalidBookmarks.length} 无效`);

    // 跳过无效书签
    skipCount += invalidBookmarks.length;
    invalidBookmarks.forEach(bookmark => {
      results.push(`跳过无效书签: ${bookmark.title || 'Unknown'} - 缺少标题或URL`);
    });

    if (validBookmarks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: '没有有效的书签需要处理',
        summary: { total: bookmarks.length, success: 0, skipped: skipCount, errors: 0 },
        details: results
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 批量检查重复书签 - 分批处理避免SQL参数过多
    const existingUrls = new Set();
    const checkBatchSize = 50; // 限制每次查询的URL数量，保守一些

    for (let i = 0; i < validBookmarks.length; i += checkBatchSize) {
      const batch = validBookmarks.slice(i, i + checkBatchSize);
      const urls = batch.map(b => b.url);
      const placeholders = urls.map(() => '?').join(',');

      try {
        const existingBookmarks = await db.prepare(`
          SELECT url FROM bookmarks WHERE url IN (${placeholders})
        `).bind(...urls).all();

        (existingBookmarks.results || existingBookmarks).forEach(row => {
          existingUrls.add(row.url);
        });
      } catch (error) {
        console.error(`批量检查重复书签失败 (批次 ${Math.floor(i/checkBatchSize) + 1}):`, error);
        // 如果批量检查失败，逐个检查
        for (const bookmark of batch) {
          try {
            const existing = await db.prepare('SELECT url FROM bookmarks WHERE url = ?').bind(bookmark.url).first();
            if (existing) {
              existingUrls.add(bookmark.url);
            }
          } catch (singleError) {
            console.error(`单个URL检查失败: ${bookmark.url}`, singleError);
          }
        }
      }
    }

    console.log(`发现 ${existingUrls.size} 个重复书签`);

    // 分离新书签和重复书签
    const newBookmarks = [];
    const duplicateBookmarks = [];

    for (const bookmark of validBookmarks) {
      if (existingUrls.has(bookmark.url)) {
        duplicateBookmarks.push(bookmark);
      } else {
        newBookmarks.push(bookmark);
      }
    }

    // 跳过重复书签
    skipCount += duplicateBookmarks.length;
    duplicateBookmarks.forEach(bookmark => {
      results.push(`跳过重复书签: ${bookmark.title}`);
    });

    // 批量插入新书签
    if (newBookmarks.length > 0) {
      console.log(`开始批量插入 ${newBookmarks.length} 个新书签`);

      // 使用事务批量插入
      const insertStmt = db.prepare(`
        INSERT INTO bookmarks (title, url, domain, path, category_id, subcategory, icon_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 分批处理，避免单次事务过大
      const insertBatchSize = 25; // 更保守的批次大小
      for (let i = 0; i < newBookmarks.length; i += insertBatchSize) {
        const batch = newBookmarks.slice(i, i + insertBatchSize);

        try {
          // 批量执行插入
          for (const bookmark of batch) {
            await insertStmt.bind(
              bookmark.title,
              bookmark.url,
              bookmark.domain,
              bookmark.path,
              bookmark.category_id,
              bookmark.subcategory,
              bookmark.icon_url,
              bookmark.description
            ).run();

            successCount++;
            results.push(`成功添加: ${bookmark.title}`);
          }

          console.log(`批次 ${Math.floor(i/insertBatchSize) + 1} 完成: ${batch.length} 个书签`);
        } catch (error) {
          console.error(`批次 ${Math.floor(i/insertBatchSize) + 1} 失败:`, error);
          errorCount += batch.length;
          batch.forEach(bookmark => {
            results.push(`添加失败: ${bookmark.title} - ${error.message}`);
          });
        }
      }
    }

    // 批量更新域名统计（优化版）
    if (successCount > 0) {
      try {
        console.log('开始更新域名统计...');

        // 获取所有需要更新的域名
        const domainsToUpdate = [...new Set(newBookmarks.map(b => b.domain))];

        // 批量更新域名统计
        const domainStmt = db.prepare(`
          INSERT OR REPLACE INTO domains (domain, bookmark_count)
          VALUES (?, (SELECT COUNT(*) FROM bookmarks WHERE domain = ?))
        `);

        for (const domain of domainsToUpdate) {
          await domainStmt.bind(domain, domain).run();
        }

        console.log(`域名统计更新完成: ${domainsToUpdate.length} 个域名`);
      } catch (error) {
        console.error('更新域名统计失败:', error);
        // 不影响主要流程，只记录错误
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`批量处理完成: 耗时 ${processingTime}ms, 成功 ${successCount}, 跳过 ${skipCount}, 失败 ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `批量同步完成: 成功${successCount}个，跳过${skipCount}个，失败${errorCount}个`,
      summary: {
        total: bookmarks.length,
        success: successCount,
        skipped: skipCount,
        errors: errorCount,
        processing_time_ms: processingTime,
        new_bookmarks: newBookmarks.length,
        duplicates: duplicateBookmarks.length,
        invalid: invalidBookmarks.length
      },
      performance: {
        total_time: `${processingTime}ms`,
        avg_per_bookmark: `${Math.round(processingTime / bookmarks.length)}ms`,
        bookmarks_per_second: Math.round(bookmarks.length / (processingTime / 1000))
      },
      details: results.length > 100 ?
        [...results.slice(0, 50), `... 省略 ${results.length - 100} 条记录 ...`, ...results.slice(-50)] :
        results
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('批量创建书签失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '批量创建书签失败: ' + error.message,
      error_details: error.toString()
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
