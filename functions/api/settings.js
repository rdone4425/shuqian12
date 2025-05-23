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
    // 检查数据库连接
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定',
        error: '请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查表是否存在
    try {
      await env.DB.prepare('SELECT 1 FROM settings LIMIT 1').first();
    } catch (error) {
      if (error.message.includes('no such table')) {
        // 如果表不存在，返回默认设置
        return new Response(JSON.stringify({
          success: true,
          settings: {
            items_per_page: {
              value: '20',
              description: '每页显示的书签数量',
              type: 'number'
            },
            last_backup: {
              value: '',
              description: '最后备份时间',
              type: 'datetime'
            }
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      throw error; // 重新抛出其他错误
    }

    // 先检查表结构，看是否有description和type字段
    let hasExtendedFields = false;
    try {
      await env.DB.prepare('SELECT description, type FROM settings LIMIT 1').first();
      hasExtendedFields = true;
    } catch (error) {
      // 如果字段不存在，使用简化查询
      hasExtendedFields = false;
    }

    let settings;
    if (hasExtendedFields) {
      settings = await env.DB.prepare('SELECT key, value, description, type FROM settings ORDER BY key').all();
    } else {
      settings = await env.DB.prepare('SELECT key, value FROM settings ORDER BY key').all();
    }

    const settingsObj = {};
    (settings.results || []).forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        description: setting.description || getDefaultDescription(setting.key),
        type: setting.type || getDefaultType(setting.key)
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

// 获取默认描述
function getDefaultDescription(key) {
  const descriptions = {
    'items_per_page': '每页显示的书签数量',
    'last_backup': '最后备份时间',
    'theme': '默认主题',
    'version': '系统版本',
    'site_title': '网站标题'
  };
  return descriptions[key] || '';
}

// 获取默认类型
function getDefaultType(key) {
  const types = {
    'items_per_page': 'number',
    'last_backup': 'datetime',
    'theme': 'string',
    'version': 'string',
    'site_title': 'string'
  };
  return types[key] || 'string';
}