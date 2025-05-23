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
export function handleCORS(request, allowedMethods = ['GET', 'POST']) {
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
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    }
  });
}

// 创建错误响应
export function createErrorResponse(message, status = 500, errorType = null, additionalData = {}) {
  const errorData = {
    success: false,
    message,
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
    ...data
  };
  
  if (message) {
    responseData.message = message;
  }
  
  return createJSONResponse(responseData, 200);
}

// 验证HTTP方法
export function validateMethod(request, allowedMethods) {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse(
      `只支持 ${allowedMethods.join(', ')} 请求`,
      405,
      'method_not_allowed',
      {
        allowed_methods: allowedMethods,
        current_method: request.method
      }
    );
  }
  return null;
}
