# 📚 书签管理系统

一个基于Cloudflare Pages和D1数据库的现代化书签管理系统，**完全兼容Chrome插件**，支持分类管理、搜索筛选、数据导入导出等功能。

## ✨ 功能特性

### 🌐 前台功能
- 📚 书签展示和浏览
- 🔍 多维度筛选（域名、分类、子分类、关键词搜索）
- 📊 统计信息展示（书签数量、域名数量、分类数量）
- 📱 响应式设计，支持移动端
- 🌙 深色/浅色主题切换
- ⌨️ 快捷键支持
- 📄 分页显示

### 🛠️ 管理后台功能
- ➕ 书签的增删改查
- 📁 分类管理（支持主分类和子分类）
- ⚙️ 系统设置
- 📤 数据导出（JSON格式）
- 📥 数据导入
- 💾 数据库备份
- 📈 详细统计信息

### 🔌 Chrome插件集成
- 🔄 **完全兼容Chrome插件同步**
- 📡 支持实时书签同步
- 🎯 自动格式检测和转换
- 🔗 URL自动解析（域名+路径）
- 🚫 防重复机制
- 📊 同步状态监控

### 🚀 技术特性
- 🌍 基于Cloudflare Pages部署
- 🗄️ 使用Cloudflare D1数据库
- 🎨 现代化UI设计
- 🔒 CORS支持
- 📱 PWA就绪
- 🔄 双API格式兼容

## 🚀 快速部署指南

### 第1步：创建数据库

**方法1：Web界面一键初始化（推荐）**
1. 先完成第2步部署Pages项目
2. 访问管理后台：`https://your-pages-project.pages.dev/admin.html`
3. 在"系统设置"标签页中点击 **"一键初始化"** 按钮
4. 系统会自动检测D1绑定状态并创建所有表结构

**方法2：手动SQL执行**
1. 打开你的Cloudflare D1数据库控制台
2. 复制 `setup-database.sql` 中的内容
3. 在D1控制台中粘贴并执行

### 第2步：部署Pages项目

1. **上传代码**
   - 访问 [Cloudflare Pages控制台](https://dash.cloudflare.com/pages)
   - 点击 **"Create a project"** 或 **"Upload assets"**
   - 上传 `public` 目录中的所有文件

2. **配置项目**
   - 设置项目名称（如：`bookmark-manager`）
   - 构建命令：留空
   - 构建输出目录：`public`

3. **绑定数据库**
   - 进入项目设置 → Functions
   - 添加D1数据库绑定：
     - 变量名：`DB`
     - 选择你的D1数据库

### 第3步：配置Chrome插件

在Chrome插件中设置API地址：
```
https://your-pages-project.pages.dev/api/bookmarks
```

### 第4步：验证部署

- 🌐 访问主页：`https://your-pages-project.pages.dev/`
- 🛠️ 管理后台：`https://your-pages-project.pages.dev/admin.html`
- 🔍 API状态：`https://your-pages-project.pages.dev/api/status`

## 🔌 Chrome插件集成

### 支持的同步操作

#### 完整同步 (fullSync)
```javascript
// Chrome插件发送格式
{
  "action": "fullSync",
  "data": [
    {
      "title": "示例书签",
      "url": "https://example.com",
      "date_added": 1634567890123
    }
  ]
}
```

#### 创建书签 (create)
```javascript
{
  "action": "create",
  "data": {
    "title": "新书签",
    "url": "https://newsite.com"
  }
}
```

#### 更新书签 (update)
```javascript
{
  "action": "update",
  "data": {
    "title": "更新的书签",
    "url": "https://example.com"
  }
}
```

#### 删除书签 (remove)
```javascript
{
  "action": "remove",
  "data": {
    "url": "https://example.com"
  }
}
```

### API响应格式

#### Chrome插件格式
```javascript
{
  "success": true,
  "message": "操作成功",
  "data": {...}
}
```

#### 书签管理系统格式
```javascript
{
  "success": true,
  "bookmarks": [...],
  "total": 100,
  "page": 1
}
```

## 📡 API接口

### 核心端点
- `GET /api/status` - 系统状态
- `GET /api/bookmarks` - 获取书签列表
- `POST /api/bookmarks` - 创建书签/Chrome插件同步
- `GET /api/categories` - 获取分类
- `GET /api/domains` - 域名统计
- `GET /api/stats` - 统计信息

## 📖 使用说明

### 🌐 前台功能
1. **浏览书签** - 访问主页查看所有书签
2. **筛选搜索** - 使用域名、分类筛选器和关键词搜索
3. **主题切换** - 点击右下角按钮切换深色/浅色主题
4. **快捷键操作**：
   - `Alt + D` - 聚焦域名筛选器
   - `Alt + C` - 聚焦分类筛选器
   - `Alt + S` - 聚焦搜索框
   - `Alt + T` - 切换主题
   - `Alt + ←/→` - 翻页

### 🛠️ 管理后台
1. **书签管理** - 访问 `/admin.html` 进行增删改查
2. **分类管理** - 管理主分类和子分类
3. **数据管理** - 导入导出JSON格式数据
4. **系统设置** - 配置分页数量等参数

### 🔌 Chrome插件使用
1. **设置API地址** - 在插件中配置Pages项目地址
2. **自动同步** - 插件会自动同步浏览器书签
3. **状态监控** - 插件图标显示同步状态（绿色=正常，红色=异常）

## 📁 项目结构

```
bookmark-manager/
├── public/                 # 前端文件
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   ├── index.html         # 主页
│   └── admin.html         # 管理后台
├── functions/api/         # API端点
│   ├── bookmarks.js       # 书签API（兼容Chrome插件）
│   ├── categories.js      # 分类API
│   ├── domains.js         # 域名统计API
│   └── ...               # 其他API
├── setup-database.sql     # 一键建表SQL
├── schema.sql            # 完整数据库结构
└── README.md             # 说明文档
```

## 🎯 特色功能

- ✅ **零配置部署** - 上传即用，无需复杂配置
- ✅ **双格式兼容** - 同时支持Chrome插件和Web管理
- ✅ **自动URL解析** - 智能拆分域名和路径
- ✅ **防重复机制** - 避免重复书签
- ✅ **实时同步** - Chrome插件实时同步
- ✅ **响应式设计** - 完美适配移动端

## 📄 许可证

MIT License - 自由使用和修改

---

**🎉 现在就开始使用吧！将你的Chrome插件连接到这个强大的书签管理系统！**
