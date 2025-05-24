/**
 * 数据库连接工厂
 * 支持 D1 和 Turso 数据库切换
 */

// 数据库类型常量
export const DATABASE_TYPES = {
  D1: 'd1',
  TURSO: 'turso'
};

// 简化的 Turso 客户端类
class TursoClient {
  constructor(url, authToken) {
    this.url = url;
    this.authToken = authToken;
  }

  async execute(sql, args = []) {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statements: [{
            q: sql,
            params: args
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && data.results[0]) {
        const result = data.results[0];
        return {
          rows: result.rows || [],
          rowsAffected: result.affected_row_count || 0,
          lastInsertRowid: result.last_insert_rowid || null
        };
      }

      return {
        rows: [],
        rowsAffected: 0,
        lastInsertRowid: null
      };
    } catch (error) {
      throw new Error(`Turso 查询失败: ${error.message}`);
    }
  }
}

// 获取数据库配置
async function getDatabaseConfig(env) {
  // 首先尝试从环境变量获取数据库类型设置
  let dbType = DATABASE_TYPES.D1; // 默认使用 D1

  // 如果有 D1 数据库，尝试从设置表获取配置
  if (env.DB) {
    try {
      const setting = await env.DB.prepare(`
        SELECT value FROM settings WHERE key = 'database_type'
      `).first();

      if (setting && setting.value) {
        dbType = setting.value;
      }
    } catch (error) {
      // 如果设置表不存在或查询失败，使用默认值
      console.log('无法获取数据库类型设置，使用默认 D1:', error.message);
    }
  }

  return {
    type: dbType,
    d1: {
      available: !!env.DB,
      instance: env.DB
    },
    turso: {
      available: false, // 暂时禁用 Turso，等待兼容性修复
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH_TOKEN,
      note: 'Turso 功能暂时不可用，正在修复兼容性问题'
    }
  };
}

// 创建数据库连接
export async function createDatabaseConnection(env, forceType = null) {
  const config = await getDatabaseConfig(env);
  const dbType = forceType || config.type;

  switch (dbType) {
    case DATABASE_TYPES.TURSO:
      if (!config.turso.available) {
        throw new Error('Turso 数据库配置不完整，缺少 TURSO_URL 或 TURSO_AUTH_TOKEN');
      }
      return createTursoConnection(config.turso);

    case DATABASE_TYPES.D1:
    default:
      if (!config.d1.available) {
        throw new Error('D1 数据库未绑定，请检查 DB 环境变量');
      }
      return createD1Connection(config.d1);
  }
}

// 创建 D1 连接
function createD1Connection(config) {
  return {
    type: DATABASE_TYPES.D1,
    instance: config.instance,
    prepare: (sql) => config.instance.prepare(sql),
    exec: (sql) => config.instance.exec(sql)
  };
}

// 创建 Turso 连接
async function createTursoConnection(config) {
  try {
    // 检查是否在 Cloudflare Workers 环境中
    if (typeof globalThis.fetch === 'undefined') {
      throw new Error('Turso 客户端需要在支持 fetch 的环境中运行');
    }

    // 使用 fetch API 直接与 Turso 数据库通信
    const tursoClient = new TursoClient(config.url, config.authToken);

    return {
      type: DATABASE_TYPES.TURSO,
      instance: tursoClient,
      prepare: (sql) => ({
        bind: (...params) => ({
          first: async () => {
            const result = await tursoClient.execute(sql, params);
            return result.rows[0] || null;
          },
          all: async () => {
            const result = await tursoClient.execute(sql, params);
            return { results: result.rows };
          },
          run: async () => {
            const result = await tursoClient.execute(sql, params);
            return {
              success: true,
              meta: {
                changes: result.rowsAffected || 0,
                last_row_id: result.lastInsertRowid || null
              }
            };
          }
        }),
        first: async () => {
          const result = await tursoClient.execute(sql);
          return result.rows[0] || null;
        },
        all: async () => {
          const result = await tursoClient.execute(sql);
          return { results: result.rows };
        },
        run: async () => {
          const result = await tursoClient.execute(sql);
          return {
            success: true,
            meta: {
              changes: result.rowsAffected || 0,
              last_row_id: result.lastInsertRowid || null
            }
          };
        }
      }),
      exec: async (sql) => {
        return await tursoClient.execute(sql);
      }
    };
  } catch (error) {
    throw new Error(`创建 Turso 连接失败: ${error.message}`);
  }
}

// 获取数据库状态信息
export async function getDatabaseStatus(env) {
  const config = await getDatabaseConfig(env);

  const status = {
    current_type: config.type,
    available_databases: {
      d1: {
        available: config.d1.available,
        connected: false,
        error: null
      },
      turso: {
        available: config.turso.available,
        connected: false,
        error: null
      }
    }
  };

  // 测试 D1 连接
  if (config.d1.available) {
    try {
      await config.d1.instance.prepare('SELECT 1').first();
      status.available_databases.d1.connected = true;
    } catch (error) {
      status.available_databases.d1.error = error.message;
    }
  }

  // 测试 Turso 连接
  if (config.turso.available) {
    try {
      const tursoClient = new TursoClient(config.turso.url, config.turso.authToken);
      await tursoClient.execute('SELECT 1');
      status.available_databases.turso.connected = true;
    } catch (error) {
      status.available_databases.turso.error = error.message;
    }
  }

  return status;
}

