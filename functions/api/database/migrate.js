/**
 * 数据库迁移 API
 * 支持 D1 和 Turso 之间的数据迁移
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { createDatabaseConnection, DATABASE_TYPES } from '../../utils/database.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS
    });
  }

  if (method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    return await handleMigration(env, request);
  } catch (error) {
    console.error('数据迁移API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 处理数据迁移
async function handleMigration(env, request) {
  try {
    const data = await request.json();
    const { from_type, to_type, tables = [] } = data;

    if (!from_type || !to_type) {
      return new Response(JSON.stringify({
        success: false,
        message: '请指定源数据库和目标数据库类型'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    if (from_type === to_type) {
      return new Response(JSON.stringify({
        success: false,
        message: '源数据库和目标数据库不能相同'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 创建数据库连接
    const sourceDb = await createDatabaseConnection(env, from_type);
    const targetDb = await createDatabaseConnection(env, to_type);

    // 定义要迁移的表
    const tablesToMigrate = tables.length > 0 ? tables : [
      'bookmarks',
      'categories', 
      'settings',
      'users',
      'sessions',
      'sync_logs'
    ];

    const migrationResults = [];

    // 逐表迁移数据
    for (const tableName of tablesToMigrate) {
      try {
        const result = await migrateTable(sourceDb, targetDb, tableName);
        migrationResults.push(result);
      } catch (error) {
        migrationResults.push({
          table: tableName,
          success: false,
          error: error.message,
          migrated_rows: 0
        });
      }
    }

    const successCount = migrationResults.filter(r => r.success).length;
    const totalCount = migrationResults.length;

    return new Response(JSON.stringify({
      success: successCount === totalCount,
      message: `迁移完成: ${successCount}/${totalCount} 个表成功迁移`,
      from_type,
      to_type,
      results: migrationResults,
      summary: {
        total_tables: totalCount,
        successful_tables: successCount,
        failed_tables: totalCount - successCount,
        total_rows: migrationResults.reduce((sum, r) => sum + (r.migrated_rows || 0), 0)
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据迁移失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '数据迁移失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 迁移单个表的数据
async function migrateTable(sourceDb, targetDb, tableName) {
  try {
    // 检查源表是否存在
    const sourceTableExists = await checkTableExists(sourceDb, tableName);
    if (!sourceTableExists) {
      return {
        table: tableName,
        success: true,
        message: '源表不存在，跳过迁移',
        migrated_rows: 0
      };
    }

    // 获取源表数据
    const sourceData = await sourceDb.prepare(`SELECT * FROM ${tableName}`).all();
    const rows = sourceData.results || sourceData;

    if (!rows || rows.length === 0) {
      return {
        table: tableName,
        success: true,
        message: '表为空，无需迁移',
        migrated_rows: 0
      };
    }

    // 获取表结构
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.join(', ');

    // 清空目标表（如果存在）
    try {
      await targetDb.prepare(`DELETE FROM ${tableName}`).run();
    } catch (error) {
      // 表可能不存在，忽略错误
    }

    // 批量插入数据
    let migratedCount = 0;
    for (const row of rows) {
      try {
        const values = columns.map(col => row[col]);
        await targetDb.prepare(`
          INSERT OR REPLACE INTO ${tableName} (${columnNames})
          VALUES (${placeholders})
        `).bind(...values).run();
        migratedCount++;
      } catch (error) {
        console.error(`迁移 ${tableName} 表的行失败:`, error);
      }
    }

    return {
      table: tableName,
      success: true,
      message: `成功迁移 ${migratedCount} 行数据`,
      migrated_rows: migratedCount,
      total_rows: rows.length
    };

  } catch (error) {
    return {
      table: tableName,
      success: false,
      error: error.message,
      migrated_rows: 0
    };
  }
}

// 检查表是否存在
async function checkTableExists(db, tableName) {
  try {
    const result = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).bind(tableName).first();
    return !!result;
  } catch (error) {
    return false;
  }
}
