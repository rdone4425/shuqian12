/**
 * 系统统计 API
 * 获取书签、分类、域名等统计信息
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

    // 获取各种统计信息
    const stats = {};

    try {
      // 书签总数
      const bookmarksCount = await db.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
      stats.bookmarks_count = bookmarksCount?.count || 0;
      stats.total_bookmarks = stats.bookmarks_count; // 兼容性别名
    } catch (error) {
      stats.bookmarks_count = 0;
      stats.total_bookmarks = 0;
    }

    try {
      // 分类总数
      const categoriesCount = await db.prepare('SELECT COUNT(*) as count FROM categories').first();
      stats.categories_count = categoriesCount?.count || 0;
      stats.total_categories = stats.categories_count; // 兼容性别名
    } catch (error) {
      stats.categories_count = 0;
      stats.total_categories = 0;
    }

    try {
      // 域名总数
      const domainsCount = await db.prepare('SELECT COUNT(DISTINCT domain) as count FROM bookmarks').first();
      stats.domains_count = domainsCount?.count || 0;
      stats.total_domains = stats.domains_count; // 兼容性别名
    } catch (error) {
      stats.domains_count = 0;
      stats.total_domains = 0;
    }

    try {
      // 最近添加的书签数量（最近7天）
      const recentBookmarks = await db.prepare(`
        SELECT COUNT(*) as count 
        FROM bookmarks 
        WHERE created_at >= datetime('now', '-7 days')
      `).first();
      stats.recent_bookmarks = recentBookmarks?.count || 0;
    } catch (error) {
      stats.recent_bookmarks = 0;
    }

    try {
      // 热门域名（前10个）
      const topDomains = await db.prepare(`
        SELECT domain, COUNT(*) as count
        FROM bookmarks
        GROUP BY domain
        ORDER BY count DESC
        LIMIT 10
      `).all();
      stats.top_domains = (topDomains.results || topDomains).map(item => ({
        domain: item.domain,
        count: item.count
      }));
    } catch (error) {
      stats.top_domains = [];
    }

    try {
      // 分类使用情况
      const categoryUsage = await db.prepare(`
        SELECT 
          c.name,
          COUNT(b.id) as bookmark_count
        FROM categories c
        LEFT JOIN bookmarks b ON c.id = b.category_id
        GROUP BY c.id, c.name
        ORDER BY bookmark_count DESC
      `).all();
      stats.category_usage = (categoryUsage.results || categoryUsage).map(item => ({
        category: item.name,
        count: item.bookmark_count
      }));
    } catch (error) {
      stats.category_usage = [];
    }

    try {
      // 最新的书签
      const latestBookmarks = await db.prepare(`
        SELECT title, url, domain, created_at
        FROM bookmarks
        ORDER BY created_at DESC
        LIMIT 5
      `).all();
      stats.latest_bookmarks = (latestBookmarks.results || latestBookmarks).map(item => ({
        title: item.title,
        url: item.url,
        domain: item.domain,
        created_at: item.created_at
      }));
    } catch (error) {
      stats.latest_bookmarks = [];
    }

    try {
      // 数据库大小估算（通过记录数）
      const totalRecords = stats.bookmarks_count + stats.categories_count;
      stats.estimated_size = {
        records: totalRecords,
        size_mb: Math.round((totalRecords * 0.5) / 1024 * 100) / 100 // 粗略估算
      };
    } catch (error) {
      stats.estimated_size = { records: 0, size_mb: 0 };
    }

    return new Response(JSON.stringify({
      success: true,
      stats: stats,
      data: stats, // 兼容性别名
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取统计信息失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取统计信息失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
