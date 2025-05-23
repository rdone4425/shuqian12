/**
 * 系统设置API端点
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    switch (request.method) {
      case 'GET':
        return getSettings(env);
      case 'POST':
        return updateSettings(env, request);
      default:
        return new Response(JSON.stringify({
          success: false,
          message: '不支持的请求方法'
        }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

// 获取设置
async function getSettings(env) {
  try {
    const settings = await env.DB.prepare('SELECT key, value, description, type FROM settings ORDER BY key').all();

    const settingsObj = {};
    (settings.results || []).forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        description: setting.description || '',
        type: setting.type || 'string'
      };
    });

    return new Response(JSON.stringify({
      success: true,
      settings: settingsObj
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '获取设置失败',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

// 更新设置
async function updateSettings(env, request) {
  try {
    const data = await request.json();

    // 验证设置项
    const validSettings = ['items_per_page', 'last_backup'];
    const updates = [];

    for (const [key, value] of Object.entries(data)) {
      if (validSettings.includes(key)) {
        // 验证特定设置的值
        if (key === 'items_per_page') {
          const num = parseInt(value);
          if (isNaN(num) || num < 10 || num > 100) {
            return new Response(JSON.stringify({
              success: false,
              message: '每页显示数量必须在10-100之间'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
        }

        updates.push({ key, value: String(value) });
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '没有有效的设置项'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 更新设置
    for (const update of updates) {
      await env.DB.prepare(`
        UPDATE settings SET value = ?, updated_at = datetime('now')
        WHERE key = ?
      `).bind(update.value, update.key).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: '设置更新成功'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '更新设置失败',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
