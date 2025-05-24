# 🚀 Turso 数据库设置指南

由于构建环境的限制，Turso 功能在部署后需要手动启用。

## 📋 启用步骤

### 1. 部署完成后
首先确保你的项目已经成功部署到 Cloudflare Pages。

### 2. 配置 Turso 数据库
```bash
# 安装 Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 登录 Turso
turso auth login

# 创建数据库
turso db create bookmark-manager

# 获取数据库 URL
turso db show bookmark-manager --url

# 创建认证令牌
turso db tokens create bookmark-manager
```

### 3. 添加环境变量
在 Cloudflare Pages 项目设置中添加：
- `TURSO_URL`: 数据库连接地址
- `TURSO_AUTH_TOKEN`: 认证令牌

### 4. 启用 Turso 功能
编辑 `functions/utils/database.js` 文件：

```javascript
// 找到这一行：
available: false, // 暂时禁用 Turso 以避免构建错误

// 改为：
available: !!(env.TURSO_URL && env.TURSO_AUTH_TOKEN),
```

### 5. 重新部署
提交更改并重新部署项目。

## ✅ 验证设置

部署完成后：
1. 访问管理后台
2. 进入设置页面
3. 查看数据库设置部分
4. 应该能看到 Turso 数据库状态为"已连接"

## 🔄 数据迁移

启用 Turso 后，你可以：
1. 初始化 Turso 数据库表结构
2. 从 D1 迁移数据到 Turso
3. 切换到 Turso 数据库

## ⚠️ 注意事项

- 确保 Turso 环境变量配置正确
- 建议先在测试环境验证
- 迁移前备份重要数据

---

这种方式可以避免构建时的依赖问题，同时保持功能的完整性。
