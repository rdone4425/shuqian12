/**
 * Turso 数据库初始化 API
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
    // 检查 Turso 配置
    if (!env.TURSO_URL || !env.TURSO_AUTH_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Turso 数据库未配置，请检查 TURSO_URL 和 TURSO_AUTH_TOKEN 环境变量',
        instructions: [
          '1. 在 Cloudflare Dashboard 中进入 Pages 项目设置',
          '2. 在 Functions 标签页中找到 Environment Variables',
          '3. 添加 TURSO_URL 和 TURSO_AUTH_TOKEN 变量',
          '4. 保存设置并重新部署'
        ]
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 创建 Turso 数据库连接
    const db = await createDatabaseConnection(env, DATABASE_TYPES.TURSO);
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
          domain TEXT,
          path TEXT,
          category_id INTEGER,
          subcategory TEXT,
          icon_url TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `).run();
      results.push('✅ 书签表创建成功');
    } catch (error) {
      results.push('❌ 书签表创建失败: ' + error.message);
    }

    // 3. 创建用户表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email TEXT,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          login_attempts INTEGER DEFAULT 0,
          locked_until DATETIME
        )
      `).run();
      results.push('✅ 用户表创建成功');
    } catch (error) {
      results.push('❌ 用户表创建失败: ' + error.message);
    }

    // 4. 创建会话表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `).run();
      results.push('✅ 会话表创建成功');
    } catch (error) {
      results.push('❌ 会话表创建失败: ' + error.message);
    }

    // 5. 创建设置表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
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

    // 6. 创建同步日志表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          details TEXT,
          action TEXT,
          status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      results.push('✅ 同步日志表创建成功');
    } catch (error) {
      results.push('❌ 同步日志表创建失败: ' + error.message);
    }

    // 7. 插入默认设置
    try {
      const defaultSettings = [
        { key: 'items_per_page', value: '20', description: '每页显示数量' },
        { key: 'auto_sync', value: 'true', description: '自动同步' },
        { key: 'sync_interval', value: '300', description: '同步间隔（秒）' },
        { key: 'theme', value: 'light', description: '主题设置' },
        { key: 'require_login', value: 'false', description: '是否需要登录访问管理后台' },
        { key: 'session_timeout', value: '86400', description: '会话超时时间（秒）' },
        { key: 'max_login_attempts', value: '5', description: '最大登录尝试次数' },
        { key: 'database_type', value: 'turso', description: '当前使用的数据库类型' },
        { key: 'lockout_duration', value: '1800', description: '账户锁定时间（秒）' }
      ];

      let insertedCount = 0;
      for (const setting of defaultSettings) {
        try {
          // 检查设置是否已存在
          const existing = await db.prepare(`
            SELECT key FROM settings WHERE key = ?
          `).bind(setting.key).first();

          if (!existing) {
            await db.prepare(`
              INSERT INTO settings (key, value, description, created_at, updated_at)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `).bind(setting.key, setting.value, setting.description).run();
            insertedCount++;
          }
        } catch (error) {
          console.error(`插入设置 ${setting.key} 失败:`, error);
        }
      }
      results.push(`✅ 默认设置插入成功 (${insertedCount}/${defaultSettings.length})`);
    } catch (error) {
      results.push('❌ 默认设置插入失败: ' + error.message);
    }

    // 8. 创建默认管理员用户
    try {
      const existingUser = await db.prepare(`
        SELECT id FROM users WHERE username = 'admin'
      `).first();

      if (!existingUser) {
        // 简单的密码哈希（生产环境应使用更安全的方法）
        const passwordHash = await hashPassword('admin123');

        await db.prepare(`
          INSERT INTO users (username, password_hash, role, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).bind('admin', passwordHash, 'admin').run();

        results.push('✅ 默认管理员用户创建成功 (用户名: admin, 密码: admin123)');
      } else {
        results.push('✅ 管理员用户已存在，跳过创建');
      }
    } catch (error) {
      results.push('❌ 默认管理员用户创建失败: ' + error.message);
    }

    // 9. 记录初始化日志
    try {
      await db.prepare(`
        INSERT INTO sync_logs (type, level, message, details, action, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'database',
        'success',
        'Turso 数据库初始化完成',
        JSON.stringify(results),
        'turso_init',
        'success'
      ).run();
    } catch (error) {
      console.error('记录初始化日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Turso 数据库初始化完成',
      results: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Turso 数据库初始化失败:', error);

    return new Response(JSON.stringify({
      success: false,
      message: 'Turso 数据库初始化失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 简单的密码哈希函数
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'bookmark_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
