/**
 * 单个书签的增删改查 API
 * 支持 GET, PUT, DELETE 方法
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const bookmarkId = params.id;
  
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未配置'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证书签ID
    if (!bookmarkId || isNaN(parseInt(bookmarkId))) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的书签ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = parseInt(bookmarkId);

    if (request.method === 'GET') {
      return await getBookmark(db, id);
    } else if (request.method === 'PUT') {
      return await updateBookmark(db, id, request);
    } else if (request.method === 'DELETE') {
      return await deleteBookmark(db, id);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '不支持的请求方法'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('书签操作失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '服务器错误: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取单个书签
async function getBookmark(db, id) {
  try {
    const bookmark = await db.prepare(`
      SELECT b.*, c.name as category_name 
      FROM bookmarks b 
      LEFT JOIN categories c ON b.category_id = c.id 
      WHERE b.id = ?
    `).bind(id).first();

    if (!bookmark) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      bookmark: bookmark
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取书签失败:', error);
    throw error;
  }
}

// 更新书签
async function updateBookmark(db, id, request) {
  try {
    const data = await request.json();
    
    // 验证必需字段
    if (!data.title || !data.url) {
      return new Response(JSON.stringify({
        success: false,
        message: '标题和网址是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证URL格式
    try {
      new URL(data.url);
    } catch (urlError) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的网址格式'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查书签是否存在
    const existingBookmark = await db.prepare('SELECT id FROM bookmarks WHERE id = ?').bind(id).first();
    if (!existingBookmark) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 提取域名和路径
    const urlObj = new URL(data.url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search + urlObj.hash;

    // 更新书签
    const result = await db.prepare(`
      UPDATE bookmarks 
      SET title = ?, url = ?, domain = ?, path = ?, category_id = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.title.trim(),
      data.url.trim(),
      domain,
      path,
      data.category_id || null,
      data.description?.trim() || null,
      id
    ).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '更新失败，没有记录被修改'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新域名统计
    try {
      await updateDomainStats(db, domain);
    } catch (domainError) {
      console.error('更新域名统计失败:', domainError);
      // 不影响主要操作
    }

    // 获取更新后的书签
    const updatedBookmark = await db.prepare(`
      SELECT b.*, c.name as category_name 
      FROM bookmarks b 
      LEFT JOIN categories c ON b.category_id = c.id 
      WHERE b.id = ?
    `).bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      message: '书签更新成功',
      bookmark: updatedBookmark
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('更新书签失败:', error);
    throw error;
  }
}

// 删除书签
async function deleteBookmark(db, id) {
  try {
    // 检查书签是否存在
    const existingBookmark = await db.prepare('SELECT domain FROM bookmarks WHERE id = ?').bind(id).first();
    if (!existingBookmark) {
      return new Response(JSON.stringify({
        success: false,
        message: '书签不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除书签
    const result = await db.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '删除失败'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新域名统计
    try {
      await updateDomainStats(db, existingBookmark.domain);
    } catch (domainError) {
      console.error('更新域名统计失败:', domainError);
      // 不影响主要操作
    }

    return new Response(JSON.stringify({
      success: true,
      message: '书签删除成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('删除书签失败:', error);
    throw error;
  }
}

// 更新域名统计
async function updateDomainStats(db, domain) {
  try {
    // 计算该域名的书签数量
    const count = await db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE domain = ?').bind(domain).first();
    
    if (count.count > 0) {
      // 更新或插入域名记录
      await db.prepare(`
        INSERT INTO domains (domain, bookmark_count, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(domain) DO UPDATE SET 
        bookmark_count = ?, updated_at = CURRENT_TIMESTAMP
      `).bind(domain, count.count, count.count).run();
    } else {
      // 如果没有书签了，删除域名记录
      await db.prepare('DELETE FROM domains WHERE domain = ?').bind(domain).run();
    }
  } catch (error) {
    console.error('更新域名统计失败:', error);
    throw error;
  }
}