// 切换数据库类型
export async function switchDatabaseType(env, newType) {
  if (!Object.values(DATABASE_TYPES).includes(newType)) {
    throw new Error(`不支持的数据库类型: ${newType}`);
  }

  // 验证新数据库类型是否可用
  const config = await getDatabaseConfig(env);

  if (newType === DATABASE_TYPES.TURSO && !config.turso.available) {
    throw new Error('Turso 数据库配置不完整，无法切换');
  }

  if (newType === DATABASE_TYPES.D1 && !config.d1.available) {
    throw new Error('D1 数据库未绑定，无法切换');
  }

  // 测试新数据库连接
  const testDb = await createDatabaseConnection(env, newType);

  try {
    if (newType === DATABASE_TYPES.TURSO) {
      await testDb.instance.execute('SELECT 1');
    } else {
      await testDb.prepare('SELECT 1').first();
    }
  } catch (error) {
    throw new Error(`无法连接到 ${newType} 数据库: ${error.message}`);
  }

  // 更新设置（使用当前数据库）
  const currentDb = await createDatabaseConnection(env);
  await currentDb.prepare(`
    INSERT OR REPLACE INTO settings (key, value, description, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `).bind('database_type', newType, '当前使用的数据库类型').run();

  return {
    success: true,
    message: `已切换到 ${newType} 数据库`,
    new_type: newType
  };
}

// 数据迁移功能
export async function migrateData(env, fromType, toType, tables = []) {
  if (!Object.values(DATABASE_TYPES).includes(fromType) || !Object.values(DATABASE_TYPES).includes(toType)) {
    throw new Error('不支持的数据库类型');
  }

  if (fromType === toType) {
    throw new Error('源数据库和目标数据库不能相同');
  }

  const sourceDb = await createDatabaseConnection(env, fromType);
  const targetDb = await createDatabaseConnection(env, toType);

  const results = [];
  const defaultTables = ['bookmarks', 'categories', 'settings', 'users', 'sessions', 'sync_logs'];
  const tablesToMigrate = tables.length > 0 ? tables : defaultTables;

  for (const tableName of tablesToMigrate) {
    try {
      // 获取源表数据
      const sourceData = await sourceDb.prepare(`SELECT * FROM ${tableName}`).all();
      const rows = sourceData.results || sourceData;

      if (rows.length === 0) {
        results.push(`${tableName}: 无数据需要迁移`);
        continue;
      }

      // 获取表结构
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.join(', ');

      // 插入到目标数据库
      let successCount = 0;
      for (const row of rows) {
        try {
          const values = columns.map(col => row[col]);
          await targetDb.prepare(`
            INSERT OR REPLACE INTO ${tableName} (${columnNames})
            VALUES (${placeholders})
          `).bind(...values).run();
          successCount++;
        } catch (error) {
          console.error(`迁移 ${tableName} 表数据失败:`, error);
        }
      }

      results.push(`${tableName}: ${successCount}/${rows.length} 条记录迁移成功`);
    } catch (error) {
      results.push(`${tableName}: 迁移失败 - ${error.message}`);
    }
  }

  return {
    success: true,
    message: '数据迁移完成',
    results: results
  };
}

// 获取数据库表信息
export async function getDatabaseTables(env, dbType = null) {
  const config = await getDatabaseConfig(env);
  const targetType = dbType || config.type;

  try {
    const db = await createDatabaseConnection(env, targetType);
    const tables = [];

    if (targetType === DATABASE_TYPES.TURSO) {
      // Turso 数据库获取表信息
      const tablesResult = await db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const tableNames = (tablesResult.results || tablesResult).map(row => row.name);

      for (const tableName of tableNames) {
        try {
          // 获取表结构
          const schemaResult = await db.prepare(`PRAGMA table_info(${tableName})`).all();
          const schema = schemaResult.results || schemaResult;

          // 获取记录数
          const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first();
          const count = countResult?.count || 0;

          tables.push({
            name: tableName,
            count: count,
            columns: schema.map(col => ({
              name: col.name,
              type: col.type,
              nullable: !col.notnull,
              primary_key: col.pk === 1,
              default_value: col.dflt_value
            }))
          });
        } catch (error) {
          tables.push({
            name: tableName,
            count: 0,
            columns: [],
            error: error.message
          });
        }
      }
    } else {
      // D1 数据库获取表信息
      const tablesResult = await db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const tableNames = (tablesResult.results || tablesResult).map(row => row.name);

      for (const tableName of tableNames) {
        try {
          // 获取表结构
          const schemaResult = await db.prepare(`PRAGMA table_info(${tableName})`).all();
          const schema = schemaResult.results || schemaResult;

          // 获取记录数
          const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first();
          const count = countResult?.count || 0;

          tables.push({
            name: tableName,
            count: count,
            columns: schema.map(col => ({
              name: col.name,
              type: col.type,
              nullable: !col.notnull,
              primary_key: col.pk === 1,
              default_value: col.dflt_value
            }))
          });
        } catch (error) {
          tables.push({
            name: tableName,
            count: 0,
            columns: [],
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      database_type: targetType,
      tables: tables,
      total_tables: tables.length
    };
  } catch (error) {
    return {
      success: false,
      message: `获取数据库表信息失败: ${error.message}`,
      database_type: targetType,
      tables: [],
      total_tables: 0
    };
  }
}
