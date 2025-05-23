/**
 * 安全设置管理 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { applyMiddleware } from '../../utils/middleware.js';

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

    // 应用认证中间件
    const middlewareResult = await applyMiddleware(db, request, {
      requireAuthentication: true,
      requireAdminRole: true
    });

    if (middlewareResult && !middlewareResult.authResult) {
      return middlewareResult; // 返回错误响应
    }

    switch (method) {
      case 'GET':
        return await getSecuritySettings(db);
      case 'PUT':
        return await updateSecuritySettings(db, request);
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
    console.error('安全设置管理失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '安全设置管理失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取安全设置
async function getSecuritySettings(db) {
  const securityKeys = [
    'admin_path',
    'require_login',
    'session_timeout',
    'max_login_attempts',
    'lockout_duration'
  ];

  const settings = {};
  
  for (const key of securityKeys) {
    const setting = await db.prepare(`
      SELECT value, description FROM settings WHERE key = ?
    `).bind(key).first();
    
    if (setting) {
      settings[key] = {
        value: setting.value,
        description: setting.description
      };
    }
  }

  // 获取用户统计
  const userStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as active_users,
      COUNT(CASE WHEN locked_until > datetime('now') THEN 1 END) as locked_users
    FROM users
  `).first();

  // 获取会话统计
  const sessionStats = await db.prepare(`
    SELECT 
      COUNT(*) as active_sessions,
      COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_sessions
    FROM sessions
  `).first();

  return new Response(JSON.stringify({
    success: true,
    settings: settings,
    stats: {
      users: userStats,
      sessions: sessionStats
    }
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 更新安全设置
async function updateSecuritySettings(db, request) {
  const body = await request.json();
  const { settings } = body;

  if (!settings || typeof settings !== 'object') {
    return new Response(JSON.stringify({
      success: false,
      message: '设置数据格式错误'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const allowedKeys = [
    'admin_path',
    'require_login',
    'session_timeout',
    'max_login_attempts',
    'lockout_duration'
  ];

  const updates = [];
  
  for (const [key, value] of Object.entries(settings)) {
    if (!allowedKeys.includes(key)) {
      continue;
    }

    // 验证设置值
    const validationResult = validateSetting(key, value);
    if (!validationResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        message: `设置 ${key} 验证失败: ${validationResult.message}`
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    try {
      await db.prepare(`
        UPDATE settings SET value = ? WHERE key = ?
      `).bind(String(value), key).run();
      
      updates.push(key);
    } catch (error) {
      console.error(`更新设置 ${key} 失败:`, error);
    }
  }

  // 如果更新了require_login设置，需要特殊处理
  if (settings.require_login === 'false') {
    // 如果禁用了登录要求，清理过期会话
    await db.prepare('DELETE FROM sessions WHERE expires_at <= datetime("now")').run();
  }

  return new Response(JSON.stringify({
    success: true,
    message: `成功更新 ${updates.length} 个设置`,
    updated: updates
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// 验证设置值
function validateSetting(key, value) {
  switch (key) {
    case 'admin_path':
      if (typeof value !== 'string') {
        return { valid: false, message: '管理路径必须是字符串' };
      }
      if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) {
        return { valid: false, message: '管理路径只能包含字母、数字、下划线和连字符' };
      }
      if (value && value.length > 50) {
        return { valid: false, message: '管理路径长度不能超过50个字符' };
      }
      break;

    case 'require_login':
      if (!['true', 'false'].includes(value)) {
        return { valid: false, message: '登录要求必须是true或false' };
      }
      break;

    case 'session_timeout':
      const timeout = parseInt(value);
      if (isNaN(timeout) || timeout < 300 || timeout > 604800) {
        return { valid: false, message: '会话超时时间必须在300秒到604800秒之间' };
      }
      break;

    case 'max_login_attempts':
      const attempts = parseInt(value);
      if (isNaN(attempts) || attempts < 3 || attempts > 20) {
        return { valid: false, message: '最大登录尝试次数必须在3到20之间' };
      }
      break;

    case 'lockout_duration':
      const duration = parseInt(value);
      if (isNaN(duration) || duration < 300 || duration > 86400) {
        return { valid: false, message: '锁定时间必须在300秒到86400秒之间' };
      }
      break;

    default:
      return { valid: false, message: '未知的设置项' };
  }

  return { valid: true };
}
