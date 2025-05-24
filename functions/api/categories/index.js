/**
 * Categories API - Refactored version
 * Using base classes to eliminate duplicate code
 */

import { CRUDAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { queryAll, queryFirst, executeQuery, recordExists } from '../../utils/database.js';

/**
 * Category API Handler
 */
class CategoryAPIHandler extends CRUDAPIHandler {
  constructor() {
    super('categories', ['GET', 'POST', 'PUT', 'DELETE']);
  }

  // Override getList method to add bookmark count statistics
  async getList(context) {
    const { db } = context;

    try {
      const categoriesQuery = `
        SELECT
          c.id,
          c.name,
          c.description,
          c.parent_id,
          c.created_at,
          c.updated_at,
          COUNT(b.id) as bookmark_count
        FROM categories c
        LEFT JOIN bookmarks b ON c.id = b.category_id
        GROUP BY c.id, c.name, c.description, c.parent_id, c.created_at, c.updated_at
        ORDER BY c.name
      `;

      const categories = await queryAll(db, categoriesQuery);

      return this.success({ categories });
    } catch (error) {
      return this.error('Failed to get categories: ' + error.message, 500);
    }
  }

  // Override create method to add business validation
  async create(context) {
    const { db, body } = context;

    // Validate required fields
    const fieldError = this.validateFields(body, ['name']);
    if (fieldError) return fieldError;

    try {
      const { name, description, parent_id } = body;

      // Check for duplicate names
      const exists = await recordExists(db, 'categories', 'name', name);
      if (exists) {
        return this.error('Category with this name already exists', 409);
      }

      // Validate parent category exists
      if (parent_id) {
        const parentExists = await recordExists(db, 'categories', 'id', parent_id);
        if (!parentExists) {
          return this.error('Specified parent category does not exist', 400);
        }
      }

      // Insert new category
      const result = await executeQuery(db, `
        INSERT INTO categories (name, description, parent_id)
        VALUES (?, ?, ?)
      `, [name, description || null, parent_id || null]);

      return this.success({
        id: result.meta.last_row_id,
        message: 'Category created successfully'
      });
    } catch (error) {
      return this.error('Failed to create category: ' + error.message, 500);
    }
  }

  // Override update method
  async update(context, id) {
    const { db, body } = context;

    try {
      const { name, description, parent_id } = body;
      const updates = [];
      const params = [];

      if (name !== undefined) {
        // Check for duplicate names (excluding self)
        const existing = await queryFirst(db,
          'SELECT id FROM categories WHERE name = ? AND id != ?',
          [name, id]
        );
        if (existing) {
          return this.error('Category with this name already exists', 409);
        }
        updates.push('name = ?');
        params.push(name);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }

      if (parent_id !== undefined) {
        if (parent_id && parent_id !== id) {
          const parentExists = await recordExists(db, 'categories', 'id', parent_id);
          if (!parentExists) {
            return this.error('Specified parent category does not exist', 400);
          }
        }
        updates.push('parent_id = ?');
        params.push(parent_id || null);
      }

      if (updates.length === 0) {
        return this.error('No fields provided for update', 400);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await executeQuery(db, `
        UPDATE categories SET ${updates.join(', ')} WHERE id = ?
      `, params);

      if (result.changes === 0) {
        return this.error('Category not found', 404);
      }

      return this.success({ message: 'Category updated successfully' });
    } catch (error) {
      return this.error('Failed to update category: ' + error.message, 500);
    }
  }
}

// Export handler
export const onRequest = createAPIHandler(CategoryAPIHandler);
