/**
 * API 基础类 - 消除重复代码
 */

import { 
  handleCORS, 
  createSuccessResponse, 
  createErrorResponse,
  validateMethod,
  parseRequestBody,
  validateRequiredFields 
} from './cors.js';
import { getDatabaseConnection } from './database.js';

/**
 * 基础 API 处理器
 */
export class BaseAPIHandler {
  constructor(allowedMethods = ['GET', 'POST']) {
    this.allowedMethods = allowedMethods;
  }

  /**
   * 处理请求的主入口
   */
  async handle(context) {
    const { request, env } = context;

    try {
      // 1. 处理 CORS 预检
      const corsResponse = handleCORS(request, this.allowedMethods);
      if (corsResponse) return corsResponse;

      // 2. 验证请求方法
      const methodError = validateMethod(request, this.allowedMethods);
      if (methodError) return methodError;

      // 3. 检查数据库连接
      if (!env.DB) {
        return createErrorResponse('数据库未绑定，请检查 D1 数据库配置', 500);
      }

      // 4. 获取数据库连接
      const db = getDatabaseConnection(env);

      // 5. 解析请求数据
      const url = new URL(request.url);
      const method = request.method;
      let body = {};

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        body = await parseRequestBody(request);
      }

      // 6. 创建请求上下文
      const requestContext = {
        request,
        env,
        db: db.instance,
        url,
        method,
        body,
        params: url.searchParams
      };

      // 7. 调用具体的处理方法
      return await this.processRequest(requestContext);

    } catch (error) {
      console.error(`API 错误 [${request.url}]:`, error);
      return createErrorResponse('服务器内部错误: ' + error.message, 500);
    }
  }

  /**
   * 子类需要实现的方法
   */
  async processRequest(context) {
    throw new Error('子类必须实现 processRequest 方法');
  }

  /**
   * 验证必需字段的便捷方法
   */
  validateFields(data, requiredFields) {
    return validateRequiredFields(data, requiredFields);
  }

  /**
   * 创建成功响应的便捷方法
   */
  success(data, message = null) {
    return createSuccessResponse(data, message);
  }

  /**
   * 创建错误响应的便捷方法
   */
  error(message, status = 400, errorType = null, additionalData = {}) {
    return createErrorResponse(message, status, errorType, additionalData);
  }
}

/**
 * CRUD API 处理器基类
 */
export class CRUDAPIHandler extends BaseAPIHandler {
  constructor(tableName, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']) {
    super(allowedMethods);
    this.tableName = tableName;
  }

  async processRequest(context) {
    const { method, url } = context;
    const id = url.pathname.split('/').pop();

    switch (method) {
      case 'GET':
        return id && id !== this.tableName ? 
          await this.getById(context, id) : 
          await this.getList(context);
      
      case 'POST':
        return await this.create(context);
      
      case 'PUT':
        return await this.update(context, id);
      
      case 'DELETE':
        return await this.delete(context, id);
      
      default:
        return this.error('不支持的请求方法', 405);
    }
  }

  // 子类可以重写这些方法
  async getList(context) {
    const { db, params } = context;
    
    // 基础分页逻辑
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 20, 100);
    const offset = (page - 1) * limit;

    try {
      const items = await db.prepare(`
        SELECT * FROM ${this.tableName} 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      const total = await db.prepare(`
        SELECT COUNT(*) as count FROM ${this.tableName}
      `).first();

      return this.success({
        items: items.results || items,
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      });
    } catch (error) {
      return this.error('获取列表失败: ' + error.message, 500);
    }
  }

  async getById(context, id) {
    const { db } = context;
    
    try {
      const item = await db.prepare(`
        SELECT * FROM ${this.tableName} WHERE id = ?
      `).bind(id).first();

      if (!item) {
        return this.error('记录不存在', 404);
      }

      return this.success({ item });
    } catch (error) {
      return this.error('获取记录失败: ' + error.message, 500);
    }
  }

  async create(context) {
    return this.error('create 方法需要在子类中实现', 501);
  }

  async update(context, id) {
    return this.error('update 方法需要在子类中实现', 501);
  }

  async delete(context, id) {
    const { db } = context;
    
    try {
      const result = await db.prepare(`
        DELETE FROM ${this.tableName} WHERE id = ?
      `).bind(id).run();

      if (result.changes === 0) {
        return this.error('记录不存在', 404);
      }

      return this.success({ deleted: true }, '删除成功');
    } catch (error) {
      return this.error('删除失败: ' + error.message, 500);
    }
  }
}

/**
 * 创建 API 处理器的工厂函数
 */
export function createAPIHandler(handlerClass, ...args) {
  return async (context) => {
    const handler = new handlerClass(...args);
    return await handler.handle(context);
  };
}
