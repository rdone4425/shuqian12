/**
 * 分类管理 API - 主端点
 * 处理分类的增删改查操作
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
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
      return await handleGetCategories(env.DB);
    } else if (method === 'POST') {
      return await handleCreateCategory(env.DB, request);
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
    console.error('分类API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取分类列表
async function handleGetCategories(db) {
  try {
    // 查询所有分类，包括书签数量统计
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
    
    const result = await db.prepare(categoriesQuery).all();
    const categories = result.results || [];

    return new Response(JSON.stringify({
      success: true,
      categories: categories
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取分类失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取分类失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 创建新分类
async function handleCreateCategory(db, request) {
  try {
    const data = await request.json();
    const { name, description, parent_id } = data;

    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数: name'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 检查是否已存在相同名称的分类
    const existingCategory = await db.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first();
    if (existingCategory) {
      return new Response(JSON.stringify({
        success: false,
        message: '该名称的分类已存在'
      }), {
        status: 409,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 如果指定了父分类，检查父分类是否存在
    if (parent_id) {
      const parentCategory = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(parent_id).first();
      if (!parentCategory) {
        return new Response(JSON.stringify({
          success: false,
          message: '指定的父分类不存在'
        }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // 插入新分类
    const result = await db.prepare(`
      INSERT INTO categories (name, description, parent_id)
      VALUES (?, ?, ?)
    `).bind(name, description, parent_id).run();

    return new Response(JSON.stringify({
      success: true,
      message: '分类创建成功',
      id: result.meta.last_row_id
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('创建分类失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '创建分类失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
