/**
 * 用户管理 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { 
  hashPassword,
  validateSession,
  getSessionFromRequest
} from '../../utils/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const db = env.DB;
    if (!db) {
      throw new Error('数据库未配置');
    }

    // 验证会话（除了创建第一个用户）
    const sessionId = getSessionFromRequest(request);
    let currentUser = null;
    
    if (sessionId) {
      currentUser = await validateSession(db, sessionId);
    }

    // 检查是否有用户存在
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const hasUsers = userCount.count > 0;

    // 如果没有用户且是POST请求，允许创建第一个用户
    if (!hasUsers && method === 'POST') {
      return await createFirstUser(db, request);
    }

    // 其他操作需要登录
    if (!currentUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '需要登录',
        hasUsers: hasUsers
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    switch (method) {
      case 'GET':
        return await getUsers(db, currentUser);
      case 'POST':
        return await createUser(db, request, currentUser);
      case 'PUT':
        return await updateUser(db, request, currentUser);
      case 'DELETE':
        return await deleteUser(db, request, currentUser);
      default:
        return new Response(JSON.stringify({
          success: false,
          message: '不支持的请求方法'
        }), {
          status: 405,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('用户管理失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '用户管理失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 创建第一个用户
async function createFirstUser(db, request) {
  const body = await request.json();
  const { username, password, email } = body;

  if (!username || !password) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户名和密码不能为空'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 验证用户名格式
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户名只能包含字母、数字和下划线，长度3-20位'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 验证密码强度
  if (password.length < 6) {
    return new Response(JSON.stringify({
      success: false,
      message: '密码长度至少6位'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const passwordHash = await hashPassword(password);

  const result = await db.prepare(`
    INSERT INTO users (username, password_hash, email, role)
    VALUES (?, ?, ?, 'admin')
  `).bind(username, passwordHash, email || null).run();

  return new Response(JSON.stringify({
    success: true,
    message: '第一个管理员用户创建成功',
    user: {
      id: result.meta.last_row_id,
      username: username,
      email: email,
      role: 'admin'
    }
  }), {
    status: 201,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 获取用户列表
async function getUsers(db, currentUser) {
  const users = await db.prepare(`
    SELECT id, username, email, role, last_login, login_attempts, 
           locked_until, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  return new Response(JSON.stringify({
    success: true,
    users: users.results || users
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 创建用户
async function createUser(db, request, currentUser) {
  const body = await request.json();
  const { username, password, email, role } = body;

  if (!username || !password) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户名和密码不能为空'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 检查用户名是否已存在
  const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existingUser) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户名已存在'
    }), {
      status: 409,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const passwordHash = await hashPassword(password);

  const result = await db.prepare(`
    INSERT INTO users (username, password_hash, email, role)
    VALUES (?, ?, ?, ?)
  `).bind(username, passwordHash, email || null, role || 'admin').run();

  return new Response(JSON.stringify({
    success: true,
    message: '用户创建成功',
    user: {
      id: result.meta.last_row_id,
      username: username,
      email: email,
      role: role || 'admin'
    }
  }), {
    status: 201,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 更新用户
async function updateUser(db, request, currentUser) {
  const body = await request.json();
  const { id, username, password, email, role } = body;

  if (!id) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户ID不能为空'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const updates = [];
  const values = [];

  if (username) {
    updates.push('username = ?');
    values.push(username);
  }

  if (password) {
    const passwordHash = await hashPassword(password);
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }

  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }

  if (role) {
    updates.push('role = ?');
    values.push(role);
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({
      success: false,
      message: '没有要更新的字段'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  updates.push('updated_at = datetime("now")');
  values.push(id);

  await db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();

  return new Response(JSON.stringify({
    success: true,
    message: '用户更新成功'
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 删除用户
async function deleteUser(db, request, currentUser) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('id');

  if (!userId) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户ID不能为空'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 不能删除自己
  if (parseInt(userId) === currentUser.user_id) {
    return new Response(JSON.stringify({
      success: false,
      message: '不能删除自己的账户'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 删除用户的会话
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  
  // 删除用户
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  return new Response(JSON.stringify({
    success: true,
    message: '用户删除成功'
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
