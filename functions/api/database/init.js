/**
 * Database Initialization API - Refactored version
 * Using base classes and modular design
 */

import { BaseAPIHandler, createAPIHandler } from '../../utils/api-base.js';
import { executeQuery, queryFirst } from '../../utils/database.js';

/**
 * Database Initialization Handler
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
      // 1. Create all tables
      await this.createTables(db, results);

      // 2. Create indexes
      await this.createIndexes(db, results);

      // 3. Insert default data
      await this.insertDefaultData(db, results);

      // 4. Log initialization
      await this.logInitialization(db, results);

      return this.success({
        message: 'Database initialization completed',
        results
      });
    } catch (error) {
      return this.error('Database initialization failed: ' + error.message, 500);
    }
  }

  // Create all tables
  async createTables(db, results) {
    const tables = this.getTableDefinitions();

    for (const [tableName, sql] of Object.entries(tables)) {
      try {
        await executeQuery(db, sql);
        results.push(`✅ ${tableName} table created successfully`);
      } catch (error) {
        results.push(`❌ ${tableName} table creation failed: ${error.message}`);
      }
    }
  }

  // Get table definitions
  getTableDefinitions() {
    return {
      'Categories': `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      'Bookmarks': `
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
      'Domains': `
        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL,
          bookmark_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      'Settings': `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          value TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      'Users': `
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
      'Sessions': `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `,
      'Sync Logs': `
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

  // Create indexes
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
        results.push(`✅ Index ${index.name} created successfully`);
      } catch (error) {
        results.push(`❌ Index ${index.name} creation failed: ${error.message}`);
      }
    }
  }

  // Insert default data
  async insertDefaultData(db, results) {
    // Insert default settings
    await this.insertDefaultSettings(db, results);

    // Create default admin account
    await this.createDefaultAdmin(db, results);

    // Insert default categories
    await this.insertDefaultCategories(db, results);
  }

  // Insert default settings
  async insertDefaultSettings(db, results) {
    const defaultSettings = [
      { key: 'items_per_page', value: '20', description: 'Items per page' },
      { key: 'auto_sync', value: 'true', description: 'Auto sync' },
      { key: 'sync_interval', value: '300', description: 'Sync interval (seconds)' },
      { key: 'theme', value: 'light', description: 'Theme setting' },
      { key: 'require_login', value: 'false', description: 'Require login for admin access' },
      { key: 'session_timeout', value: '86400', description: 'Session timeout (seconds)' },
      { key: 'max_login_attempts', value: '5', description: 'Max login attempts' },
      { key: 'lockout_duration', value: '1800', description: 'Account lockout duration (seconds)' }
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
        console.error(`Failed to insert setting ${setting.key}:`, error);
      }
    }

    results.push(`✅ Default settings processed (added: ${insertedCount}, skipped: ${skippedCount})`);
  }

  // Create default admin account
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

        results.push('✅ Default admin account created (username: admin, password: admin123)');
      } else {
        results.push('ℹ️ User accounts exist, skipping default account creation');
      }
    } catch (error) {
      results.push('❌ Default admin account creation failed: ' + error.message);
    }
  }

  // Insert default categories
  async insertDefaultCategories(db, results) {
    const defaultCategories = [
      { name: 'Work', description: 'Work-related bookmarks' },
      { name: 'Learning', description: 'Learning resources and tutorials' },
      { name: 'Entertainment', description: 'Entertainment and leisure websites' },
      { name: 'Tools', description: 'Useful tools and services' },
      { name: 'News', description: 'News and information websites' }
    ];

    for (const category of defaultCategories) {
      try {
        await executeQuery(db, `
          INSERT OR IGNORE INTO categories (name, description)
          VALUES (?, ?)
        `, [category.name, category.description]);
      } catch (error) {
        // Ignore duplicate insertion errors
      }
    }
    results.push('✅ Default categories inserted successfully');
  }

  // Log initialization
  async logInitialization(db, results) {
    try {
      await executeQuery(db, `
        INSERT INTO sync_logs (type, level, message, details, action, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'database',
        'success',
        'Database initialization completed',
        JSON.stringify(results),
        'database_init',
        'success'
      ]);
    } catch (error) {
      console.error('Failed to log initialization:', error);
    }
  }
}

// Export handler
export const onRequest = createAPIHandler(DatabaseInitHandler);
