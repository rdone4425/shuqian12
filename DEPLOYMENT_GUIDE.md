# 📚 书签管理系统部署指南

## 🚀 快速部署步骤

### 第1步：准备 D1 数据库

1. **创建 D1 数据库**
   ```bash
   # 在 Cloudflare Dashboard 中创建 D1 数据库
   # 或使用 Wrangler CLI
   wrangler d1 create bookmark-manager
   ```

2. **记录数据库信息**
   - 数据库名称：`bookmark-manager`
   - 数据库 ID：（创建后获得）

### 第2步：部署到 Cloudflare Pages

#### 方法1：GitHub 连接（推荐）
1. 将代码推送到 GitHub 仓库
2. 在 [Cloudflare Pages](https://dash.cloudflare.com/pages) 中点击 "Connect to Git"
3. 选择你的 GitHub 仓库
4. 配置构建设置：
   - **构建命令**：留空
   - **构建输出目录**：`public`
   - **根目录**：`bookmark-manager`（如果代码在子目录中）

#### 方法2：直接上传
1. 压缩 `bookmark-manager/public` 目录中的所有文件
2. 在 Cloudflare Pages 中选择 "Upload assets"
3. 上传压缩文件

### 第3步：配置 Functions

1. **绑定 D1 数据库**
   - 进入 Pages 项目设置
   - 点击 "Functions" 标签页
   - 在 "Bindings" 部分添加：
     - **变量名**：`DB`
     - **类型**：D1 Database
     - **选择数据库**：选择第1步创建的数据库

2. **设置环境变量**（可选）
   - 在 "Environment variables" 部分添加任何需要的变量

### 第4步：初始化数据库

1. **访问你的 Pages 项目**
   ```
   https://your-project-name.pages.dev
   ```

2. **切换到管理标签页**
   - 点击顶部的 "管理" 按钮

3. **初始化数据库**
   - 点击 "数据库" 标签
   - 点击 "初始化数据库" 按钮
   - 等待初始化完成

### 第5步：配置 Chrome 插件

在 Chrome 插件中设置 API 地址：
```
https://your-project-name.pages.dev/api/bookmarks
```

## 🔧 故障排除

### 常见问题

#### 1. wrangler.toml 配置错误
**错误信息**：`wrangler.toml file was found but it does not appear to be valid`

**解决方案**：
- 确保 `wrangler.toml` 包含 `pages_build_output_dir = "public"`
- 或者删除 `wrangler.toml` 文件（Pages 主要通过 Web 界面配置）

#### 2. Functions 部署失败
**错误信息**：`Failed to publish assets`

**解决方案**：
1. 检查 `functions` 目录结构是否正确
2. 确保所有 API 文件语法正确
3. 检查 `_routes.json` 配置

#### 3. 数据库连接失败
**错误信息**：`数据库未绑定` 或 `连接失败`

**解决方案**：
1. 确认已在 Pages 设置中绑定 D1 数据库
2. 变量名必须是 `DB`
3. 重新部署项目

#### 4. API 404 错误
**错误信息**：API 端点返回 404

**解决方案**：
1. 检查 `_routes.json` 配置
2. 确认 `functions/api/` 目录结构正确
3. 重新部署项目

### 调试步骤

1. **检查 API 状态**
   ```
   https://your-project-name.pages.dev/api/status
   ```

2. **测试数据库连接**
   ```
   https://your-project-name.pages.dev/api/test
   ```

3. **查看部署日志**
   - 在 Cloudflare Pages 控制台查看部署日志
   - 检查是否有构建或部署错误

## 📝 部署检查清单

- [ ] D1 数据库已创建
- [ ] 代码已上传到 Cloudflare Pages
- [ ] D1 数据库已绑定到 Pages 项目（变量名：DB）
- [ ] Functions 部署成功
- [ ] `_routes.json` 配置正确
- [ ] 数据库已初始化
- [ ] API 端点可正常访问
- [ ] Chrome 插件 API 地址已配置

## 🎯 验证部署

访问以下 URL 验证部署是否成功：

1. **主页**：`https://your-project-name.pages.dev/`
2. **API 状态**：`https://your-project-name.pages.dev/api/status`
3. **数据库测试**：`https://your-project-name.pages.dev/api/test`

如果所有链接都能正常访问，说明部署成功！🎉

## 📞 获取帮助

如果遇到问题：
1. 检查 Cloudflare Pages 部署日志
2. 查看浏览器开发者工具的控制台错误
3. 参考 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
4. 联系 [Cloudflare 支持](https://cfl.re/3WgEyrH)
