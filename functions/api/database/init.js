/**
 * 数据库初始化 API - 简化版
 * 专门为 D1 数据库优化，避免复杂的 SQL 语法
 */

import { CORS_HEADERS } from '../../utils/cors.js';

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
        message: '数据库未绑定，请检查 D1 数据库配置',
        instructions: [
          '1. 登录 Cloudflare Dashboard',
          '2. 进入 Pages 项目设置',
          '3. 在 Functions 标签页中找到 Bindings',
          '4. 添加 D1 数据库绑定，变量名设为 "DB"',
          '5. 保存设置并重新部署'
        ]
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    const results = [];

    // 1. 创建分类表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      results.push('✅ 分类表创建成功');
    } catch (error) {
      results.push('❌ 分类表创建失败: ' + error.message);
    }

    // 2. 创建书签表
    try {
      await db.prepare(`
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
      `).run();
      results.push('✅ 书签表创建成功');
    } catch (error) {
      results.push('❌ 书签表创建失败: ' + error.message);
    }

    // 3. 创建域名表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL,
          bookmark_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      results.push('✅ 域名表创建成功');
    } catch (error) {
      results.push('❌ 域名表创建失败: ' + error.message);
    }

    // 4. 创建设置表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          value TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      results.push('✅ 设置表创建成功');
    } catch (error) {
      results.push('❌ 设置表创建失败: ' + error.message);
    }

    // 5. 创建用户表
    try {
      await db.prepare(`
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
      `).run();
      results.push('✅ 用户表创建成功');
    } catch (error) {
      results.push('❌ 用户表创建失败: ' + error.message);
    }

    // 6. 创建会话表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `).run();
      results.push('✅ 会话表创建成功');
    } catch (error) {
      results.push('❌ 会话表创建失败: ' + error.message);
    }

    // 7. 创建同步日志表
    try {
      await db.prepare(`
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
      `).run();
      results.push('✅ 同步日志表创建成功');
    } catch (error) {
      results.push('❌ 同步日志表创建失败: ' + error.message);
    }

    // 8. 创建索引（分别创建，避免批量执行问题）
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
        await db.prepare(index.sql).run();
        results.push(`✅ 索引 ${index.name} 创建成功`);
      } catch (error) {
        results.push(`❌ 索引 ${index.name} 创建失败: ${error.message}`);
      }
    }

    // 9. 插入默认设置（只插入不存在的设置，保护用户自定义设置）
    try {
      const defaultSettings = [
        { key: 'items_per_page', value: '20', description: '每页显示数量' },
        { key: 'auto_sync', value: 'true', description: '自动同步' },
        { key: 'sync_interval', value: '300', description: '同步间隔（秒）' },
        { key: 'theme', value: 'light', description: '主题设置' },
        { key: 'admin_path', value: '', description: '管理后台访问路径（为空表示使用默认路径）' },
        { key: 'home_path', value: '', description: '首页访问路径（为空表示使用默认路径）' },
        { key: 'enable_home_path', value: 'false', description: '是否启用首页路径保护' },
        { key: 'require_login', value: 'false', description: '是否需要登录访问管理后台' },
        { key: 'session_timeout', value: '86400', description: '会话超时时间（秒）' },
        { key: 'max_login_attempts', value: '5', description: '最大登录尝试次数' },
        { key: 'lockout_duration', value: '1800', description: '账户锁定时间（秒）' }
      ];

      let insertedCount = 0;
      let skippedCount = 0;

      for (const setting of defaultSettings) {
        try {
          // 检查设置是否已存在
          const existing = await db.prepare(`
            SELECT key FROM settings WHERE key = ?
          `).bind(setting.key).first();

          if (!existing) {
            // 只有不存在时才插入
            await db.prepare(`
              INSERT INTO settings (key, value, description)
              VALUES (?, ?, ?)
            `).bind(setting.key, setting.value, setting.description).run();
            insertedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`插入设置 ${setting.key} 失败:`, error);
        }
      }

      results.push(`✅ 默认设置处理完成 (新增: ${insertedCount}, 跳过: ${skippedCount})`);
    } catch (error) {
      results.push('❌ 默认设置插入失败: ' + error.message);
    }

    // 10. 创建默认管理员账户
    try {
      // 检查是否已有用户
      const existingUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first();

      if (existingUsers.count === 0) {
        // 导入密码哈希函数
        const { hashPassword } = await import('../../utils/auth.js');

        // 创建默认管理员账户
        const defaultPassword = await hashPassword('admin123');

        await db.prepare(`
          INSERT INTO users (username, password_hash, email, role)
          VALUES (?, ?, ?, ?)
        `).bind('admin', defaultPassword, 'admin@localhost', 'admin').run();

        results.push('✅ 默认管理员账户创建成功 (用户名: admin, 密码: admin123)');
      } else {
        results.push('ℹ️ 用户账户已存在，跳过默认账户创建');
      }
    } catch (error) {
      results.push('❌ 默认管理员账户创建失败: ' + error.message);
    }

    // 11. 插入默认分类
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
        INSERT INTO sync_logs (type, level, message, details, action, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'database',
        'success',
        '数据库初始化完成',
        JSON.stringify(results),
        'database_init',
        'success'
      ).run();
    } catch (error) {
      console.error('记录初始化日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '数据库初始化完成',
      results: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据库初始化失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: '数据库初始化失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
