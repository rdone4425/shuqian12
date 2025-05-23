# 部署指南

## 📋 部署前准备

### 1. 环境要求
- [ ] Cloudflare账户已创建
- [ ] 已启用Cloudflare Pages服务
- [ ] 已启用Cloudflare D1数据库服务
- [ ] 已安装Wrangler CLI (`npm install -g wrangler`)
- [ ] 已登录Cloudflare账户 (`wrangler login`)

### 2. 代码准备
- [ ] 所有文件已上传到项目目录
- [ ] 检查文件结构完整性
- [ ] 确认没有语法错误

## 🚀 部署方式

### 方式一：自动化部署（推荐）

#### 步骤1：创建D1数据库
```bash
wrangler d1 create bookmark-manager
```
- [ ] 记录返回的数据库ID
- [ ] 更新 `wrangler.toml` 中的 `database_id`

#### 步骤2：初始化数据库
```bash


```
- [ ] 确认数据库表创建成功
- [ ] 检查默认数据是否插入

#### 步骤3：运行部署脚本
```bash
chmod +x deploy.sh
./deploy.sh
```
- [ ] 部署成功完成
- [ ] 获取部署URL

#### 步骤4：配置Pages项目
在Cloudflare Pages控制台中：
- [ ] 绑定D1数据库（变量名：`DB`）
- [ ] 设置环境变量（如需要）
- [ ] 配置自定义域名（可选）

---

### 方式二：手动部署

#### 第一步：准备Cloudflare环境

1. **登录Cloudflare控制台**
   - 访问 https://dash.cloudflare.com/
   - 登录你的Cloudflare账户

2. **创建D1数据库**
   - 进入 `Workers & Pages` → `D1 SQL Database`
   - 点击 `Create database`
   - 数据库名称：`bookmark-manager`（或自定义名称）
   - 点击 `Create`
   - **记录数据库ID**（稍后需要用到）

#### 第二步：初始化数据库

1. **安装Wrangler CLI**（如果还没安装）
   ```bash
   npm install -g wrangler
   ```

2. **登录Cloudflare**
   ```bash
   wrangler login
   ```

3. **执行数据库初始化脚本**
   ```bash
   cd bookmark-manager
   wrangler d1 execute [你的数据库名称] --file=./schema.sql
   ```

   例如：
   ```bash
   wrangler d1 execute bookmark-manager --file=./schema.sql
   ```

#### 第三步：更新配置文件

更新 `wrangler.toml` 文件中的数据库配置：

```toml
name = "bookmark-manager"
compatibility_date = "2024-01-01"

# 生产环境配置
[[d1_databases]]
binding = "DB"
database_name = "bookmark-manager"  # 你的数据库名称
database_id = "your-actual-database-id"  # 替换为你的实际数据库ID
```

#### 第四步：选择部署方式

**选项A：使用Wrangler CLI部署**
```bash
wrangler pages deploy public --project-name=bookmark-manager
```

**选项B：通过Cloudflare控制台部署**

1. **上传代码到GitHub**
   - 将整个 `bookmark-manager` 目录上传到GitHub仓库
   - 或者创建一个新的GitHub仓库

2. **在Cloudflare Pages中创建项目**
   - 登录 https://dash.cloudflare.com/
   - 进入 `Workers & Pages` → `Pages`
   - 点击 `Create a project`
   - 选择 `Connect to Git`
   - 连接你的GitHub仓库
   - 选择包含书签管理系统的仓库

3. **配置构建设置**
   - **项目名称**：`bookmark-manager`（或你喜欢的名称）
   - **生产分支**：`main`（或你的主分支）
   - **构建命令**：留空
   - **构建输出目录**：`bookmark-manager/public`（如果仓库根目录就是项目则填 `public`）
   - **根目录**：留空（如果整个仓库就是项目）或 `bookmark-manager`

#### 第五步：配置环境变量和绑定

1. **在Pages项目中绑定D1数据库**
   - 进入你的Pages项目设置
   - 找到 `Functions` 标签页
   - 在 `D1 database bindings` 部分
   - 添加绑定：
     - **变量名**：`DB`
     - **D1数据库**：选择你创建的数据库

