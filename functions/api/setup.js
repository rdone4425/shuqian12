/**
 * 数据库一键初始化API端点
 * 检查D1绑定状态并创建表结构
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
    if (request.method === 'GET') {
      return checkDatabaseStatus(env);
    } else if (request.method === 'POST') {
      return initializeDatabase(env);
    } else {
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

// 检查数据库绑定状态和表结构
async function checkDatabaseStatus(env) {
  try {
    // 检查是否绑定了D1数据库
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        status: 'no_binding',
        message: '未检测到D1数据库绑定',
        details: '请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查数据库连接
    try {
      await env.DB.prepare('SELECT 1 as test').first();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        status: 'connection_error',
        message: '数据库连接失败',
        error: error.message
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 检查表是否存在
    const tables = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bookmarks', 'categories', 'settings')
    `).all();

    const existingTables = (tables.results || []).map(t => t.name);
    const requiredTables = ['bookmarks', 'categories', 'settings'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      // 检查数据
      const [bookmarkCount, categoryCount, settingCount] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM categories').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM settings').first()
      ]);

      return new Response(JSON.stringify({
        success: true,
        status: 'ready',
        message: '数据库已完全初始化',
        details: {
          tables: existingTables,
          data: {
            bookmarks: bookmarkCount.count,
            categories: categoryCount.count,
            settings: settingCount.count
          }
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } else {
      return new Response(JSON.stringify({
        success: true,
        status: 'needs_setup',
        message: '数据库已连接，但需要初始化表结构',
        details: {
          existing_tables: existingTables,
          missing_tables: missingTables
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      status: 'error',
      message: '检查数据库状态失败',
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

// 初始化数据库表结构
async function initializeDatabase(env) {
  try {
    // 检查是否绑定了D1数据库
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '未检测到D1数据库绑定，无法初始化'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const results = [];

    // 创建分类表
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      results.push('✅ 分类表创建成功');
    } catch (error) {
      results.push(`❌ 分类表创建失败: ${error.message}`);
    }

    // 创建书签表
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          domain TEXT NOT NULL,
          path TEXT DEFAULT '',
          description TEXT DEFAULT '',
          icon_url TEXT DEFAULT '',
          category_id INTEGER DEFAULT NULL,
          subcategory_id INTEGER DEFAULT NULL,
          tags TEXT DEFAULT '',
          is_favorite INTEGER DEFAULT 0,
          visit_count INTEGER DEFAULT 0,
          last_visited TEXT DEFAULT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      results.push('✅ 书签表创建成功');
    } catch (error) {
      results.push(`❌ 书签表创建失败: ${error.message}`);
    }

    // 创建设置表
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      results.push('✅ 设置表创建成功');
    } catch (error) {
      results.push(`❌ 设置表创建失败: ${error.message}`);
    }

    // 创建索引
    const indexes = [
      { name: 'idx_bookmarks_domain', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain)' },
      { name: 'idx_bookmarks_category', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id)' },
      { name: 'idx_bookmarks_url', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)' },
      { name: 'idx_categories_parent', sql: 'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)' }
    ];

    for (const index of indexes) {
      try {
        await env.DB.prepare(index.sql).run();
        results.push(`✅ 索引 ${index.name} 创建成功`);
      } catch (error) {
        results.push(`❌ 索引 ${index.name} 创建失败: ${error.message}`);
      }
    }

    // 插入默认设置
    try {
      await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('items_per_page', '20')`).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('last_backup', '')`).run();
      results.push('✅ 默认设置插入成功');
    } catch (error) {
      results.push(`❌ 默认设置插入失败: ${error.message}`);
    }

    // 插入默认分类
    const categories = [
      { name: '未分类', parent_id: null },
      { name: '工作', parent_id: null },
      { name: '学习', parent_id: null },
      { name: '娱乐', parent_id: null },
      { name: '前端开发', parent_id: 2 },
      { name: '后端开发', parent_id: 2 },
      { name: '编程语言', parent_id: 3 },
      { name: '视频', parent_id: 4 },
      { name: '音乐', parent_id: 4 }
    ];

    let categorySuccess = 0;
    for (const category of categories) {
      try {
        if (category.parent_id) {
          await env.DB.prepare(`INSERT OR IGNORE INTO categories (name, parent_id) VALUES (?, ?)`).bind(category.name, category.parent_id).run();
        } else {
          await env.DB.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`).bind(category.name).run();
        }
        categorySuccess++;
      } catch (error) {
        // 忽略重复插入错误
      }
    }
    results.push(`✅ 默认分类插入成功 (${categorySuccess}/${categories.length})`);

    return new Response(JSON.stringify({
      success: true,
      message: '数据库初始化完成',
      details: results
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
      message: '数据库初始化失败',
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
