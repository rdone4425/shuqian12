/**
 * 系统统计 API - 重构版本
 * 使用基础类消除重复代码
 */

import { BaseAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { queryFirst, queryAll } from '../../utils/database.js';

/**
 * 系统统计 API 处理器
 */
class SystemStatsAPIHandler extends BaseAPIHandler {
  constructor() {
    super(['GET']);
  }

  async processRequest(context) {
    return await this.getSystemStats(context);
  }

  async getSystemStats(context) {
    const { db } = context;

    try {
      // 并行获取基础统计信息
      const [bookmarksCount, categoriesCount, domainsCount, usersCount] = await Promise.all([
        this.safeQuery(db, 'SELECT COUNT(*) as count FROM bookmarks'),
        this.safeQuery(db, 'SELECT COUNT(*) as count FROM categories'),
        this.safeQuery(db, 'SELECT COUNT(DISTINCT domain) as count FROM bookmarks'),
        this.safeQuery(db, 'SELECT COUNT(*) as count FROM users')
      ]);

      // 基础统计
      const stats = {
        bookmarks_count: bookmarksCount?.count || 0,
        categories_count: categoriesCount?.count || 0,
        domains_count: domainsCount?.count || 0,
        users_count: usersCount?.count || 0,
        // 兼容性别名
        total_bookmarks: bookmarksCount?.count || 0,
        total_categories: categoriesCount?.count || 0,
        total_domains: domainsCount?.count || 0
      };

      // 并行获取详细统计信息
      const [recentBookmarks, topDomains, categoryUsage, latestBookmarks] = await Promise.all([
        this.safeQuery(db, `
          SELECT COUNT(*) as count
          FROM bookmarks
          WHERE created_at >= datetime('now', '-7 days')
        `),
        this.safeQueryAll(db, `
          SELECT domain, COUNT(*) as count
          FROM bookmarks
          GROUP BY domain
          ORDER BY count DESC
          LIMIT 10
        `),
        this.safeQueryAll(db, `
          SELECT
            c.name,
            COUNT(b.id) as bookmark_count
          FROM categories c
          LEFT JOIN bookmarks b ON c.id = b.category_id
          GROUP BY c.id, c.name
          ORDER BY bookmark_count DESC
        `),
        this.safeQueryAll(db, `
          SELECT title, url, domain, created_at
          FROM bookmarks
          ORDER BY created_at DESC
          LIMIT 5
        `)
      ]);

      // 添加详细统计
      stats.recent_bookmarks = recentBookmarks?.count || 0;
      stats.top_domains = (topDomains || []).map(item => ({
        domain: item.domain,
        count: item.count
      }));
      stats.category_usage = (categoryUsage || []).map(item => ({
        category: item.name,
        count: item.bookmark_count
      }));
      stats.latest_bookmarks = (latestBookmarks || []).map(item => ({
        title: item.title,
        url: item.url,
        domain: item.domain,
        created_at: item.created_at
      }));

      // 数据库大小估算
      const totalRecords = stats.bookmarks_count + stats.categories_count;
      stats.estimated_size = {
        records: totalRecords,
        size_mb: Math.round((totalRecords * 0.5) / 1024 * 100) / 100
      };

      return this.success({
        stats,
        data: stats // 兼容性别名
      });

    } catch (error) {
      return this.error('获取统计信息失败: ' + error.message, 500);
    }
  }

  // 安全查询方法 - 单条记录
  async safeQuery(db, sql, params = []) {
    try {
      return await queryFirst(db, sql, params);
    } catch (error) {
      console.warn('查询失败:', sql, error.message);
      return null;
    }
  }

  // 安全查询方法 - 多条记录
  async safeQueryAll(db, sql, params = []) {
    try {
      return await queryAll(db, sql, params);
    } catch (error) {
      console.warn('查询失败:', sql, error.message);
      return [];
    }
  }
}

// 导出处理器
export const onRequest = createAPIHandler(SystemStatsAPIHandler);
