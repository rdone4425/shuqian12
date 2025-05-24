/**
 * 单个分类的增删改查 API
 * 支持 GET, PUT, DELETE 方法
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const categoryId = params.id;
  
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

    // 验证分类ID
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的分类ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = parseInt(categoryId);

    if (request.method === 'GET') {
      return await getCategory(db, id);
    } else if (request.method === 'PUT') {
      return await updateCategory(db, id, request);
    } else if (request.method === 'DELETE') {
      return await deleteCategory(db, id);
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
    console.error('分类操作失败:', error);
    
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

// 获取单个分类
async function getCategory(db, id) {
  try {
    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();

    if (!category) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      category: category
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取分类失败:', error);
    throw error;
  }
}

// 更新分类
async function updateCategory(db, id, request) {
  try {
    const data = await request.json();
    
    // 验证必需字段
    if (!data.name) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类名称是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查分类是否存在
    const existingCategory = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first();
    if (!existingCategory) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查是否会造成循环引用
    if (data.parent_id) {
      const parentId = parseInt(data.parent_id);
      if (parentId === id) {
        return new Response(JSON.stringify({
          success: false,
          message: '分类不能设置自己为父分类'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 检查是否会造成循环引用（父分类的父分类不能是当前分类）
      if (await isCircularReference(db, id, parentId)) {
        return new Response(JSON.stringify({
          success: false,
          message: '不能设置该父分类，会造成循环引用'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 检查同级分类名称是否重复
    const duplicateCheck = await db.prepare(`
      SELECT id FROM categories 
      WHERE name = ? AND parent_id ${data.parent_id ? '= ?' : 'IS NULL'} AND id != ?
    `).bind(
      data.name.trim(),
      ...(data.parent_id ? [parseInt(data.parent_id)] : []),
      id
    ).first();

    if (duplicateCheck) {
      return new Response(JSON.stringify({
        success: false,
        message: '同级分类中已存在相同名称的分类'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新分类
    const result = await db.prepare(`
      UPDATE categories 
      SET name = ?, parent_id = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.name.trim(),
      data.parent_id ? parseInt(data.parent_id) : null,
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

    // 获取更新后的分类
    const updatedCategory = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      message: '分类更新成功',
      category: updatedCategory
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('更新分类失败:', error);
    throw error;
  }
}

// 删除分类
async function deleteCategory(db, id) {
  try {
    // 检查分类是否存在
    const existingCategory = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(id).first();
    if (!existingCategory) {
      return new Response(JSON.stringify({
        success: false,
        message: '分类不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 开始事务处理
    try {
      // 1. 将子分类的parent_id设置为NULL（变为顶级分类）
      await db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').bind(id).run();

      // 2. 将该分类下的书签设置为未分类
      await db.prepare('UPDATE bookmarks SET category_id = NULL WHERE category_id = ?').bind(id).run();

      // 3. 删除分类
      const result = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

      if (result.changes === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: '删除失败'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: '分类删除成功'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (transactionError) {
      console.error('删除分类事务失败:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('删除分类失败:', error);
    throw error;
  }
}

// 检查是否会造成循环引用
async function isCircularReference(db, categoryId, parentId) {
  try {
    let currentParentId = parentId;
    const visited = new Set();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        // 检测到循环
        return true;
      }
      
      if (currentParentId === categoryId) {
        // 找到了循环引用
        return true;
      }

      visited.add(currentParentId);

      // 获取当前父分类的父分类
      const parent = await db.prepare('SELECT parent_id FROM categories WHERE id = ?').bind(currentParentId).first();
      currentParentId = parent ? parent.parent_id : null;
    }

    return false;
  } catch (error) {
    console.error('检查循环引用失败:', error);
    return true; // 出错时保守处理，认为有循环引用
  }
}
