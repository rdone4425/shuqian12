-- 一键创建书签管理系统数据库
-- 兼容Chrome插件和书签管理系统

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 书签表（完整字段，兼容Chrome插件）
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  path TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  category_id INTEGER DEFAULT NULL,
  subcategory_id INTEGER DEFAULT NULL,
  tags TEXT DEFAULT '',
  is_favorite INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visited TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('items_per_page', '20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_backup', '');

-- 插入默认分类
INSERT OR IGNORE INTO categories (name) VALUES ('未分类');
INSERT OR IGNORE INTO categories (name) VALUES ('工作');
INSERT OR IGNORE INTO categories (name) VALUES ('学习');
INSERT OR IGNORE INTO categories (name) VALUES ('娱乐');
INSERT OR IGNORE INTO categories (name, parent_id) VALUES ('前端开发', 2);
INSERT OR IGNORE INTO categories (name, parent_id) VALUES ('后端开发', 2);
INSERT OR IGNORE INTO categories (name, parent_id) VALUES ('编程语言', 3);
INSERT OR IGNORE INTO categories (name, parent_id) VALUES ('视频', 4);
INSERT OR IGNORE INTO categories (name, parent_id) VALUES ('音乐', 4);
