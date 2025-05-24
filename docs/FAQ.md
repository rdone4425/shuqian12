# ❓ 常见问题

本文档收集了用户在使用书签管理系统时遇到的常见问题和解决方案。

## 🚀 部署相关

### Q: 部署到 Cloudflare Pages 失败怎么办？

**A: 检查以下几点：**

1. **检查文件结构**
   ```
   确保 _routes.json 文件在根目录
   确保 functions 文件夹结构正确
   ```

2. **检查构建设置**
   ```
   Framework preset: None
   Build command: (留空)
   Build output directory: /
   ```

3. **查看部署日志**
   - 在 Cloudflare Pages 项目中查看 **Deployments** 标签页
   - 点击失败的部署查看详细错误信息

### Q: D1 数据库绑定失败？

**A: 按照以下步骤检查：**

1. **确认数据库已创建**
   ```bash
   wrangler d1 list
   ```

2. **检查绑定配置**
   - 变量名必须是 `DB`（大写）
   - 选择正确的数据库

3. **重新部署**
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

### Q: 访问网站显示 "数据库未绑定" 错误？

**A: 这通常是数据库绑定问题：**

1. 检查 Pages 项目的 Functions 绑定设置
2. 确保变量名是 `DB`
3. 确保选择了正确的 D1 数据库
4. 保存设置后等待重新部署完成

## 🔐 认证和安全

### Q: 忘记管理员密码怎么办？

**A: 可以通过以下方式重置：**

1. **方式一：重新初始化数据库**
   ```bash
   # 注意：这会删除所有数据
   wrangler d1 execute bookmark-manager-db --command "DROP TABLE users;"
   ```
   然后访问网站重新初始化

2. **方式二：通过 Wrangler 重置密码**
   ```bash
   # 查看用户表
   wrangler d1 execute bookmark-manager-db --command "SELECT * FROM users;"
   
   # 删除特定用户（然后可以重新创建）
   wrangler d1 execute bookmark-manager-db --command "DELETE FROM users WHERE username='admin';"
   ```

### Q: 如何更改管理后台访问路径？

**A: 在管理后台设置：**

1. 登录管理后台
2. 进入 **设置** → **安全设置**
3. 设置 **管理路径**，例如 `secret123`
4. 保存后，管理后台只能通过 `/secret123/admin.html` 访问

### Q: 如何禁用登录要求？

**A: 在安全设置中配置：**

1. 进入管理后台 → 设置 → 安全设置
2. 将 **需要登录访问管理后台** 设置为 `false`
3. 保存设置

## 🔌 Chrome 插件

### Q: Chrome 插件无法安装？

**A: 检查以下步骤：**

1. **确保开启开发者模式**
   - 访问 `chrome://extensions/`
   - 开启右上角的 **开发者模式**

2. **检查文件完整性**
   ```
   确保 chrome 文件夹包含：
   - manifest.json
   - background.js
   - popup.html
   - popup.js
   - styles.css
   ```

3. **检查 manifest.json 格式**
   - 确保 JSON 格式正确
   - 检查权限配置

### Q: 插件显示 "API不可用" 错误？

**A: 按照以下步骤排查：**

1. **检查 API 地址格式**
   ```
   正确格式：https://你的域名.pages.dev/api/bookmarks
   错误格式：https://你的域名.pages.dev/admin.html
   ```

2. **测试 API 连接**
   - 在插件设置中点击 **检查 API**
   - 查看返回的错误信息

3. **确认网站已初始化**
   - 访问网站确保数据库已初始化
   - 检查 `/api/system/stats` 是否返回正确数据

### Q: 插件同步状态一直显示 "syncing"？

**A: 这通常是网络或API问题：**

1. **检查网络连接**
   - 确保能正常访问你的网站

2. **查看插件调试信息**
   - 右键点击插件图标 → 检查
   - 查看 Console 标签页的错误信息

3. **重置插件状态**
   - 在插件调试页面点击 **重置状态**
   - 或者重新安装插件

### Q: 书签同步重复怎么办？

**A: 系统有自动去重机制，但如果出现重复：**

1. **检查 URL 格式**
   - 系统按 URL 去重
   - `http://` 和 `https://` 被视为不同 URL

