/**
 * 数据库表信息 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { getDatabaseTables } from '../../utils/database.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS
    });
  }

  if (method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 GET 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const dbType = url.searchParams.get('type'); // 可选参数，指定数据库类型

    const result = await getDatabaseTables(env, dbType);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取数据库表信息失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: '获取数据库表信息失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
