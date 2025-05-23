/**
 * 系统设置 API
 * 管理系统配置参数
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 检查数据库绑定
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定，请检查 D1 数据库配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      return await handleGetSettings(env.DB);
    } else if (method === 'POST') {
      return await handleUpdateSettings(env.DB, request);
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
    console.error('设置API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 获取设置
async function handleGetSettings(db) {
  try {
    const result = await db.prepare('SELECT key, value, description FROM settings').all();
    const settingsData = result.results || [];

    // 转换为对象格式
    const settings = {};
    settingsData.forEach(item => {
      settings[item.key] = {
        value: item.value,
        description: item.description
      };
    });

    return new Response(JSON.stringify({
      success: true,
      settings: settings,
      raw_settings: settingsData
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取设置失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取设置失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 更新设置
async function handleUpdateSettings(db, request) {
  try {
    const data = await request.json();

    // 支持批量更新或单个更新
    const updates = [];

    if (data.items_per_page !== undefined) {
      updates.push({
        key: 'items_per_page',
        value: String(data.items_per_page),
        description: '每页显示数量'
      });
    }

    if (data.auto_sync !== undefined) {
      updates.push({
        key: 'auto_sync',
        value: String(data.auto_sync),
        description: '自动同步'
      });
    }

    if (data.sync_interval !== undefined) {
      updates.push({
        key: 'sync_interval',
        value: String(data.sync_interval),
        description: '同步间隔（秒）'
      });
    }

    if (data.theme !== undefined) {
      updates.push({
        key: 'theme',
        value: String(data.theme),
        description: '主题设置'
      });
    }

    // 支持自定义设置
    if (data.custom_settings && Array.isArray(data.custom_settings)) {
      updates.push(...data.custom_settings);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '没有提供要更新的设置'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 执行更新
    for (const setting of updates) {
      await db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, description, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(setting.key, setting.value, setting.description).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: '设置更新成功',
      updated_count: updates.length,
      updated_settings: updates.map(s => s.key)
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('更新设置失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '更新设置失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
