# 书签管理系统

一个基于Cloudflare Pages和D1数据库的现代化书签管理系统，支持分类管理、搜索筛选、数据导入导出等功能。

## 功能特性

### 前台功能
- 📚 书签展示和浏览
- 🔍 多维度筛选（域名、分类、子分类、关键词搜索）
- 📊 统计信息展示（书签数量、域名数量、分类数量）
- 📱 响应式设计，支持移动端
- 🌙 深色/浅色主题切换
- ⌨️ 快捷键支持
- 📄 分页显示

### 管理后台功能
- ➕ 书签的增删改查
- 📁 分类管理（支持主分类和子分类）
- ⚙️ 系统设置
- 📤 数据导出（JSON格式）
- 📥 数据导入
- 💾 数据库备份
- 📈 详细统计信息

### 技术特性
- 🚀 基于Cloudflare Pages部署
- 🗄️ 使用Cloudflare D1数据库
- 🎨 现代化UI设计
- 🔒 CORS支持
- 📱 PWA就绪

## 部署指南

> 🚀 **新手推荐**：查看 [QUICKSTART.md](./QUICKSTART.md) 获取5分钟快速部署指南！

### 快速部署（推荐）

#### 1. 自动化部署
```bash
# 克隆或下载项目代码
cd bookmark-manager

# 运行自动部署脚本
chmod +x deploy.sh
./deploy.sh
```

#### 2. 配置绑定
在Cloudflare Pages控制台中：
- 绑定D1数据库（变量名：`DB`）
- 等待部署完成

### 手动部署

#### 1. 准备工作
确保你有：
- Cloudflare账户
- 已启用Pages和D1服务
- 已安装Wrangler CLI (`npm install -g wrangler`)

#### 2. 创建D1数据库
```bash
# 使用Wrangler CLI创建D1数据库
wrangler d1 create bookmark-manager

# 记录返回的数据库ID，稍后需要配置
```

#### 3. 初始化数据库
```bash
# 执行数据库初始化脚本
wrangler d1 execute bookmark-manager --file=./schema.sql
```

#### 4. 选择部署方式

**方式A：使用Wrangler CLI**
```bash
wrangler pages deploy public --project-name=bookmark-manager
```

**方式B：通过GitHub + Cloudflare Pages**
1. 将代码上传到GitHub仓库
2. 在Cloudflare Pages中连接GitHub仓库
3. 配置构建设置：
   - 构建命令：留空
   - 构建输出目录：`public`
   - 根目录：`bookmark-manager`

#### 5. 配置数据库绑定
在Cloudflare Pages项目的Functions设置中绑定D1数据库：
- 变量名：`DB`
- D1数据库：选择之前创建的数据库

#### 6. 验证部署
- 访问主页测试基本功能
- 访问 `/test.html` 测试API接口
- 访问 `/admin.html` 测试管理功能

> 📖 **详细部署指南**：查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署步骤和故障排除指南。

## API接口文档

### 基础信息
- 基础URL：`https://your-domain.pages.dev/api`
- 所有接口支持CORS
- 返回格式：JSON

### 接口列表

#### 1. 系统状态
```
GET /api/status
```

#### 2. 书签管理
```
GET /api/bookmarks          # 获取书签列表
GET /api/bookmarks/{id}     # 获取单个书签
POST /api/bookmarks         # 创建书签
PUT /api/bookmarks/{id}     # 更新书签
DELETE /api/bookmarks/{id}  # 删除书签
```

#### 3. 分类管理
```
GET /api/categories         # 获取分类列表
GET /api/categories/{id}    # 获取单个分类
POST /api/categories        # 创建分类
PUT /api/categories/{id}    # 更新分类
DELETE /api/categories/{id} # 删除分类
```

#### 4. 域名统计
```
GET /api/domains            # 获取域名列表
GET /api/domains/{domain}   # 获取特定域名的书签
```

#### 5. 统计信息
```
GET /api/stats              # 获取统计信息
```

#### 6. 系统设置
```
GET /api/settings           # 获取设置
POST /api/settings          # 更新设置
```

#### 7. 数据管理
```
GET /api/export             # 导出数据
POST /api/import            # 导入数据
POST /api/backup            # 备份数据库
```

## 使用说明

### 前台使用
1. 访问主页查看所有书签
2. 使用筛选器按域名、分类等条件筛选
3. 使用搜索框进行关键词搜索
4. 点击右下角按钮切换主题
5. 使用快捷键快速操作：
   - `Alt + D`：聚焦域名筛选器
   - `Alt + C`：聚焦分类筛选器
   - `Alt + S`：聚焦搜索框
   - `Alt + T`：切换主题
   - `Alt + ←/→`：翻页

### 管理后台使用
1. 访问 `/admin.html` 进入管理后台
2. 在"书签管理"标签页中添加、编辑、删除书签
3. 在"分类管理"标签页中管理分类和子分类
4. 在"系统设置"标签页中配置系统参数和管理数据

### 数据导入导出
- 导出：在管理后台点击"导出数据"按钮，下载JSON格式的数据文件
- 导入：点击"导入数据"按钮，选择之前导出的JSON文件

## 开发说明

### 目录结构
```
bookmark-manager/
├── public/                 # 静态文件
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   ├── img/               # 图片文件
│   ├── index.html         # 主页
│   └── admin.html         # 管理后台
├── functions/             # Cloudflare Pages Functions
│   └── api/               # API端点
├── schema.sql             # 数据库结构
└── README.md              # 说明文档
```

### 本地开发
1. 安装Wrangler CLI
2. 配置本地D1数据库
3. 运行 `wrangler pages dev public`

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
