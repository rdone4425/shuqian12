# ⚠️ Turso 数据库状态说明

## 🚧 当前状态

**Turso 数据库功能暂时不可用**，原因是在 Cloudflare Pages 环境中遇到模块兼容性问题：

```
错误: No such module "@libsql/client/web"
```

## 🔍 问题分析

1. **模块依赖问题**: `@libsql/client/web` 模块在 Cloudflare Pages 环境中无法正确加载
2. **构建环境限制**: Cloudflare Pages 的构建和运行环境对某些 npm 包有限制
3. **兼容性问题**: Turso 客户端库与 Cloudflare Workers 运行时的兼容性需要进一步调试

## 💡 解决方案进展

我们正在尝试以下解决方案：

### 方案一：自定义 HTTP 客户端 ✅ 已实现
- 使用 fetch API 直接与 Turso HTTP API 通信
- 避免依赖第三方客户端库
- 当前正在测试中

### 方案二：CDN 导入
- 通过 CDN 动态加载 Turso 客户端
- 避免构建时的模块解析问题

### 方案三：Proxy 方式
- 通过中间代理服务访问 Turso
- 绕过直接客户端连接的限制

## 🎯 当前建议

### 推荐使用 D1 数据库
目前建议继续使用 **Cloudflare D1** 数据库，它：
- ✅ **完全兼容** - 与 Cloudflare Pages 完美集成
- ✅ **性能稳定** - 在 Cloudflare 网络中表现良好
- ✅ **功能完整** - 支持所有书签管理功能
- ✅ **免费额度** - 提供慷慨的免费使用量

### D1 数据库优势
- **无需配置** - 自动绑定，开箱即用
- **全球分布** - 自动在全球边缘节点复制
- **SQLite 兼容** - 标准 SQL 语法
- **实时同步** - 数据变更实时生效

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
