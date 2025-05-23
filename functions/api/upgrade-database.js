/**
 * 数据库升级 API
 * 用于升级现有数据库结构到最新版本
 */

import { CORS_HEADERS } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 检查数据库绑定
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定，请检查 D1 数据库配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    const results = [];

    // 1. 检查并升级 sync_logs 表结构
    try {
      // 获取当前表结构
      const columns = await db.prepare('PRAGMA table_info(sync_logs)').all();
      const columnNames = (columns.results || columns).map(col => col.name);

      // 检查是否需要添加新字段
      const requiredColumns = ['type', 'level', 'message'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

      if (missingColumns.length > 0) {
        // 需要重建表
        results.push('🔄 升级 sync_logs 表结构...');

        // 备份现有数据
        const existingData = await db.prepare('SELECT * FROM sync_logs').all();
        const backupData = existingData.results || existingData;

        // 删除旧表
        await db.exec('DROP TABLE IF EXISTS sync_logs_backup');
        await db.exec('ALTER TABLE sync_logs RENAME TO sync_logs_backup');

        // 创建新表
        await db.exec(`
          CREATE TABLE sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'system',
            level TEXT NOT NULL DEFAULT 'info',
            message TEXT NOT NULL,
            details TEXT,
            action TEXT,
            status TEXT DEFAULT 'success',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 迁移数据
        for (const row of backupData) {
          await db.prepare(`
            INSERT INTO sync_logs (type, level, message, details, action, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            'system',
            row.status === 'success' ? 'success' : 'error',
            row.action || '数据迁移',
            row.details,
            row.action,
            row.status,
            row.created_at
          ).run();
        }

        // 删除备份表
        await db.exec('DROP TABLE sync_logs_backup');
        results.push('✅ sync_logs 表结构升级完成');
      } else {
        results.push('✅ sync_logs 表结构已是最新版本');
      }
    } catch (error) {
      results.push('❌ sync_logs 表升级失败: ' + error.message);
    }

    // 2. 创建缺失的索引
    const indexes = [
      {
        name: 'idx_sync_logs_type',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(type)'
      },
      {
        name: 'idx_sync_logs_level',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level)'
      },
      {
        name: 'idx_domains_domain',
        sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)'
      },
      {
        name: 'idx_settings_key',
        sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key)'
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

    // 3. 检查并创建缺失的表
    const requiredTables = ['bookmarks', 'categories', 'domains', 'settings', 'sync_logs'];

    for (const tableName of requiredTables) {
      try {
        const tableInfo = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name=?
        `).bind(tableName).first();

        if (!tableInfo) {
          // 创建缺失的表
          await createMissingTable(db, tableName);
          results.push(`✅ 表 ${tableName} 创建成功`);
        }
      } catch (error) {
        results.push(`❌ 检查表 ${tableName} 失败: ${error.message}`);
      }
    }

    // 4. 记录升级日志
    try {
      await db.prepare(`
        INSERT INTO sync_logs (type, level, message, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        'database',
        'success',
        '数据库升级完成',
        JSON.stringify(results)
      ).run();
    } catch (error) {
      console.error('记录升级日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '数据库升级完成',
      results: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据库升级失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '数据库升级失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 创建缺失的表
async function createMissingTable(db, tableName) {
  const tableDefinitions = {
    categories: `
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      )
    `,
    bookmarks: `
      CREATE TABLE bookmarks (
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
    `,
    domains: `
      CREATE TABLE domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        bookmark_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    settings: `
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    sync_logs: `
      CREATE TABLE sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'system',
        level TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        details TEXT,
        action TEXT,
        status TEXT DEFAULT 'success',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
  };

  if (tableDefinitions[tableName]) {
    await db.exec(tableDefinitions[tableName]);
  } else {
    throw new Error(`未知的表名: ${tableName}`);
  }
}
