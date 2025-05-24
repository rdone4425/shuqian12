/**
 * 认证工具函数
 */

// 生成随机字符串
function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 简单的密码哈希（在生产环境中应该使用更安全的方法）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'bookmark_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 生成会话ID
function generateSessionId() {
  return generateRandomString(64);
}

// 创建会话
async function createSession(db, userId) {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24小时后过期

  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt.toISOString()).run();

  return {
    sessionId,
    expiresAt
  };
}

// 验证会话
async function validateSession(db, sessionId) {
  if (!sessionId) {
    return null;
  }

  const session = await db.prepare(`
    SELECT s.*, u.username, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sessionId).first();

  return session;
}

// 删除会话
async function deleteSession(db, sessionId) {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

// 清理过期会话
async function cleanupExpiredSessions(db) {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= datetime("now")').run();
}

// 检查用户是否被锁定
async function isUserLocked(db, username) {
  const user = await db.prepare(`
    SELECT locked_until FROM users WHERE username = ?
  `).bind(username).first();

  if (!user || !user.locked_until) {
    return false;
  }

  const lockedUntil = new Date(user.locked_until);
  const now = new Date();

  return lockedUntil > now;
}

// 增加登录尝试次数
async function incrementLoginAttempts(db, username) {
  const user = await db.prepare(`
    SELECT login_attempts FROM users WHERE username = ?
  `).bind(username).first();

  if (!user) {
    return;
  }

  const newAttempts = (user.login_attempts || 0) + 1;
  
  // 获取最大尝试次数设置
  const maxAttemptsSetting = await db.prepare(`
    SELECT value FROM settings WHERE key = 'max_login_attempts'
  `).first();
  const maxAttempts = parseInt(maxAttemptsSetting?.value || '5');

  let lockedUntil = null;
  if (newAttempts >= maxAttempts) {
    // 获取锁定时间设置
    const lockoutSetting = await db.prepare(`
      SELECT value FROM settings WHERE key = 'lockout_duration'
    `).first();
    const lockoutDuration = parseInt(lockoutSetting?.value || '1800'); // 默认30分钟
    
    lockedUntil = new Date();
    lockedUntil.setSeconds(lockedUntil.getSeconds() + lockoutDuration);
  }

  await db.prepare(`
    UPDATE users 
    SET login_attempts = ?, locked_until = ?
    WHERE username = ?
  `).bind(newAttempts, lockedUntil?.toISOString() || null, username).run();
}

// 重置登录尝试次数
async function resetLoginAttempts(db, username) {
  await db.prepare(`
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL, last_login = datetime('now')
    WHERE username = ?
  `).bind(username).run();
}

// 从请求中获取会话ID
function getSessionFromRequest(request) {
  // 从Cookie中获取
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.session_id) {
      return cookies.session_id;
    }
  }

  // 从Authorization头获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// 创建认证响应头
function createAuthHeaders(sessionId, expiresAt) {
  const headers = new Headers();
  
  // 设置Cookie
  const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Expires=${expiresAt.toUTCString()}`;
  headers.set('Set-Cookie', cookieValue);
  
  return headers;
}

// 创建登出响应头
function createLogoutHeaders() {
  const headers = new Headers();
  
  // 清除Cookie
  const cookieValue = `session_id=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  headers.set('Set-Cookie', cookieValue);
  
  return headers;
}

export {
  hashPassword,
  verifyPassword,
  generateSessionId,
  createSession,
  validateSession,
  deleteSession,
  cleanupExpiredSessions,
  isUserLocked,
  incrementLoginAttempts,
  resetLoginAttempts,
  getSessionFromRequest,
  createAuthHeaders,
  createLogoutHeaders
};
