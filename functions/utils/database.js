/**
 * D1 数据库连接工具
 */

// 获取 D1 数据库连接
export function getDatabaseConnection(env) {
  if (!env.DB) {
    throw new Error('D1 数据库未绑定，请检查 DB 环境变量');
  }

  return {
    instance: env.DB,
    prepare: (sql) => env.DB.prepare(sql),
    exec: (sql) => env.DB.exec(sql)
  };
}

// 通用查询执行器
export async function executeQuery(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).run();
    }
    return await stmt.run();
  } catch (error) {
    console.error('数据库查询失败:', sql, params, error);
    throw error;
  }
}

// 通用查询单条记录
export async function queryFirst(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).first();
    }
    return await stmt.first();
  } catch (error) {
    console.error('数据库查询失败:', sql, params, error);
    throw error;
  }
}

// 通用查询多条记录
export async function queryAll(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      const result = await stmt.bind(...params).all();
      return result.results || result;
    }
    const result = await stmt.all();
    return result.results || result;
  } catch (error) {
    console.error('数据库查询失败:', sql, params, error);
    throw error;
  }
}

// 检查记录是否存在
export async function recordExists(db, table, field, value) {
  const result = await queryFirst(db, `SELECT 1 FROM ${table} WHERE ${field} = ?`, [value]);
  return !!result;
}

// 获取记录总数
export async function getRecordCount(db, table, whereClause = '', params = []) {
  const sql = `SELECT COUNT(*) as count FROM ${table}${whereClause ? ' WHERE ' + whereClause : ''}`;
  const result = await queryFirst(db, sql, params);
  return result?.count || 0;
}

// 获取数据库状态信息
export async function getDatabaseStatus(env) {
  const status = {
    connected: false,
    error: null
  };

  // 测试 D1 连接
  if (env.DB) {
    try {
      await env.DB.prepare('SELECT 1').first();
      status.connected = true;
    } catch (error) {
      status.error = error.message;
    }
  } else {
    status.error = 'D1 数据库未绑定';
  }

  return status;
}

// 获取数据库表信息
export async function getDatabaseTables(env) {
  try {
    const db = getDatabaseConnection(env);
    const tables = [];

    // 获取所有表名
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

    return {
      success: true,
      database_type: 'd1',
      tables: tables,
      total_tables: tables.length
    };
  } catch (error) {
    return {
      success: false,
      message: `获取数据库表信息失败: ${error.message}`,
      database_type: 'd1',
      tables: [],
      total_tables: 0
    };
  }
}
