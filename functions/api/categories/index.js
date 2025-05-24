/**
 * 分类管理 API - 重构版本
 * 使用基础类消除重复代码
 */

import { CRUDAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { queryAll, queryFirst, executeQuery, recordExists } from '../../utils/database.js';

/**
 * 分类 API 处理器
 */
class CategoryAPIHandler extends CRUDAPIHandler {
  constructor() {
    super('categories', ['GET', 'POST', 'PUT', 'DELETE']);
  }

  // 重写获取列表方法，添加书签数量统计
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
      return this.error('获取分类列表失败: ' + error.message, 500);
    }
  }

  // 重写创建方法，添加业务验证
  async create(context) {
    const { db, body } = context;

    // 验证必需字段
    const fieldError = this.validateFields(body, ['name']);
    if (fieldError) return fieldError;

    try {
      const { name, description, parent_id } = body;

      // 检查名称重复
      const exists = await recordExists(db, 'categories', 'name', name);
      if (exists) {
        return this.error('该名称的分类已存在', 409);
      }

      // 验证父分类存在性
      if (parent_id) {
        const parentExists = await recordExists(db, 'categories', 'id', parent_id);
        if (!parentExists) {
          return this.error('指定的父分类不存在', 400);
        }
      }

      // 插入新分类
      const result = await executeQuery(db, `
        INSERT INTO categories (name, description, parent_id)
        VALUES (?, ?, ?)
      `, [name, description || null, parent_id || null]);

      return this.success({
        id: result.meta.last_row_id,
        message: '分类创建成功'
      });
    } catch (error) {
      return this.error('创建分类失败: ' + error.message, 500);
    }
  }

  // 重写更新方法
  async update(context, id) {
    const { db, body } = context;

    try {
      const { name, description, parent_id } = body;
      const updates = [];
      const params = [];

      if (name !== undefined) {
        // 检查名称重复（排除自己）
        const existing = await queryFirst(db,
          'SELECT id FROM categories WHERE name = ? AND id != ?',
          [name, id]
        );
        if (existing) {
          return this.error('该名称的分类已存在', 409);
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
            return this.error('指定的父分类不存在', 400);
          }
        }
        updates.push('parent_id = ?');
        params.push(parent_id || null);
      }

      if (updates.length === 0) {
        return this.error('没有提供要更新的字段', 400);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await executeQuery(db, `
        UPDATE categories SET ${updates.join(', ')} WHERE id = ?
      `, params);

      if (result.changes === 0) {
        return this.error('分类不存在', 404);
      }

      return this.success({ message: '分类更新成功' });
    } catch (error) {
      return this.error('更新分类失败: ' + error.message, 500);
    }
  }
}

// 导出处理器
export const onRequest = createAPIHandler(CategoryAPIHandler);
