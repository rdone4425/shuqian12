# 🚀 部署指南

本文档详细介绍如何将书签管理系统部署到 Cloudflare Pages。

## 📋 前置要求

### 必需账户
- ✅ **Cloudflare 账户** - [注册地址](https://dash.cloudflare.com/sign-up)
- ✅ **GitHub 账户** - [注册地址](https://github.com/join)

### 可选工具
- 🔧 **Wrangler CLI** - Cloudflare 命令行工具
- 🌐 **自定义域名** - 可选，用于绑定自定义域名

## 🎯 部署步骤

### 第一步：准备代码仓库

#### 1.1 Fork 或下载项目
```bash
# 方式一：克隆项目
git clone https://github.com/原作者/bookmark-manager.git
cd bookmark-manager

# 方式二：下载 ZIP 并解压
# 然后创建新的 Git 仓库
git init
git add .
git commit -m "Initial commit"
```

#### 1.2 推送到你的 GitHub
```bash
# 添加你的 GitHub 仓库作为远程仓库
git remote add origin https://github.com/你的用户名/bookmark-manager.git

# 推送代码
git push -u origin main
```

### 第二步：创建 Cloudflare Pages 项目

#### 2.1 登录 Cloudflare Dashboard
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 使用你的账户登录

#### 2.2 创建 Pages 项目
1. 在左侧菜单中选择 **Pages**
2. 点击 **Create a project** 按钮
3. 选择 **Connect to Git**

#### 2.3 连接 GitHub 仓库
1. 选择 **GitHub** 作为 Git 提供商
2. 授权 Cloudflare 访问你的 GitHub 账户
3. 选择 `bookmark-manager` 仓库

#### 2.4 配置构建设置
```yaml
Project name: bookmark-manager  # 或你喜欢的名称
Production branch: main
Framework preset: None
Build command: (留空)
Build output directory: /
Root directory: bookmark-manager  # 如果项目在子目录中
```

#### 2.5 部署项目
1. 点击 **Save and Deploy**
2. 等待首次部署完成（约 1-2 分钟）
3. 记录分配的域名（如：`bookmark-manager-abc.pages.dev`）

### 第三步：创建 D1 数据库

#### 3.1 安装 Wrangler CLI
```bash
# 使用 npm 安装
npm install -g wrangler

# 或使用 yarn
yarn global add wrangler

# 验证安装
wrangler --version
```

#### 3.2 登录 Cloudflare
```bash
# 登录你的 Cloudflare 账户
wrangler login

# 验证登录状态
wrangler whoami
```

#### 3.3 创建 D1 数据库
```bash
# 创建生产环境数据库
wrangler d1 create bookmark-manager-db

# 记录输出的数据库 ID，类似：
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### 3.4 创建开发环境数据库（可选）
```bash
# 如果需要本地开发
wrangler d1 create bookmark-manager-dev
```

### 第四步：绑定数据库到 Pages

#### 4.1 进入 Pages 项目设置
1. 在 Cloudflare Dashboard 中，进入你的 Pages 项目
2. 点击 **Settings** 标签页
3. 选择 **Functions** 子标签页

#### 4.2 添加数据库绑定
1. 在 **Bindings** 部分，点击 **Add binding**
2. 选择 **D1 database**
3. 配置绑定：
   ```
   Variable name: DB
   D1 database: bookmark-manager-db
   ```
4. 点击 **Save**

#### 4.3 触发重新部署
```bash
# 推送一个小更改来触发重新部署
git commit --allow-empty -m "Trigger redeploy with D1 binding"
git push origin main
```

### 第五步：系统初始化

#### 5.1 访问你的网站
1. 打开浏览器，访问你的 Pages 域名
2. 系统会自动检测到需要初始化

#### 5.2 完成数据库初始化
1. 点击 **开始初始化** 按钮
2. 按照向导完成以下步骤：
   - ✅ 环境检查
   - ✅ 数据库初始化
   - ✅ 完成设置

#### 5.3 创建管理员账户
1. 初始化完成后，访问 `/admin.html`
2. 系统会跳转到登录页面
3. 创建第一个管理员账户：
   ```
   用户名: admin
   密码: 你的安全密码
   邮箱: 你的邮箱（可选）
   ```

## 🔧 高级配置

### 自定义域名

#### 1. 添加自定义域名
1. 在 Pages 项目中，进入 **Custom domains** 标签页
2. 点击 **Set up a custom domain**
3. 输入你的域名（如：`bookmarks.yourdomain.com`）
4. 按照提示配置 DNS 记录

#### 2. 配置 DNS
在你的域名提供商处添加 CNAME 记录：
```
Type: CNAME
Name: bookmarks
Value: bookmark-manager-abc.pages.dev
```

### 环境变量配置

在 **Settings** → **Environment variables** 中添加：

| 变量名 | 值 | 环境 |
|--------|----|----|
| `NODE_ENV` | `production` | Production |
| `DEBUG` | `false` | Production |

### 安全设置

#### 1. 启用登录保护
1. 访问管理后台 → 设置 → 安全设置
2. 启用 **需要登录访问管理后台**
3. 配置会话超时时间

#### 2. 设置自定义管理路径
1. 在安全设置中设置 **管理路径**
2. 例如设置为 `secret123`
3. 管理后台将只能通过 `/secret123/admin.html` 访问

## 🔌 Chrome 插件配置

### 安装插件

#### 1. 下载插件文件
```bash
# 下载 chrome 文件夹到本地
# 或从 GitHub 仓库下载
```

#### 2. 加载插件
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `chrome` 文件夹

### 配置插件

#### 1. 设置 API 地址
1. 点击插件图标
2. 点击 **设置** 按钮
3. 输入 API 地址：
   ```
   https://你的域名.pages.dev/api/bookmarks
   ```
4. 点击 **检查 API** 验证连接
5. 点击 **保存设置**

#### 2. 测试同步
1. 在 Chrome 中添加一个书签
2. 观察插件图标颜色变化
3. 访问网站确认书签已同步

## 🐛 故障排除

### 常见问题

#### 1. 部署失败
**问题**: Pages 部署时出现错误
**解决方案**:
- 检查 `_routes.json` 文件格式
- 确保没有语法错误
- 查看部署日志获取详细错误信息

#### 2. 数据库连接失败
**问题**: 访问网站时显示数据库错误
**解决方案**:
- 确认 D1 数据库已创建
- 检查数据库绑定配置
- 变量名必须是 `DB`

#### 3. API 返回 HTML 而不是 JSON
**问题**: Chrome 插件报告 API 错误
**解决方案**:
- 检查 API 地址是否正确
- 确保以 `/api/bookmarks` 结尾
- 访问 `/api/system/stats` 测试 API

#### 4. 插件无法同步
**问题**: Chrome 插件状态一直显示错误
**解决方案**:
- 检查 API 地址配置
- 确认网站已完成初始化
- 查看浏览器控制台错误信息

### 调试工具

#### 1. 使用插件调试页面
1. 在 Chrome 扩展管理页面中
2. 找到书签同步插件
3. 点击 **详细信息**
4. 点击 **扩展程序选项**
5. 使用调试工具检查状态

#### 2. 查看 API 文档
1. 访问管理后台
2. 进入 **API 文档** 标签页
3. 测试各个 API 接口

#### 3. 检查系统日志
1. 在管理后台的 **监控** 标签页
2. 查看系统统计和错误日志
3. 分析同步状态和性能数据

## 📞 获取帮助

如果遇到问题：

1. 📖 查看 [常见问题文档](FAQ.md)
2. 🔍 搜索 [GitHub Issues](https://github.com/你的用户名/bookmark-manager/issues)
3. 💬 创建新的 Issue 描述问题
4. 📧 联系项目维护者

## 🎉 部署完成

恭喜！你已经成功部署了书签管理系统。现在你可以：

- ✅ 通过 Web 界面管理书签
- ✅ 使用 Chrome 插件自动同步
- ✅ 配置安全设置保护系统
- ✅ 享受现代化的书签管理体验

## ⚡ 性能优化（强烈推荐）

如果你发现 D1 数据库延迟较高，可以启用 KV 缓存来获得 **20-100倍** 的性能提升：

📖 **[5分钟快速设置 KV 缓存](KV_SETUP_GUIDE.md)**

设置后你将获得：
- 🚀 响应时间从几百毫秒降到几十毫秒
- 💰 降低30%的数据库成本
- ✨ 更流畅的用户体验

## 📚 更多文档

- 📖 [KV 缓存快速设置](KV_SETUP_GUIDE.md)
- ⚡ [完整缓存优化指南](CACHE_OPTIMIZATION.md)
- 📡 [API 接口文档](API.md)
- ❓ [常见问题解答](FAQ.md)

记得定期备份数据库，并保持系统更新！
