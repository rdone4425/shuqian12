-- =====================================================
-- 书签管理系统数据库结构 v2.0
-- 重构版本，优化了表结构和数据类型
-- =====================================================

-- 1. 分类表（主分类和子分类）
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER DEFAULT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 2. 书签表
DROP TABLE IF EXISTS bookmarks;
CREATE TABLE bookmarks (
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
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 3. 系统设置表
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'string',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. 用户操作日志表（可选）
DROP TABLE IF EXISTS operation_logs;
CREATE TABLE operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_data TEXT DEFAULT '',
  new_data TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 索引优化
-- =====================================================

-- 书签表索引
CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX idx_bookmarks_category ON bookmarks(category_id);
CREATE INDEX idx_bookmarks_subcategory ON bookmarks(subcategory_id);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at);
CREATE INDEX idx_bookmarks_title ON bookmarks(title);
CREATE INDEX idx_bookmarks_url ON bookmarks(url);
CREATE INDEX idx_bookmarks_favorite ON bookmarks(is_favorite);

-- 分类表索引
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_active ON categories(is_active);

-- 设置表索引
CREATE INDEX idx_settings_key ON settings(key);

-- 日志表索引
CREATE INDEX idx_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX idx_logs_table_name ON operation_logs(table_name);
CREATE INDEX idx_logs_created_at ON operation_logs(created_at);

-- =====================================================
-- 触发器
-- =====================================================

-- 书签表更新时间触发器
CREATE TRIGGER update_bookmarks_timestamp
AFTER UPDATE ON bookmarks
BEGIN
  UPDATE bookmarks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 分类表更新时间触发器
CREATE TRIGGER update_categories_timestamp
AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 设置表更新时间触发器
CREATE TRIGGER update_settings_timestamp
AFTER UPDATE ON settings
BEGIN
  UPDATE settings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 书签URL变更时自动更新域名和路径
CREATE TRIGGER update_bookmark_url_parts
AFTER UPDATE OF url ON bookmarks
WHEN NEW.url != OLD.url
BEGIN
  UPDATE bookmarks SET
    domain = CASE
      WHEN NEW.url LIKE 'http://%' THEN substr(NEW.url, 8, instr(substr(NEW.url, 8), '/') - 1)
      WHEN NEW.url LIKE 'https://%' THEN substr(NEW.url, 9, instr(substr(NEW.url, 9), '/') - 1)
      ELSE NEW.url
    END,
    path = CASE
      WHEN NEW.url LIKE 'http://%' AND instr(substr(NEW.url, 8), '/') > 0 THEN substr(NEW.url, 8 + instr(substr(NEW.url, 8), '/'))
      WHEN NEW.url LIKE 'https://%' AND instr(substr(NEW.url, 9), '/') > 0 THEN substr(NEW.url, 9 + instr(substr(NEW.url, 9), '/'))
      ELSE ''
    END
  WHERE id = NEW.id;
END;

-- =====================================================
-- 默认数据插入
-- =====================================================

-- 系统设置
INSERT INTO settings (key, value, description, type) VALUES
('items_per_page', '20', '每页显示的书签数量', 'number'),
('theme', 'light', '默认主题（light/dark）', 'string'),
('auto_backup', '0', '是否自动备份（0/1）', 'boolean'),
('backup_interval', '7', '备份间隔（天）', 'number'),
('last_backup', '', '最后备份时间', 'datetime'),
('version', '2.0', '系统版本', 'string'),
('site_title', '书签管理系统', '网站标题', 'string'),
('enable_logs', '1', '是否启用操作日志（0/1）', 'boolean');

-- 默认分类
INSERT INTO categories (name, description, sort_order) VALUES
('未分类', '未分类的书签', 0),
('工作', '工作相关的书签', 1),
('学习', '学习资源和教程', 2),
('娱乐', '娱乐和休闲网站', 3),
('工具', '实用工具和服务', 4),
('新闻', '新闻和资讯网站', 5);

-- 工作子分类
INSERT INTO categories (name, parent_id, description, sort_order) VALUES
('前端开发', 2, '前端开发相关资源', 1),
('后端开发', 2, '后端开发相关资源', 2),
('设计工具', 2, '设计和UI工具', 3),
('项目管理', 2, '项目管理工具', 4);

-- 学习子分类
INSERT INTO categories (name, parent_id, description, sort_order) VALUES
('编程语言', 3, '各种编程语言学习资源', 1),
('在线课程', 3, '在线学习平台', 2),
('技术博客', 3, '技术博客和文章', 3),
('文档手册', 3, '官方文档和手册', 4);

-- 娱乐子分类
INSERT INTO categories (name, parent_id, description, sort_order) VALUES
('视频', 4, '视频网站和平台', 1),
('音乐', 4, '音乐播放和下载', 2),
('游戏', 4, '游戏相关网站', 3),
('社交', 4, '社交网络平台', 4);

-- 工具子分类
INSERT INTO categories (name, parent_id, description, sort_order) VALUES
('在线工具', 5, '各种在线工具', 1),
('软件下载', 5, '软件下载网站', 2),
('云服务', 5, '云存储和服务', 3),
('API服务', 5, 'API和开发服务', 4);