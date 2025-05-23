/**
 * 用户登录 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { 
  verifyPassword, 
  createSession, 
  isUserLocked, 
  incrementLoginAttempts, 
  resetLoginAttempts,
  createAuthHeaders
} from '../../utils/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持POST请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = env.DB;
    if (!db) {
      throw new Error('数据库未配置');
    }

    // 解析请求体
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({
        success: false,
        message: '用户名和密码不能为空'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 检查用户是否被锁定
    if (await isUserLocked(db, username)) {
      return new Response(JSON.stringify({
        success: false,
        message: '账户已被锁定，请稍后再试'
      }), {
        status: 423,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 查找用户
    const user = await db.prepare(`
      SELECT id, username, password_hash, role
      FROM users 
      WHERE username = ?
    `).bind(username).first();

    if (!user) {
      // 即使用户不存在也要增加尝试次数（防止用户名枚举）
      await incrementLoginAttempts(db, username);
      
      return new Response(JSON.stringify({
        success: false,
        message: '用户名或密码错误'
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      await incrementLoginAttempts(db, username);
      
      return new Response(JSON.stringify({
        success: false,
        message: '用户名或密码错误'
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 登录成功，重置尝试次数
    await resetLoginAttempts(db, username);

    // 创建会话
    const session = await createSession(db, user.id);

    // 创建响应头
    const authHeaders = createAuthHeaders(session.sessionId, session.expiresAt);
    
    // 合并CORS头和认证头
    const responseHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
    for (const [key, value] of authHeaders.entries()) {
      responseHeaders[key] = value;
    }

    return new Response(JSON.stringify({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('登录失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '登录失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
