/**
 * 用户个人资料管理 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { 
  hashPassword,
  verifyPassword,
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

    // 验证会话
    const sessionId = getSessionFromRequest(request);
    if (!sessionId) {
      return new Response(JSON.stringify({
        success: false,
        message: '需要登录'
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const currentUser = await validateSession(db, sessionId);
    if (!currentUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '会话已过期，请重新登录'
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    switch (method) {
      case 'GET':
        return await getUserProfile(db, currentUser);
      case 'PUT':
        return await updateUserProfile(db, request, currentUser);
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
    console.error('用户资料管理失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '用户资料管理失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取用户资料
async function getUserProfile(db, currentUser) {
  const user = await db.prepare(`
    SELECT id, username, email, role, last_login, created_at
    FROM users 
    WHERE id = ?
  `).bind(currentUser.user_id).first();

  if (!user) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户不存在'
    }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      last_login: user.last_login,
      created_at: user.created_at
    }
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 更新用户资料
async function updateUserProfile(db, request, currentUser) {
  const body = await request.json();
  const { username, email, currentPassword, newPassword } = body;

  // 获取当前用户信息
  const user = await db.prepare(`
    SELECT id, username, password_hash
    FROM users 
    WHERE id = ?
  `).bind(currentUser.user_id).first();

  if (!user) {
    return new Response(JSON.stringify({
      success: false,
      message: '用户不存在'
    }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const updates = [];
  const values = [];

  // 更新用户名
  if (username && username !== user.username) {
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

    // 检查用户名是否已存在
    const existingUser = await db.prepare(`
      SELECT id FROM users WHERE username = ? AND id != ?
    `).bind(username, user.id).first();

    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '用户名已存在'
      }), {
        status: 409,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    updates.push('username = ?');
    values.push(username);
  }

  // 更新邮箱
  if (email !== undefined) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        message: '邮箱格式不正确'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    updates.push('email = ?');
    values.push(email || null);
  }

  // 更新密码
  if (newPassword) {
    if (!currentPassword) {
      return new Response(JSON.stringify({
        success: false,
        message: '修改密码需要提供当前密码'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 验证当前密码
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        success: false,
        message: '当前密码不正确'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 验证新密码强度
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({
        success: false,
        message: '新密码长度至少6位'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const newPasswordHash = await hashPassword(newPassword);
    updates.push('password_hash = ?');
    values.push(newPasswordHash);
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

  // 添加更新时间
  updates.push('updated_at = datetime("now")');
  values.push(user.id);

  // 执行更新
  await db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();

  return new Response(JSON.stringify({
    success: true,
    message: '用户资料更新成功'
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
