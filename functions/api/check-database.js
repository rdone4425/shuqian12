/**
 * 检查数据库表结构和完整性
 */

export async function onRequest(context) {
  const { request, env } = context;

  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 GET 请求',
      allowed_methods: ['GET'],
      current_method: request.method
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'GET, OPTIONS'
      }
    });
  }

  try {
    const db = env.DB;

    // 首先检查是否绑定了D1数据库
    if (!db) {
      return new Response(JSON.stringify({
        success: true,
        database_health: {
          status: 'no_database',
          percentage: 0,
          message: '未绑定D1数据库'
        },
        d1_binding: {
          bound: false,
          message: '请在Cloudflare Pages项目设置中绑定D1数据库',
          instructions: [
            '1. 登录Cloudflare Dashboard',
            '2. 进入Pages项目设置',
            '3. 在"Functions"标签页中找到"Bindings"',
            '4. 添加D1数据库绑定，变量名设为"DB"',
            '5. 保存设置并重新部署'
          ]
        },
        tables: {
          required: [],
          existing: [],
          missing: [],
          checks: {},
          structures: {}
        },
        indexes: {
          checks: {},
          missing: []
        },
        integrity: {},
        recommendations: [
          '请先绑定D1数据库后再进行数据库初始化'
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 测试数据库连接
    let dbConnected = false;
    try {
      await db.prepare('SELECT 1').first();
      dbConnected = true;
    } catch (connectionError) {
      console.error('数据库连接测试失败:', connectionError);
      return new Response(JSON.stringify({
        success: true,
        database_health: {
          status: 'connection_failed',
          percentage: 10,
          message: 'D1数据库已绑定但连接失败'
        },
        d1_binding: {
          bound: true,
          connected: false,
          error: connectionError.message
        },
        tables: {
          required: [],
          existing: [],
          missing: [],
          checks: {},
          structures: {}
        },
        indexes: {
          checks: {},
          missing: []
        },
        integrity: {},
        recommendations: [
          '数据库连接失败，请检查D1数据库状态',
          '可能需要重新部署或检查数据库配置'
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查所有必需的表
    const requiredTables = [
      'bookmarks',
      'categories',
      'domains',
      'settings',
      'sync_logs'
    ];

    const tableChecks = {};
    const missingTables = [];
    const tableStructures = {};

    // 检查每个表是否存在
    for (const tableName of requiredTables) {
      try {
        // 检查表是否存在
        const tableInfo = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name=?
        `).bind(tableName).first();

        if (tableInfo) {
          tableChecks[tableName] = true;

          // 获取表结构
          const columns = await db.prepare(`PRAGMA table_info(${tableName})`).all();
          tableStructures[tableName] = columns.results || columns;

          // 获取表记录数
          const count = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first();
          tableChecks[`${tableName}_count`] = count.count;
        } else {
          tableChecks[tableName] = false;
          missingTables.push(tableName);
        }
      } catch (error) {
        console.error(`检查表 ${tableName} 失败:`, error);
        tableChecks[tableName] = false;
        missingTables.push(tableName);
      }
    }

    // 检查索引
    const indexChecks = {};
    const requiredIndexes = [
      { table: 'bookmarks', column: 'domain', name: 'idx_bookmarks_domain' },
      { table: 'bookmarks', column: 'category_id', name: 'idx_bookmarks_category' },
      { table: 'bookmarks', column: 'created_at', name: 'idx_bookmarks_created' },
      { table: 'categories', column: 'parent_id', name: 'idx_categories_parent' },
      { table: 'sync_logs', column: 'created_at', name: 'idx_sync_logs_created' },
      { table: 'sync_logs', column: 'type', name: 'idx_sync_logs_type' },
      { table: 'sync_logs', column: 'level', name: 'idx_sync_logs_level' },
      { table: 'domains', column: 'domain', name: 'idx_domains_domain' }
    ];

    for (const index of requiredIndexes) {
      try {
        const indexInfo = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index' AND name=?
        `).bind(index.name).first();

        indexChecks[index.name] = !!indexInfo;
      } catch (error) {
        console.error(`检查索引 ${index.name} 失败:`, error);
        indexChecks[index.name] = false;
      }
    }

    // 数据完整性检查
    const integrityChecks = {};

    if (tableChecks.bookmarks && tableChecks.categories) {
      try {
        // 检查是否有无效的分类引用
        const invalidCategories = await db.prepare(`
          SELECT COUNT(*) as count
          FROM bookmarks
          WHERE category_id IS NOT NULL
          AND category_id NOT IN (SELECT id FROM categories)
        `).first();

        integrityChecks.invalid_category_references = invalidCategories.count;
      } catch (error) {
        console.error('检查分类引用完整性失败:', error);
        integrityChecks.invalid_category_references = -1;
      }
    }

    // 计算总体健康状态
    const totalTables = requiredTables.length;
    const existingTables = Object.values(tableChecks).filter(exists => exists === true).length;
    const healthPercentage = Math.round((existingTables / totalTables) * 100);

    const result = {
      success: true,
      database_health: {
        status: healthPercentage === 100 ? 'healthy' : healthPercentage >= 80 ? 'warning' : 'critical',
        percentage: healthPercentage,
        message: healthPercentage === 100 ? '数据库结构完整' :
                healthPercentage >= 80 ? '数据库基本正常，但有部分问题' : '数据库存在严重问题'
      },
      d1_binding: {
        bound: true,
        connected: dbConnected,
        message: '✅ D1数据库已正确绑定并连接'
      },
      tables: {
        required: requiredTables,
        existing: Object.keys(tableChecks).filter(key => !key.includes('_count') && tableChecks[key]),
        missing: missingTables,
        checks: tableChecks,
        structures: tableStructures
      },
      indexes: {
        checks: indexChecks,
        missing: Object.keys(indexChecks).filter(key => !indexChecks[key])
      },
      integrity: integrityChecks,
      recommendations: []
    };

    // 添加建议
    if (missingTables.length > 0) {
      result.recommendations.push(`缺少表: ${missingTables.join(', ')}，请运行数据库初始化`);
    }

    const missingIndexes = Object.keys(indexChecks).filter(key => !indexChecks[key]);
    if (missingIndexes.length > 0) {
      result.recommendations.push(`缺少索引: ${missingIndexes.join(', ')}，可能影响查询性能`);
    }

    if (integrityChecks.invalid_category_references > 0) {
      result.recommendations.push(`发现 ${integrityChecks.invalid_category_references} 个无效的分类引用，建议清理数据`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('检查数据库失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: '检查数据库失败: ' + error.message,
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
