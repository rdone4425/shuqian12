/**
 * 数据库连接工厂
 * 支持 D1 和 Turso 数据库切换
 */

import { createClient } from '@libsql/client/web';

// 数据库类型常量
export const DATABASE_TYPES = {
  D1: 'd1',
  TURSO: 'turso'
};

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
      available: !!(env.TURSO_URL && env.TURSO_AUTH_TOKEN),
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH_TOKEN
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
function createTursoConnection(config) {
  const client = createClient({
    url: config.url,
    authToken: config.authToken
  });

  return {
    type: DATABASE_TYPES.TURSO,
    instance: client,
    prepare: (sql) => ({
      bind: (...params) => ({
        first: async () => {
          const result = await client.execute({ sql, args: params });
          return result.rows[0] || null;
        },
        all: async () => {
          const result = await client.execute({ sql, args: params });
          return { results: result.rows };
        },
        run: async () => {
          const result = await client.execute({ sql, args: params });
          return {
            success: true,
            meta: {
              changes: result.rowsAffected,
              last_row_id: result.lastInsertRowid
            }
          };
        }
      }),
      first: async () => {
        const result = await client.execute(sql);
        return result.rows[0] || null;
      },
      all: async () => {
        const result = await client.execute(sql);
        return { results: result.rows };
      },
      run: async () => {
        const result = await client.execute(sql);
        return {
          success: true,
          meta: {
            changes: result.rowsAffected,
            last_row_id: result.lastInsertRowid
          }
        };
      }
    }),
    exec: async (sql) => {
      return await client.execute(sql);
    }
  };
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
      const client = createClient({
        url: config.turso.url,
        authToken: config.turso.authToken
      });
      await client.execute('SELECT 1');
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
