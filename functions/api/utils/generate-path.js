/**
 * 路径生成工具 API
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

  if (method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持GET请求'
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

    // 应用认证中间件
    const middlewareResult = await applyMiddleware(db, request, {
      requireAuthentication: true,
      requireAdminRole: true
    });

    if (middlewareResult && !middlewareResult.authResult) {
      return middlewareResult; // 返回错误响应
    }

    // 生成随机路径
    const randomPath = generateRandomPath();

    return new Response(JSON.stringify({
      success: true,
      path: randomPath,
      message: '随机路径生成成功'
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('路径生成失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '路径生成失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 生成随机路径（6个字符，包含字母和数字）
function generateRandomPath() {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const allChars = letters + numbers;
  
  let path = '';
  let hasLetter = false;
  let hasNumber = false;
  
  // 生成6个字符
  for (let i = 0; i < 6; i++) {
    const randomChar = allChars.charAt(Math.floor(Math.random() * allChars.length));
    path += randomChar;
    
    // 检查是否包含字母和数字
    if (letters.includes(randomChar)) {
      hasLetter = true;
    }
    if (numbers.includes(randomChar)) {
      hasNumber = true;
    }
  }
  
  // 如果没有字母或数字，重新生成
  if (!hasLetter || !hasNumber) {
    return generateRandomPath();
  }
  
  return path;
}

// 验证路径格式
function validatePath(path) {
  if (!path || typeof path !== 'string') {
    return { valid: false, message: '路径不能为空' };
  }
  
  if (path.length < 3 || path.length > 50) {
    return { valid: false, message: '路径长度必须在3-50个字符之间' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(path)) {
    return { valid: false, message: '路径只能包含字母、数字、下划线和连字符' };
  }
  
  return { valid: true };
}

// 检查路径是否安全（避免常见的系统路径）
function isPathSafe(path) {
  const reservedPaths = [
    'admin', 'api', 'assets', 'static', 'public', 'private',
    'system', 'config', 'settings', 'login', 'logout', 'auth',
    'user', 'users', 'profile', 'account', 'dashboard', 'panel',
    'manage', 'management', 'control', 'cp', 'backend', 'frontend',
    'www', 'web', 'site', 'home', 'index', 'main', 'root',
    'test', 'demo', 'example', 'sample', 'temp', 'tmp'
  ];
  
  return !reservedPaths.includes(path.toLowerCase());
}

export { generateRandomPath, validatePath, isPathSafe };
