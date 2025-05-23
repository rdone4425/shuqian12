/**
 * 插件数据库表管理 - 创建和管理Chrome插件相关的表
 */

export async function onRequest(context) {
  const { request, env } = context;

  try {
    const db = env.DB;

    // 检查是否绑定了D1数据库
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: '未绑定D1数据库',
        error_type: 'no_database_binding',
        plugin_tables: {
          required: ['plugin_bookmarks', 'plugin_sync_status', 'plugin_settings', 'plugin_logs'],
          existing: [],
          missing: ['plugin_bookmarks', 'plugin_sync_status', 'plugin_settings', 'plugin_logs'],
          status: {},
          structures: {}
        },
        instructions: [
          '请先在Cloudflare Pages项目中绑定D1数据库：',
          '1. 登录Cloudflare Dashboard',
          '2. 进入Pages项目设置',
          '3. 在"Functions"标签页中找到"Bindings"',
          '4. 添加D1数据库绑定，变量名设为"DB"',
          '5. 保存设置并重新部署项目'
        ],
        recommendations: ['请先绑定D1数据库后再创建插件表']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'GET') {
      // 检查插件相关表的状态
      return await checkPluginTables(db);
    } else if (request.method === 'POST') {
      // 创建插件相关表
      return await createPluginTables(db);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '只支持 GET 和 POST 请求'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('插件表管理失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: '插件表管理失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 检查插件表状态
async function checkPluginTables(db) {
  const pluginTables = [
    'plugin_bookmarks',
    'plugin_sync_status',
    'plugin_settings',
    'plugin_logs'
  ];

  const tableStatus = {};
  const tableStructures = {};

  for (const tableName of pluginTables) {
    try {
      // 检查表是否存在
      const tableInfo = await db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
      `).bind(tableName).first();

      if (tableInfo) {
        tableStatus[tableName] = true;

        // 获取表结构
        const columns = await db.prepare(`PRAGMA table_info(${tableName})`).all();
        tableStructures[tableName] = columns.results || columns;

        // 获取记录数
        const count = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first();
        tableStatus[`${tableName}_count`] = count.count;
      } else {
        tableStatus[tableName] = false;
      }
    } catch (error) {
      console.error(`检查插件表 ${tableName} 失败:`, error);
      tableStatus[tableName] = false;
    }
  }

  const existingTables = pluginTables.filter(table => tableStatus[table]);
  const missingTables = pluginTables.filter(table => !tableStatus[table]);

  return new Response(JSON.stringify({
    success: true,
    plugin_tables: {
      required: pluginTables,
      existing: existingTables,
      missing: missingTables,
      status: tableStatus,
      structures: tableStructures
    },
    recommendations: missingTables.length > 0 ?
      [`缺少插件表: ${missingTables.join(', ')}，请创建插件表`] :
      ['所有插件表都已存在']
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 创建插件表
async function createPluginTables(db) {
  const results = [];

  try {
    // 1. 创建插件书签表（用于存储从Chrome插件同步的书签）
    await db.exec(`
      CREATE TABLE IF NOT EXISTS plugin_bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chrome_id TEXT UNIQUE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        path TEXT,
        parent_id TEXT,
        folder_name TEXT,
        date_added INTEGER,
        date_modified INTEGER,
        icon_url TEXT,
        synced_to_main BOOLEAN DEFAULT FALSE,
        main_bookmark_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (main_bookmark_id) REFERENCES bookmarks(id)
      )
    `);
    results.push('✅ 插件书签表创建成功');

    // 2. 创建插件同步状态表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS plugin_sync_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_sync_time DATETIME,
        total_bookmarks INTEGER DEFAULT 0,
        synced_bookmarks INTEGER DEFAULT 0,
        failed_bookmarks INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        error_message TEXT,
        sync_duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✅ 插件同步状态表创建成功');

    // 3. 创建插件设置表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS plugin_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        plugin_version TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✅ 插件设置表创建成功');

    // 4. 创建插件日志表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS plugin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'info',
        bookmark_count INTEGER,
        error_message TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✅ 插件日志表创建成功');

    // 5. 创建插件相关索引
    const pluginIndexes = [
      {
        name: 'idx_plugin_bookmarks_chrome_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_bookmarks_chrome_id ON plugin_bookmarks(chrome_id)'
      },
      {
        name: 'idx_plugin_bookmarks_domain',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_bookmarks_domain ON plugin_bookmarks(domain)'
      },
      {
        name: 'idx_plugin_bookmarks_synced',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_bookmarks_synced ON plugin_bookmarks(synced_to_main)'
      },
      {
        name: 'idx_plugin_sync_status_time',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_sync_status_time ON plugin_sync_status(last_sync_time)'
      },
      {
        name: 'idx_plugin_logs_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_logs_created ON plugin_logs(created_at)'
      },
      {
        name: 'idx_plugin_logs_action',
        sql: 'CREATE INDEX IF NOT EXISTS idx_plugin_logs_action ON plugin_logs(action)'
      }
    ];

    for (const index of pluginIndexes) {
      try {
        await db.exec(index.sql);
        results.push(`✅ 插件索引 ${index.name} 创建成功`);
      } catch (error) {
        results.push(`❌ 插件索引 ${index.name} 创建失败: ${error.message}`);
      }
    }

    // 6. 插入默认插件设置
    const defaultPluginSettings = [
      { key: 'auto_sync_enabled', value: 'true', description: '自动同步开关' },
      { key: 'sync_interval', value: '300', description: '同步间隔（秒）' },
      { key: 'max_bookmarks_per_sync', value: '1000', description: '每次同步最大书签数' },
      { key: 'duplicate_handling', value: 'skip', description: '重复书签处理方式' },
      { key: 'folder_mapping', value: '{}', description: '文件夹映射配置' },
      { key: 'last_plugin_version', value: '1.0.0', description: '最后使用的插件版本' }
    ];

    for (const setting of defaultPluginSettings) {
      try {
        await db.prepare(`
          INSERT OR IGNORE INTO plugin_settings (key, value, description)
          VALUES (?, ?, ?)
        `).bind(setting.key, setting.value, setting.description).run();
      } catch (error) {
        // 忽略重复插入错误
      }
    }
    results.push('✅ 默认插件设置插入成功');

    // 7. 记录插件表创建日志
    await db.prepare(`
      INSERT INTO plugin_logs (action, details, status)
      VALUES (?, ?, ?)
    `).bind('plugin_tables_created', JSON.stringify(results), 'success').run();

    return new Response(JSON.stringify({
      success: true,
      message: '插件数据库表创建完成',
      results: results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('创建插件表失败:', error);

    // 记录错误日志
    try {
      await db.prepare(`
        INSERT INTO plugin_logs (action, details, status, error_message)
        VALUES (?, ?, ?, ?)
      `).bind('plugin_tables_creation_failed', JSON.stringify(results), 'error', error.message).run();
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      message: '创建插件表失败: ' + error.message,
      results: results,
      error: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
