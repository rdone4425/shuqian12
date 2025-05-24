# 📁 项目结构

本文档描述了书签管理系统的完整项目结构。

## 🗂️ 目录结构

```
bookmark-manager/
├── 📄 README.md                    # 项目说明文档
├── 📄 CHANGELOG.md                 # 更新日志
├── 📄 _routes.json                 # Cloudflare Pages 路由配置
├── 📁 functions/                   # Cloudflare Functions (后端API)
│   ├── 📁 api/                     # API 接口
│   │   ├── 📁 auth/                # 用户认证相关
│   │   │   ├── login.js            # 用户登录
│   │   │   ├── logout.js           # 用户登出
│   │   │   ├── profile.js          # 用户资料管理
│   │   │   └── users.js            # 用户管理
│   │   ├── 📁 bookmarks/           # 书签管理相关
│   │   │   ├── index.js            # 书签CRUD操作
│   │   │   └── [id].js             # 单个书签操作
│   │   ├── 📁 categories/          # 分类管理相关
│   │   │   ├── index.js            # 分类CRUD操作
│   │   │   └── [id].js             # 单个分类操作
│   │   ├── 📁 database/            # 数据库管理相关
│   │   │   ├── init.js             # 数据库初始化
│   │   │   └── check.js            # 数据库状态检查
│   │   ├── 📁 settings/            # 系统设置相关
│   │   │   └── security.js         # 安全设置管理
│   │   ├── 📁 system/              # 系统功能相关
│   │   │   ├── stats.js            # 系统统计
│   │   │   ├── domains.js          # 域名统计
│   │   │   ├── export.js           # 数据导出
│   │   │   ├── import.js           # 数据导入
│   │   │   ├── logs.js             # 系统日志
│   │   │   └── settings.js         # 系统设置
│   │   └── 📁 utils/               # 工具函数
│   │       └── generate-path.js    # 随机路径生成
│   └── 📁 utils/                   # 通用工具函数
│       ├── auth.js                 # 认证工具
│       ├── cors.js                 # CORS 配置
│       └── middleware.js           # 中间件
├── 📁 public/                      # 前端静态文件
│   ├── 📄 index.html               # 首页
│   ├── 📄 admin.html               # 管理后台
│   ├── 📄 login.html               # 登录页面
│   ├── 📄 setup.html               # 初始化页面
│   ├── 📁 js/                      # JavaScript 文件
│   │   ├── home-components.js      # 首页组件
│   │   └── admin-components.js     # 管理后台组件
│   └── 📁 img/                     # 图片资源
│       └── favicon.ico             # 网站图标

chrome/                             # Chrome 插件
├── 📄 manifest.json                # 插件配置文件
├── 📄 background.js                # 后台脚本
├── 📄 popup.html                   # 弹窗页面
├── 📄 popup.js                     # 弹窗脚本
├── 📄 styles.css                   # 样式文件
├── 📄 debug.html                   # 调试页面
└── 📄 debug.js                     # 调试脚本

docs/                               # 项目文档
├── 📄 API.md                       # API 接口文档
├── 📄 DEPLOYMENT.md                # 部署指南
└── 📄 FAQ.md                       # 常见问题

📄 .gitignore                       # Git 忽略文件配置
📄 PROJECT_STRUCTURE.md             # 本文档
```

## 🗑️ 已删除的文件

在项目清理过程中，删除了以下不必要的文件：

### 调试和测试文件
- `functions/api/capture-request.js` - 请求捕获调试工具
- `functions/api/debug.js` - API 调试工具
- `functions/api/performance.js` - 性能监控工具
- `functions/api/test-bookmark.js` - 书签测试工具
- `functions/api/test-chrome.js` - Chrome 插件测试工具

### 配置文件
- `public/_routes.json` - 错误位置的路由配置文件（已移动到根目录）

### 空目录
- `dns/` - 空的DNS配置目录

## 📋 文件说明

### 🔧 核心功能文件

#### 后端 API
- **认证系统**: `auth/` 目录下的文件处理用户登录、注册、资料管理
- **书签管理**: `bookmarks/` 目录下的文件处理书签的增删改查
- **分类管理**: `categories/` 目录下的文件处理分类的管理
- **数据库管理**: `database/` 目录下的文件处理数据库初始化和检查
- **系统管理**: `system/` 目录下的文件处理统计、导入导出等功能

#### 前端页面
- **index.html**: 主页面，展示书签列表和搜索功能
- **admin.html**: 管理后台，提供完整的管理功能
- **login.html**: 登录页面，用户认证入口
- **setup.html**: 初始化页面，首次部署时的设置向导

#### Chrome 插件
- **manifest.json**: 插件配置，定义权限和入口
- **background.js**: 后台脚本，处理书签同步逻辑
- **popup.html/js**: 插件弹窗，提供快速操作界面
- **debug.html/js**: 调试工具，帮助排查同步问题

### 📚 文档文件

- **README.md**: 项目介绍和快速开始指南
- **CHANGELOG.md**: 版本更新记录
- **docs/API.md**: 详细的 API 接口文档
- **docs/DEPLOYMENT.md**: 完整的部署指南
- **docs/FAQ.md**: 常见问题和解决方案

### ⚙️ 配置文件

- **_routes.json**: Cloudflare Pages 路由配置
- **.gitignore**: Git 版本控制忽略文件配置

## 🎯 文件用途总结

### 生产环境必需文件
- `bookmark-manager/` 目录下的所有文件
- `chrome/` 目录下的所有文件
- `docs/` 目录下的文档文件
- 根目录的配置文件

### 开发调试文件
- `chrome/debug.html` 和 `chrome/debug.js` - 用户可以通过这些文件调试插件问题

### 文档文件
- 所有 `.md` 文件都是重要的文档，帮助用户理解和使用系统

## 🚀 部署说明

部署时只需要 `bookmark-manager/` 目录下的文件：
- 将整个 `bookmark-manager/` 目录作为 Cloudflare Pages 项目的根目录
- `chrome/` 目录可以单独分发给用户安装
- `docs/` 目录可以作为文档网站或包含在主项目中

## 🔄 维护建议

1. **定期清理**: 定期检查是否有新的临时文件或调试文件需要清理
2. **文档更新**: 当添加新功能时，及时更新相关文档
3. **版本管理**: 使用 `.gitignore` 确保不提交不必要的文件
4. **结构保持**: 保持当前的目录结构，便于维护和扩展

---

这个清理后的项目结构简洁明了，包含了所有必要的功能文件，删除了调试和测试文件，便于部署和维护。
