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

// 检查访问路径
async function checkAccessPath(db, request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 获取设置的管理路径
  const adminPathSetting = await db.prepare(`
    SELECT value FROM settings WHERE key = 'admin_path'
  `).first();

  const adminPath = adminPathSetting?.value || '';

  // 如果没有设置管理路径，允许访问
  if (!adminPath) {
    return { allowed: true, adminPath: '' };
  }

  // 检查是否访问管理后台
  const isAdminAccess = pathname.includes('/admin') || pathname.includes('admin.html');

  if (!isAdminAccess) {
    return { allowed: true, adminPath };
  }

  // 检查路径是否匹配
  const expectedPath = `/${adminPath}/admin.html`;
  const currentPath = pathname;

  // 如果路径不匹配，拒绝访问
  if (!currentPath.includes(adminPath)) {
    return { allowed: false, adminPath, expectedPath };
  }

  return { allowed: true, adminPath };
}

// 路径保护中间件
async function pathProtection(db, request) {
  const pathCheck = await checkAccessPath(db, request);

  if (!pathCheck.allowed) {
    return new Response(JSON.stringify({
      success: false,
      message: '访问路径不正确',
      hint: `请使用正确的管理路径访问`
    }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  return null; // 允许访问
}

// 组合中间件
async function applyMiddleware(db, request, options = {}) {
  const {
    requireAuthentication = false,
    requireAdminRole = false,
    checkPath = false
  } = options;

  // 路径检查
  if (checkPath) {
    const pathResponse = await pathProtection(db, request);
    if (pathResponse) {
      return pathResponse;
    }
  }

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
  checkAccessPath,
  pathProtection,
  applyMiddleware
};
