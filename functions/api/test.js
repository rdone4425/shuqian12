/**
 * 简单的测试API端点
 * 用于验证Cloudflare Pages Functions是否正常工作
 */

import { handleCORS, createSuccessResponse, createErrorResponse } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 处理CORS预检请求
  const corsResponse = handleCORS(request, ['GET', 'POST']);
  if (corsResponse) return corsResponse;

  // 允许所有HTTP方法
  const method = request.method;

  try {
    // 基本信息
    const response = {
      success: true,
      message: '✅ Cloudflare Pages Functions 工作正常',
      timestamp: new Date().toISOString(),
      method: method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      environment: {
        hasDB: !!env.DB,
        dbType: env.DB ? typeof env.DB : 'undefined'
      }
    };

    // 如果有D1数据库绑定，测试连接
    if (env.DB) {
      try {
        const testQuery = await env.DB.prepare('SELECT 1 as test').first();
        response.database = {
          bound: true,
          connected: true,
          testResult: testQuery
        };
      } catch (dbError) {
        response.database = {
          bound: true,
          connected: false,
          error: dbError.message
        };
      }
    } else {
      response.database = {
        bound: false,
        connected: false,
        message: 'D1数据库未绑定'
      };
    }

    return createSuccessResponse(response, '✅ Cloudflare Pages Functions 工作正常');

  } catch (error) {
    return createErrorResponse(
      'Functions执行失败',
      500,
      'function_error',
      {
        error: error.message,
        stack: error.stack
      }
    );
  }
}
