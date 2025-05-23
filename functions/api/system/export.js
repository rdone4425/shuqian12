/**
 * 数据导出 API
 * 导出书签数据为 JSON 格式
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 GET 请求'
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

    // 导出所有数据
    const exportData = {
      export_info: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'bookmark-manager'
      },
      bookmarks: [],
      categories: [],
      settings: []
    };

    try {
      // 导出书签
      const bookmarksResult = await db.prepare(`
        SELECT id, title, url, domain, path, category_id, subcategory, icon_url, description, created_at, updated_at
        FROM bookmarks
        ORDER BY created_at DESC
      `).all();
      exportData.bookmarks = bookmarksResult.results || [];
    } catch (error) {
      console.error('导出书签失败:', error);
    }

    try {
      // 导出分类
      const categoriesResult = await db.prepare(`
        SELECT id, name, description, parent_id, created_at, updated_at
        FROM categories
        ORDER BY name
      `).all();
      exportData.categories = categoriesResult.results || [];
    } catch (error) {
      console.error('导出分类失败:', error);
    }

    try {
      // 导出设置
      const settingsResult = await db.prepare(`
        SELECT key, value, description, created_at, updated_at
        FROM settings
        ORDER BY key
      `).all();
      exportData.settings = settingsResult.results || [];
    } catch (error) {
      console.error('导出设置失败:', error);
    }

    // 添加统计信息
    exportData.statistics = {
      total_bookmarks: exportData.bookmarks.length,
      total_categories: exportData.categories.length,
      total_settings: exportData.settings.length,
      unique_domains: [...new Set(exportData.bookmarks.map(b => b.domain))].length
    };

    // 记录导出日志
    try {
      await db.prepare(`
        INSERT INTO sync_logs (type, level, message, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        'system',
        'info',
        '数据导出完成',
        JSON.stringify({
          bookmarks_count: exportData.bookmarks.length,
          categories_count: exportData.categories.length,
          settings_count: exportData.settings.length
        })
      ).run();
    } catch (error) {
      console.error('记录导出日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '数据导出成功',
      data: exportData
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据导出失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '数据导出失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
