/**
 * CORS处理工具函数
 */

// 标准CORS头
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// 处理CORS预检请求
export function handleCORS(request, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Access-Control-Allow-Methods': allowedMethods.concat(['OPTIONS']).join(', ')
      }
    });
  }
  return null;
}

// 创建带CORS头的JSON响应
export function createJSONResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...additionalHeaders
    }
  });
}

// 创建错误响应
export function createErrorResponse(message, status = 500, errorType = null, additionalData = {}) {
  const errorData = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  if (errorType) {
    errorData.error_type = errorType;
  }

  return createJSONResponse(errorData, status);
}

// 创建成功响应
export function createSuccessResponse(data, message = null) {
  const responseData = {
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  };

  if (message) {
    responseData.message = message;
  }

  return createJSONResponse(responseData, 200);
}

// 通用的 API 处理器包装器
export function createAPIHandler(handler) {
  return async (context) => {
    const { request, env } = context;

    // 处理 CORS 预检
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
      // 检查数据库连接
      if (!env.DB) {
        return createErrorResponse('数据库未绑定，请检查 D1 数据库配置', 500);
      }

      return await handler(context);
    } catch (error) {
      console.error('API 错误:', error);
      return createErrorResponse('服务器内部错误: ' + error.message, 500);
    }
  };
}

// 验证HTTP方法
export function validateMethod(request, allowedMethods) {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse('不支持的请求方法', 405);
  }
  return null;
}

// 解析请求体
export async function parseRequestBody(request) {
  try {
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await request.json();
    }
    return {};
  } catch (error) {
    throw new Error('请求体格式错误');
  }
}

// 验证必需字段
export function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    return createErrorResponse(`缺少必需字段: ${missing.join(', ')}`, 400);
  }
  return null;
}

// 分页参数解析
export function parsePaginationParams(url) {
  const params = url.searchParams;
  return {
    page: parseInt(params.get('page')) || 1,
    limit: Math.min(parseInt(params.get('limit')) || 20, 100), // 限制最大100
    offset: ((parseInt(params.get('page')) || 1) - 1) * (Math.min(parseInt(params.get('limit')) || 20, 100))
  };
}
