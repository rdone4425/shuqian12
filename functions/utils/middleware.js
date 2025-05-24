/**
 * 认证中间件
 */

import { CORS_HEADERS } from './cors.js';
import { validateSession, getSessionFromRequest } from './auth.js';

// 检查数据库是否已初始化
async function isDatabaseInitialized(db) {
  try {
    // 检查是否有settings表
    const settingsTable = await db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='settings'
    `).first();

    if (!settingsTable) {
      return false;
    }

    // 检查是否有基本设置
    const basicSetting = await db.prepare(`
      SELECT value FROM settings WHERE key = 'require_login'
    `).first();

    return !!basicSetting;
  } catch (error) {
    return false;
  }
}

// 检查是否需要认证
async function requireAuth(db, request) {
  // 首先检查数据库是否已初始化
  const dbInitialized = await isDatabaseInitialized(db);

  if (!dbInitialized) {
    return {
      authenticated: true,
      user: null,
      requireLogin: false,
      needsInit: true
    };
  }

  // 检查是否启用了登录要求
  const requireLoginSetting = await db.prepare(`
    SELECT value FROM settings WHERE key = 'require_login'
  `).first();

  const requireLogin = requireLoginSetting?.value === 'true';

  if (!requireLogin) {
    return { authenticated: true, user: null, requireLogin: false };
  }

  // 获取会话ID
  const sessionId = getSessionFromRequest(request);

  if (!sessionId) {
    return { authenticated: false, user: null, requireLogin: true };
  }

  // 验证会话
  const user = await validateSession(db, sessionId);

  if (!user) {
    return { authenticated: false, user: null, requireLogin: true };
  }

  return { authenticated: true, user, requireLogin: true };
}

// 检查管理员权限
function requireAdmin(authResult) {
  if (!authResult.authenticated) {
    return false;
  }

  if (!authResult.user) {
    return true; // 如果不需要登录，允许访问
  }

  return authResult.user.role === 'admin';
}

// 创建认证错误响应
function createAuthErrorResponse(message = '需要登录', status = 401) {
  return new Response(JSON.stringify({
    success: false,
    message: message,
    requireAuth: true
  }), {
    status: status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}



// 组合中间件
async function applyMiddleware(db, request, options = {}) {
  const {
    requireAuthentication = false,
    requireAdminRole = false
  } = options;

  // 认证检查
  if (requireAuthentication || requireAdminRole) {
    const authResult = await requireAuth(db, request);

    if (!authResult.authenticated) {
      return createAuthErrorResponse();
    }

    if (requireAdminRole && !requireAdmin(authResult)) {
      return createAuthErrorResponse('需要管理员权限', 403);
    }

    // 返回认证结果供后续使用
    return { authResult };
  }

  return null; // 通过所有检查
}

export {
  isDatabaseInitialized,
  requireAuth,
  requireAdmin,
  createAuthErrorResponse,
  applyMiddleware
};