2. **手动清理重复**
   - 在管理后台的书签管理中
   - 搜索重复的书签并删除

3. **重新同步**
   - 删除重复书签后
   - 在插件中点击 **测试同步**

## 🛠️ 功能使用

### Q: 如何批量导入书签？

**A: 目前支持通过 Chrome 插件批量同步：**

1. **使用 Chrome 插件**
   - 安装并配置插件
   - 插件会自动同步所有现有书签

2. **手动导入（开发中）**
   - 未来版本将支持 JSON/HTML 文件导入

### Q: 如何备份书签数据？

**A: 可以通过以下方式备份：**

1. **通过管理后台**
   - 进入 **数据库管理** 标签页
   - 点击 **导出数据** 按钮

2. **通过 Wrangler CLI**
   ```bash
   wrangler d1 execute bookmark-manager-db --command "SELECT * FROM bookmarks;" --output json > backup.json
   ```

### Q: 如何修改每页显示的书签数量？

**A: 在系统设置中配置：**

1. 进入管理后台 → 设置
2. 找到 **每页显示数量** 设置
3. 修改为你想要的数量（建议 10-50）
4. 保存设置

### Q: 如何添加新的书签分类？

**A: 在分类管理中操作：**

1. 进入管理后台 → 分类管理
2. 点击 **添加分类** 按钮
3. 输入分类名称和描述
4. 保存分类

## 🔧 技术问题

### Q: API 返回 500 错误？

**A: 检查以下几点：**

1. **数据库连接**
   - 确保 D1 数据库绑定正确
   - 检查数据库是否已初始化

2. **查看错误日志**
   - 在 Cloudflare Dashboard 中查看 Functions 日志
   - 分析具体的错误信息

3. **重新初始化**
   - 如果数据库损坏，可以重新初始化

### Q: 网站加载缓慢？

**A: 优化建议：**

1. **检查数据量**
   - 如果书签数量过多，考虑分页显示
   - 在设置中减少每页显示数量

2. **清理数据**
   - 删除不需要的书签
   - 清理过期的会话数据

3. **使用 CDN**
   - Cloudflare Pages 自带 CDN 加速
   - 确保静态资源正确缓存

### Q: 如何更新系统到最新版本？

**A: 更新步骤：**

1. **备份数据**
   ```bash
   # 备份数据库
   wrangler d1 execute bookmark-manager-db --command "SELECT * FROM bookmarks;" --output json > backup.json
   ```

2. **更新代码**
   ```bash
   git pull origin main
   git push origin main
   ```

3. **检查兼容性**
   - 查看更新日志
   - 测试主要功能

## 🆘 获取更多帮助

### 在线资源

- 📖 **项目文档**: [README.md](../README.md)
- 🚀 **部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🔧 **API 文档**: 在管理后台查看

### 社区支持

- 🐛 **报告 Bug**: [GitHub Issues](https://github.com/你的用户名/bookmark-manager/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/你的用户名/bookmark-manager/discussions)
- 📧 **联系作者**: 通过 GitHub 私信

### 自助诊断

1. **检查系统状态**
   - 访问管理后台的监控面板
   - 查看系统统计和错误日志

2. **使用调试工具**
   - Chrome 插件的调试页面
   - 浏览器开发者工具

3. **查看日志**
   - Cloudflare Pages 部署日志
   - Functions 执行日志

## 💡 最佳实践

### 安全建议

1. **使用强密码** - 管理员账户使用复杂密码
2. **启用路径保护** - 设置自定义管理路径
3. **定期备份** - 定期备份书签数据
4. **监控访问** - 定期检查登录日志

### 性能优化

1. **合理分页** - 设置适当的每页显示数量
2. **定期清理** - 删除不需要的书签和过期会话
3. **使用分类** - 合理组织书签分类
4. **监控资源** - 关注 Cloudflare 的使用量

### 使用技巧

1. **快速搜索** - 使用关键词快速找到书签
2. **批量操作** - 在管理后台进行批量管理
3. **插件同步** - 让 Chrome 插件自动同步新书签
4. **定期整理** - 定期整理和分类书签

---

如果这个 FAQ 没有解决你的问题，请在 GitHub 上创建 Issue，我们会尽快回复！
