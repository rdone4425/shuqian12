/**
 * 数据库初始化 API - 重构版本
 * 使用基础类和模块化设计
 */

import { BaseAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { executeQuery, queryFirst } from '../../utils/database.js';

/**
 * 数据库初始化处理器
 */
class DatabaseInitHandler extends BaseAPIHandler {
  constructor() {
    super(['POST']);
  }

  async processRequest(context) {
    return await this.initializeDatabase(context);
  }

  async initializeDatabase(context) {
    const { db } = context;
    const results = [];

    try {
      // 1. 创建所有表
      await this.createTables(db, results);
      
      // 2. 创建索引
      await this.createIndexes(db, results);
      
      // 3. 插入默认数据
      await this.insertDefaultData(db, results);
      
      // 4. 记录初始化日志
      await this.logInitialization(db, results);

      return this.success({
        message: '数据库初始化完成',
        results
      });
    } catch (error) {
      return this.error('数据库初始化失败: ' + error.message, 500);
    }
  }

  // 创建所有表
  async createTables(db, results) {
    const tables = this.getTableDefinitions();
    
    for (const [tableName, sql] of Object.entries(tables)) {
      try {
        await executeQuery(db, sql);
        results.push(`✅ ${tableName}表创建成功`);
      } catch (error) {
        results.push(`❌ ${tableName}表创建失败: ${error.message}`);
      }
    }
  }

  // 获取表定义
  getTableDefinitions() {
    return {
      '分类': `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      '书签': `
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      '域名': `
        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL,
          bookmark_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      '设置': `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          value TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      '用户': `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT,
          role TEXT DEFAULT 'admin',
          last_login DATETIME,
          login_attempts INTEGER DEFAULT 0,
          locked_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      '会话': `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `,
      '同步日志': `
        CREATE TABLE IF NOT EXISTS sync_logs (
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
  }

  // 创建索引
  async createIndexes(db, results) {
    const indexes = [
      { name: 'idx_bookmarks_domain', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain)' },
      { name: 'idx_bookmarks_category', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id)' },
      { name: 'idx_bookmarks_created', sql: 'CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at)' },
      { name: 'idx_categories_parent', sql: 'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)' },
      { name: 'idx_sync_logs_created', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at)' },
      { name: 'idx_sync_logs_type', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(type)' },
      { name: 'idx_sync_logs_level', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level)' },
      { name: 'idx_domains_domain', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)' },
      { name: 'idx_settings_key', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key)' },
      { name: 'idx_users_username', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)' },
      { name: 'idx_sessions_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)' },
      { name: 'idx_sessions_expires', sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)' }
    ];

    for (const index of indexes) {
      try {
        await executeQuery(db, index.sql);
        results.push(`✅ 索引 ${index.name} 创建成功`);
      } catch (error) {
        results.push(`❌ 索引 ${index.name} 创建失败: ${error.message}`);
      }
    }
  }

  // 插入默认数据
  async insertDefaultData(db, results) {
    // 插入默认设置
    await this.insertDefaultSettings(db, results);
    
    // 创建默认管理员账户
    await this.createDefaultAdmin(db, results);
    
    // 插入默认分类
    await this.insertDefaultCategories(db, results);
  }

  // 插入默认设置
  async insertDefaultSettings(db, results) {
    const defaultSettings = [
      { key: 'items_per_page', value: '20', description: '每页显示数量' },
      { key: 'auto_sync', value: 'true', description: '自动同步' },
      { key: 'sync_interval', value: '300', description: '同步间隔（秒）' },
      { key: 'theme', value: 'light', description: '主题设置' },
      { key: 'require_login', value: 'false', description: '是否需要登录访问管理后台' },
      { key: 'session_timeout', value: '86400', description: '会话超时时间（秒）' },
      { key: 'max_login_attempts', value: '5', description: '最大登录尝试次数' },
      { key: 'lockout_duration', value: '1800', description: '账户锁定时间（秒）' }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const setting of defaultSettings) {
      try {
        const existing = await queryFirst(db, 'SELECT key FROM settings WHERE key = ?', [setting.key]);
        
        if (!existing) {
          await executeQuery(db, `
            INSERT INTO settings (key, value, description)
            VALUES (?, ?, ?)
          `, [setting.key, setting.value, setting.description]);
          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`插入设置 ${setting.key} 失败:`, error);
      }
    }

    results.push(`✅ 默认设置处理完成 (新增: ${insertedCount}, 跳过: ${skippedCount})`);
  }

  // 创建默认管理员账户
  async createDefaultAdmin(db, results) {
    try {
      const existingUsers = await queryFirst(db, 'SELECT COUNT(*) as count FROM users');

      if (existingUsers.count === 0) {
        const { hashPassword } = await import('../../utils/auth.js');
        const defaultPassword = await hashPassword('admin123');

        await executeQuery(db, `
          INSERT INTO users (username, password_hash, email, role)
          VALUES (?, ?, ?, ?)
        `, ['admin', defaultPassword, 'admin@localhost', 'admin']);

        results.push('✅ 默认管理员账户创建成功 (用户名: admin, 密码: admin123)');
      } else {
        results.push('ℹ️ 用户账户已存在，跳过默认账户创建');
      }
    } catch (error) {
      results.push('❌ 默认管理员账户创建失败: ' + error.message);
    }
  }

  // 插入默认分类
  async insertDefaultCategories(db, results) {
    const defaultCategories = [
      { name: '工作', description: '工作相关的书签' },
      { name: '学习', description: '学习资源和教程' },
      { name: '娱乐', description: '娱乐和休闲网站' },
      { name: '工具', description: '实用工具和服务' },
      { name: '新闻', description: '新闻和资讯网站' }
    ];

    for (const category of defaultCategories) {
      try {
        await executeQuery(db, `
          INSERT OR IGNORE INTO categories (name, description)
          VALUES (?, ?)
        `, [category.name, category.description]);
      } catch (error) {
        // 忽略重复插入错误
      }
    }
    results.push('✅ 默认分类插入成功');
  }

  // 记录初始化日志
  async logInitialization(db, results) {
    try {
      await executeQuery(db, `
        INSERT INTO sync_logs (type, level, message, details, action, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'database',
        'success',
        '数据库初始化完成',
        JSON.stringify(results),
        'database_init',
        'success'
      ]);
    } catch (error) {
      console.error('记录初始化日志失败:', error);
    }
  }
}

// 导出处理器
export const onRequest = createAPIHandler(DatabaseInitHandler);