2. **设置环境变量**（可选）
   - 在 `Settings` → `Environment variables` 中
   - 目前系统不需要额外的环境变量

#### 第六步：验证部署

1. **访问你的网站**
   - Cloudflare会提供一个类似 `https://bookmark-manager.pages.dev` 的URL
   - 访问主页测试基本功能

2. **测试API接口**
   - 访问 `https://your-domain.pages.dev/test.html`
   - 点击各个测试按钮验证API是否正常工作

3. **测试管理后台**
   - 访问 `https://your-domain.pages.dev/admin.html`
   - 尝试添加书签和分类

---

## 📋 手动部署检查清单

### 部署前检查
- [ ] Cloudflare账户已准备
- [ ] D1数据库已创建
- [ ] 数据库ID已记录
- [ ] Wrangler CLI已安装并登录
- [ ] `wrangler.toml` 配置已更新

### 数据库初始化
- [ ] 执行数据库初始化脚本
- [ ] 确认没有错误信息
- [ ] 验证表结构创建成功

### 部署执行
**选择一种方式：**
- [ ] 方式A：使用Wrangler CLI部署
- [ ] 方式B：通过GitHub + Cloudflare Pages控制台

### 配置绑定
- [ ] 在Pages项目中绑定D1数据库（变量名：`DB`）
- [ ] 确认绑定配置正确
- [ ] 检查环境变量设置

### 功能验证
- [ ] 主页可以正常访问
- [ ] API测试页面 `/test.html` 所有接口正常
- [ ] 管理后台 `/admin.html` 功能正常
- [ ] 可以添加、编辑、删除书签
- [ ] 分类管理功能正常
- [ ] 数据导入导出功能正常

## 🧪 部署后测试

### 1. 基础功能测试
- [ ] 访问主页 (`/`)
- [ ] 访问管理后台 (`/admin.html`)
- [ ] 访问API测试页面 (`/test.html`)

### 2. API接口测试
- [ ] `/api/status` - 系统状态
- [ ] `/api/bookmarks` - 书签管理
- [ ] `/api/categories` - 分类管理
- [ ] `/api/stats` - 统计信息
- [ ] `/api/settings` - 系统设置

### 3. 功能测试
- [ ] 添加书签
- [ ] 编辑书签
- [ ] 删除书签
- [ ] 创建分类
- [ ] 筛选功能
- [ ] 搜索功能
- [ ] 分页功能
- [ ] 主题切换
- [ ] 数据导出
- [ ] 数据导入

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败
**问题症状：**
- API返回数据库连接错误
- `/api/status` 显示数据库状态为 `disconnected`

**解决方案：**
```bash
# 检查数据库是否存在
wrangler d1 list

# 检查数据库绑定
# 在Pages项目设置中确认D1绑定配置正确

# 测试数据库连接
wrangler d1 execute [数据库名] --command="SELECT 1 as test;"
```

- [ ] 检查D1数据库是否正确绑定
- [ ] 确认绑定变量名为 `DB`
- [ ] 检查数据库ID是否匹配
- [ ] 验证数据库是否已初始化

#### 2. API返回404错误
**问题症状：**
- 访问 `/api/*` 路径返回404
- 前端无法获取数据

**解决方案：**
```bash
# 检查Functions文件是否存在
ls -la functions/api/

# 重新部署
wrangler pages deploy public --project-name=[项目名]
```

- [ ] 确认 `functions/api/` 目录下所有文件都存在
- [ ] 检查文件名是否与API路径匹配
- [ ] 确认所有API文件都已部署
- [ ] 验证Pages项目的Functions功能已启用

#### 3. 前端无法加载数据
**问题症状：**
- 页面显示"加载中..."不消失
- 浏览器控制台有网络错误

**解决方案：**
```bash
# 使用测试页面诊断
# 访问 /test.html 测试各个API接口

# 检查CORS设置
curl -H "Origin: https://your-domain.pages.dev" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-domain.pages.dev/api/status
```

