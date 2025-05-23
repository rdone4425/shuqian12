/**
 * 初始化数据库表结构
 */

export async function onRequest(context) {
  const { request, env } = context;

  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求',
      allowed_methods: ['POST'],
      current_method: request.method
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'POST, OPTIONS'
      }
    });
  }

  try {
    const db = env.DB;

    // 检查是否绑定了D1数据库
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: '未绑定D1数据库',
        error_type: 'no_database_binding',
        instructions: [
          '请先在Cloudflare Pages项目中绑定D1数据库：',
          '1. 登录Cloudflare Dashboard',
          '2. 进入Pages项目设置',
          '3. 在"Functions"标签页中找到"Bindings"',
          '4. 添加D1数据库绑定，变量名设为"DB"',
          '5. 保存设置并重新部署项目'
        ]
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 测试数据库连接
    try {
      await db.prepare('SELECT 1').first();
    } catch (connectionError) {
      return new Response(JSON.stringify({
        success: false,
        message: 'D1数据库连接失败',
        error_type: 'connection_failed',
        error_details: connectionError.message,
        instructions: [
          '数据库已绑定但无法连接，可能的原因：',
          '1. D1数据库实例不存在或已删除',
          '2. 网络连接问题',
          '3. 权限配置问题',
          '请检查Cloudflare Dashboard中的D1数据库状态'
        ]
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const results = [];

    // 1. 创建分类表
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id)
        )
      `);
      results.push('✅ 分类表创建成功');
    } catch (error) {
      results.push('❌ 分类表创建失败: ' + error.message);
    }

    // 2. 创建书签表
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          domain TEXT NOT NULL,
          path TEXT,
          category_id INTEGER,
          subcategory TEXT,
          icon_url TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);
      results.push('✅ 书签表创建成功');
    } catch (error) {
      results.push('❌ 书签表创建失败: ' + error.message);
    }

    // 3. 创建域名表（用于统计）
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          bookmark_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ 域名表创建成功');
    } catch (error) {
      results.push('❌ 域名表创建失败: ' + error.message);
    }

    // 4. 创建设置表
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ 设置表创建成功');
    } catch (error) {
      results.push('❌ 设置表创建失败: ' + error.message);
    }

    // 5. 创建同步日志表
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          status TEXT DEFAULT 'success',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ 同步日志表创建成功');
    } catch (error) {
      results.push('❌ 同步日志表创建失败: ' + error.message);
    }

    // 6. 创建索引
    const indexes = [
      {
        name: 'idx_bookmarks_domain',
        sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain)'
      },
      {
        name: 'idx_bookmarks_category',
        sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id)'
      },
      {
        name: 'idx_bookmarks_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at)'
      },
      {
        name: 'idx_categories_parent',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)'
      },
      {
        name: 'idx_sync_logs_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at)'
      },
      {
        name: 'idx_domains_domain',
        sql: 'CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)'
      }
    ];

    for (const index of indexes) {
      try {
        await db.exec(index.sql);
        results.push(`✅ 索引 ${index.name} 创建成功`);
      } catch (error) {
        results.push(`❌ 索引 ${index.name} 创建失败: ${error.message}`);
      }
    }

    // 7. 插入默认设置
    try {
      const defaultSettings = [
        { key: 'items_per_page', value: '20', description: '每页显示数量' },
        { key: 'auto_sync', value: 'true', description: '自动同步' },
        { key: 'sync_interval', value: '300', description: '同步间隔（秒）' },
        { key: 'theme', value: 'light', description: '主题设置' }
      ];

      for (const setting of defaultSettings) {
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO settings (key, value, description)
            VALUES (?, ?, ?)
          `).bind(setting.key, setting.value, setting.description).run();
        } catch (error) {
          // 忽略重复插入错误
        }
      }
      results.push('✅ 默认设置插入成功');
    } catch (error) {
      results.push('❌ 默认设置插入失败: ' + error.message);
    }

    // 8. 插入默认分类
    try {
      const defaultCategories = [
        { name: '工作', description: '工作相关的书签' },
        { name: '学习', description: '学习资源和教程' },
        { name: '娱乐', description: '娱乐和休闲网站' },
        { name: '工具', description: '实用工具和服务' },
        { name: '新闻', description: '新闻和资讯网站' }
      ];

      for (const category of defaultCategories) {
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO categories (name, description)
            VALUES (?, ?)
          `).bind(category.name, category.description).run();
        } catch (error) {
          // 忽略重复插入错误
        }
      }
      results.push('✅ 默认分类插入成功');
    } catch (error) {
      results.push('❌ 默认分类插入失败: ' + error.message);
    }

    // 9. 记录初始化日志
    try {
      await db.prepare(`
        INSERT INTO sync_logs (action, details, status)
        VALUES (?, ?, ?)
      `).bind('database_init', JSON.stringify(results), 'success').run();
    } catch (error) {
      console.error('记录初始化日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '数据库初始化完成',
      results: results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('数据库初始化失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: '数据库初始化失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
