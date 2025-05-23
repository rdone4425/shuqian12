-- 书签表
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  icon_url TEXT,
  category_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 触发器：更新书签时更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_bookmark_timestamp
AFTER UPDATE ON bookmarks
BEGIN
  UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：更新设置时更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_setting_timestamp
AFTER UPDATE ON settings
BEGIN
  UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- 默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('items_per_page', '20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_backup', '');

-- 默认分类
INSERT OR IGNORE INTO categories (id, name) VALUES (1, '未分类');
INSERT OR IGNORE INTO categories (id, name) VALUES (2, '工作');
INSERT OR IGNORE INTO categories (id, name) VALUES (3, '学习');
INSERT OR IGNORE INTO categories (id, name) VALUES (4, '娱乐');
INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (5, '前端开发', 2);
INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (6, '后端开发', 2);
INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (7, '编程语言', 3);
INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (8, '视频', 4);
INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (9, '音乐', 4); 