/**
 * 数据库切换 API
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { getDatabaseStatus, switchDatabaseType, DATABASE_TYPES } from '../../utils/database.js';

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

  try {
    if (method === 'GET') {
      return await handleGetDatabaseStatus(env);
    } else if (method === 'POST') {
      return await handleSwitchDatabase(env, request);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '不支持的请求方法'
      }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('数据库切换API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取数据库状态
async function handleGetDatabaseStatus(env) {
  try {
    const status = await getDatabaseStatus(env);
    
    return new Response(JSON.stringify({
      success: true,
      status: status,
      available_types: [
        {
          type: DATABASE_TYPES.D1,
          name: 'Cloudflare D1',
          description: 'Cloudflare 原生 SQLite 数据库',
          available: status.available_databases.d1.available,
          connected: status.available_databases.d1.connected,
          error: status.available_databases.d1.error
        },
        {
          type: DATABASE_TYPES.TURSO,
          name: 'Turso',
          description: '边缘分布式 SQLite 数据库',
          available: status.available_databases.turso.available,
          connected: status.available_databases.turso.connected,
          error: status.available_databases.turso.error
        }
      ],
      current_type: status.current_type
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取数据库状态失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取数据库状态失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 切换数据库
async function handleSwitchDatabase(env, request) {
  try {
    const data = await request.json();
    const { database_type } = data;

    if (!database_type) {
      return new Response(JSON.stringify({
        success: false,
        message: '请指定要切换的数据库类型'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 执行切换
    const result = await switchDatabaseType(env, database_type);
    
    return new Response(JSON.stringify({
      success: true,
      message: result.message,
      new_type: result.new_type,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('切换数据库失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '切换数据库失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
