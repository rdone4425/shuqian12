/**
 * 日志管理 API
 * 处理系统日志的查询、清空等操作
 */

import { corsHeaders } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 检查数据库绑定
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定，请检查 D1 数据库配置'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      return await handleGetLogs(env.DB, url);
    } else if (method === 'DELETE') {
      return await handleClearLogs(env.DB);
    } else if (method === 'POST') {
      return await handleAddLog(env.DB, request);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '不支持的请求方法'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('日志API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 获取日志列表
async function handleGetLogs(db, url) {
  try {
    const params = url.searchParams;
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const type = params.get('type') || '';
    const time = params.get('time') || '';
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = '';
    let queryParams = [];
    
    if (type) {
      whereClause += ' WHERE type = ?';
      queryParams.push(type);
    }
    
    if (time) {
      const timeCondition = getTimeCondition(time);
      if (timeCondition) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += timeCondition.clause;
        queryParams.push(...timeCondition.params);
      }
    }

    // 查询日志总数
    const countQuery = `SELECT COUNT(*) as total FROM sync_logs${whereClause}`;
    const countResult = await db.prepare(countQuery).bind(...queryParams).first();
    const total = countResult?.total || 0;

    // 查询日志列表
    const logsQuery = `
      SELECT id, type, level, message, details, created_at 
      FROM sync_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const logsResult = await db.prepare(logsQuery)
      .bind(...queryParams, limit, offset)
      .all();

    const logs = logsResult.results || [];

    // 处理日志数据
    const processedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    return new Response(JSON.stringify({
      success: true,
      logs: processedLogs,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取日志失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取日志失败: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 清空日志
async function handleClearLogs(db) {
  try {
    await db.prepare('DELETE FROM sync_logs').run();

    // 添加清空日志的记录
    await db.prepare(`
      INSERT INTO sync_logs (type, level, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind('system', 'info', '管理员清空了所有日志').run();

    return new Response(JSON.stringify({
      success: true,
      message: '日志清空成功'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('清空日志失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '清空日志失败: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 添加日志记录
async function handleAddLog(db, request) {
  try {
    const data = await request.json();
    const { type, level, message, details } = data;

    if (!type || !level || !message) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数: type, level, message'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(`
      INSERT INTO sync_logs (type, level, message, details, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      type,
      level,
      message,
      details ? JSON.stringify(details) : null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: '日志添加成功'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('添加日志失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '添加日志失败: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 获取时间条件
function getTimeCondition(timeFilter) {
  const now = new Date();
  
  switch (timeFilter) {
    case 'today':
      const today = now.toISOString().split('T')[0];
      return {
        clause: "date(created_at) = ?",
        params: [today]
      };
      
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        clause: "created_at >= ?",
        params: [weekAgo.toISOString()]
      };
      
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        clause: "created_at >= ?",
        params: [monthAgo.toISOString()]
      };
      
    default:
      return null;
  }
}