- [ ] 检查API接口是否正常工作
- [ ] 确认CORS设置正确
- [ ] 检查浏览器控制台错误信息
- [ ] 验证网络连接正常

#### 4. 样式或脚本加载失败
**问题症状：**
- 页面样式混乱
- JavaScript功能不工作

**解决方案：**
```bash
# 检查静态文件结构
tree public/

# 验证文件路径
curl https://your-domain.pages.dev/css/styles.css
curl https://your-domain.pages.dev/js/app.js
```

- [ ] 确认所有静态文件都在 `public` 目录下
- [ ] 检查文件路径是否正确
- [ ] 确认文件名大小写匹配
- [ ] 验证文件内容完整

#### 5. 管理后台功能异常
**问题症状：**
- 无法添加或编辑书签
- 分类管理不工作

**解决方案：**
```bash
# 检查admin.js是否加载
curl https://your-domain.pages.dev/js/admin.js

# 测试API写入权限
curl -X POST https://your-domain.pages.dev/api/bookmarks \
     -H "Content-Type: application/json" \
     -d '{"title":"测试","url":"https://test.com"}'
```

- [ ] 确认 `admin.js` 文件已正确部署
- [ ] 检查API写入权限
- [ ] 验证表单验证逻辑
- [ ] 测试数据库写入操作

### 调试工具和命令

#### 1. 数据库调试
```bash
# 查看数据库列表
wrangler d1 list

# 查看表结构
wrangler d1 execute [数据库名] --command="SELECT name FROM sqlite_master WHERE type='table';"

# 查看数据内容
wrangler d1 execute [数据库名] --command="SELECT * FROM bookmarks LIMIT 5;"
wrangler d1 execute [数据库名] --command="SELECT * FROM categories;"

# 检查数据库统计
wrangler d1 execute [数据库名] --command="SELECT COUNT(*) as count FROM bookmarks;"
```

#### 2. 部署调试
```bash
# 本地测试（可选）
wrangler pages dev public

# 查看部署日志
wrangler pages deployment list [项目名]

# 重新部署
wrangler pages deploy public --project-name=[项目名] --compatibility-date=2024-01-01
```

#### 3. API测试
```bash
# 测试系统状态
curl https://your-domain.pages.dev/api/status

# 测试书签API
curl https://your-domain.pages.dev/api/bookmarks

# 测试分类API
curl https://your-domain.pages.dev/api/categories

# 测试统计API
curl https://your-domain.pages.dev/api/stats
```

#### 4. 前端调试
- 使用 `/test.html` 页面测试API接口
- 检查浏览器开发者工具的Network标签
- 查看Console标签的错误信息
- 验证localStorage中的主题设置

### 性能优化建议

#### 1. 缓存设置
在Cloudflare控制台中配置：
- 静态资源缓存时间：1个月
- API响应缓存时间：5分钟
- 启用Brotli压缩

#### 2. 数据库优化
```sql
-- 添加索引（如果需要）
CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);
```

#### 3. 前端优化
- 启用浏览器缓存
- 压缩CSS和JavaScript文件
- 优化图片资源

## 📝 部署后配置

### 1. 自定义域名（可选）
- 在Cloudflare Pages中添加自定义域名
- 配置DNS记录
- 启用HTTPS

### 2. 性能优化
- 启用Cloudflare缓存
- 配置缓存规则
- 启用压缩

### 3. 安全设置
- 配置访问控制（如需要）
- 设置安全头部
- 启用DDoS保护

## ✅ 部署完成确认

- [ ] 所有功能正常工作
- [ ] API接口响应正常
- [ ] 数据库操作成功
- [ ] 前端界面显示正确
- [ ] 移动端适配良好
- [ ] 性能表现满意

## 📞 支持

如果遇到问题，可以：
1. 查看Cloudflare文档
2. 检查项目README.md
3. 使用测试页面诊断问题
4. 查看浏览器控制台错误信息

---

**部署完成时间：** ___________
**部署人员：** ___________
**项目URL：** ___________
