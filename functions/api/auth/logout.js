/**
 * 用户登出 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { 
  getSessionFromRequest, 
  deleteSession,
  createLogoutHeaders
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

    // 获取会话ID
    const sessionId = getSessionFromRequest(request);
    
    if (sessionId) {
      // 删除会话
      await deleteSession(db, sessionId);
    }

    // 创建登出响应头
    const logoutHeaders = createLogoutHeaders();
    
    // 合并CORS头和登出头
    const responseHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
    for (const [key, value] of logoutHeaders.entries()) {
      responseHeaders[key] = value;
    }

    return new Response(JSON.stringify({
      success: true,
      message: '登出成功'
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('登出失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '登出失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
