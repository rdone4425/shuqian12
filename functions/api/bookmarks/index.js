/**
 * Bookmarks API - Clean version
 * Using base classes to eliminate duplicate code
 */

import { BaseAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { queryAll, queryFirst, executeQuery, recordExists } from '../../utils/database.js';

/**
 * Bookmark API Handler
 */
class BookmarkAPIHandler extends BaseAPIHandler {
  constructor() {
    super(['GET', 'POST']);
  }

  async processRequest(context) {
    const { method } = context;

    if (method === 'GET') {
      return await this.getBookmarks(context);
    } else if (method === 'POST') {
      return await this.createBookmark(context);
    }
  }

  // Get bookmarks list
  async getBookmarks(context) {
    const { db, params } = context;

    try {
      const page = parseInt(params.get('page')) || 1;
      const limit = Math.min(parseInt(params.get('limit')) || 20, 100);
      const domain = params.get('domain') || '';
      const category = params.get('category') || '';
      const search = params.get('search') || '';
      const offset = (page - 1) * limit;

      // Build query conditions
      let whereClause = '';
      const queryParams = [];

      if (domain) {
        whereClause += ' AND domain = ?';
        queryParams.push(domain);
      }

      if (category) {
        whereClause += ' AND category_id = ?';
        queryParams.push(category);
      }

      if (search) {
        whereClause += ' AND (title LIKE ? OR url LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Query bookmarks
      const bookmarksQuery = `
        SELECT b.*, c.name as category_name
        FROM bookmarks b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE 1=1 ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const bookmarks = await queryAll(db, bookmarksQuery, [...queryParams, limit, offset]);

      // Query total count
      const countQuery = `SELECT COUNT(*) as count FROM bookmarks WHERE 1=1 ${whereClause}`;
      const totalResult = await queryFirst(db, countQuery, queryParams);
      const total = totalResult?.count || 0;

      return this.success({
        bookmarks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return this.error('Failed to get bookmarks: ' + error.message, 500);
    }
  }

  // Create bookmark
  async createBookmark(context) {
    const { db, body } = context;

    // Validate required fields
    const fieldError = this.validateFields(body, ['title', 'url']);
    if (fieldError) return fieldError;

    try {
      const { title, url, category_id, description } = body;

      // Parse URL
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname + urlObj.search;

      // Check for duplicates
      const exists = await recordExists(db, 'bookmarks', 'url', url);
      if (exists) {
        return this.error('Bookmark with this URL already exists', 409);
      }

      // Insert bookmark
      const result = await executeQuery(db, `
        INSERT INTO bookmarks (title, url, domain, path, category_id, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [title, url, domain, path, category_id || null, description || '']);

      // Update domain statistics
      await executeQuery(db, `
        INSERT OR REPLACE INTO domains (domain, bookmark_count)
        VALUES (?, (SELECT COUNT(*) FROM bookmarks WHERE domain = ?))
      `, [domain, domain]);

      return this.success({
        id: result.meta.last_row_id,
        message: 'Bookmark created successfully'
      });
    } catch (error) {
      return this.error('Failed to create bookmark: ' + error.message, 500);
    }
  }
}

// Export handler
export const onRequest = createAPIHandler(BookmarkAPIHandler);
