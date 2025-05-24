/**
 * 数据导入 API
 * 从 JSON 文件导入书签数据
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
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

    const db = env.DB;
    const importData = await request.json();

    // 验证导入数据格式
    if (!importData || typeof importData !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的导入数据格式'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const results = [];
    let importedCounts = {
      bookmarks: 0,
      categories: 0,
      settings: 0
    };

    // 导入分类（先导入分类，因为书签可能依赖分类）
    if (importData.categories && Array.isArray(importData.categories)) {
      try {
        for (const category of importData.categories) {
          if (category.name) {
            await db.prepare(`
              INSERT OR IGNORE INTO categories (name, description, parent_id)
              VALUES (?, ?, ?)
            `).bind(
              category.name,
              category.description || null,
              category.parent_id || null
            ).run();
            importedCounts.categories++;
          }
        }
        results.push(`✅ 导入 ${importedCounts.categories} 个分类`);
      } catch (error) {
        results.push(`❌ 分类导入失败: ${error.message}`);
      }
    }

    // 导入书签
    if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
      try {
        for (const bookmark of importData.bookmarks) {
          if (bookmark.title && bookmark.url && bookmark.domain) {
            // 检查是否已存在相同URL的书签
            const existing = await db.prepare('SELECT id FROM bookmarks WHERE url = ?').bind(bookmark.url).first();
            if (!existing) {
              await db.prepare(`
                INSERT INTO bookmarks (title, url, domain, path, category_id, subcategory, icon_url, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                bookmark.title,
                bookmark.url,
                bookmark.domain,
                bookmark.path || null,
                bookmark.category_id || null,
                bookmark.subcategory || null,
                bookmark.icon_url || null,
                bookmark.description || null
              ).run();
              importedCounts.bookmarks++;
            }
          }
        }
        results.push(`✅ 导入 ${importedCounts.bookmarks} 个书签`);
      } catch (error) {
        results.push(`❌ 书签导入失败: ${error.message}`);
      }
    }

    // 导入设置
    if (importData.settings && Array.isArray(importData.settings)) {
      try {
        for (const setting of importData.settings) {
          if (setting.key) {
            await db.prepare(`
              INSERT OR REPLACE INTO settings (key, value, description)
              VALUES (?, ?, ?)
            `).bind(
              setting.key,
              setting.value || null,
              setting.description || null
            ).run();
            importedCounts.settings++;
          }
        }
        results.push(`✅ 导入 ${importedCounts.settings} 个设置`);
      } catch (error) {
        results.push(`❌ 设置导入失败: ${error.message}`);
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
      results.push('✅ 域名统计更新完成');
    } catch (error) {
      results.push(`❌ 域名统计更新失败: ${error.message}`);
    }

    // 记录导入日志
    try {
      await db.prepare(`
        INSERT INTO sync_logs (type, level, message, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        'system',
        'success',
        '数据导入完成',
        JSON.stringify({
          imported_counts: importedCounts,
          results: results
        })
      ).run();
    } catch (error) {
      console.error('记录导入日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '数据导入完成',
      imported_counts: importedCounts,
      results: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据导入失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '数据导入失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
