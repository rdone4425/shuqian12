# 🚀 快速开始指南

这是一个5分钟快速部署书签管理系统的指南。

## 📋 前置要求

- ✅ Cloudflare账户
- ✅ 已安装Node.js
- ✅ 基本的命令行操作知识

## ⚡ 5分钟部署

### 第1步：安装Wrangler CLI
```bash
npm install -g wrangler
```

### 第2步：登录Cloudflare
```bash
wrangler login
```
> 这会打开浏览器，按提示完成登录

### 第3步：创建数据库
```bash
wrangler d1 create bookmark-manager
```
> 📝 记录返回的数据库ID，例如：`database_id = "abc123-def456-ghi789"`

### 第4步：更新配置
编辑 `wrangler.toml` 文件，将 `database_id` 替换为上一步得到的ID：
```toml
[[d1_databases]]
binding = "DB"
database_name = "bookmark-manager"
database_id = "你的数据库ID"  # 替换这里
```

### 第5步：初始化数据库
```bash
cd bookmark-manager
wrangler d1 execute bookmark-manager --file=./schema.sql
```

### 第6步：部署项目
```bash
wrangler pages deploy public --project-name=bookmark-manager
```

### 第7步：配置绑定
1. 访问 https://dash.cloudflare.com/
2. 进入 `Workers & Pages` → `Pages`
3. 找到你的 `bookmark-manager` 项目
4. 进入 `Settings` → `Functions`
5. 在 `D1 database bindings` 部分添加：
   - **变量名**：`DB`
   - **D1数据库**：选择 `bookmark-manager`
6. 点击 `Save`

## 🎉 完成！

现在你可以访问你的书签管理系统了：

- **主页**：`https://bookmark-manager.pages.dev`
- **管理后台**：`https://bookmark-manager.pages.dev/admin.html`
- **API测试**：`https://bookmark-manager.pages.dev/test.html`

## 🔧 快速测试

### 1. 测试API状态
访问：`https://bookmark-manager.pages.dev/api/status`

应该看到类似这样的响应：
```json
{
  "status": "connected",
  "message": "书签管理API服务正常运行",
  "database": "connected"
}
```

### 2. 添加第一个书签
1. 访问管理后台：`https://bookmark-manager.pages.dev/admin.html`
2. 点击 "添加书签" 按钮
3. 填写信息：
   - 标题：`Google`
   - URL：`https://www.google.com`
4. 点击 "保存"

### 3. 查看书签
返回主页：`https://bookmark-manager.pages.dev`
你应该能看到刚才添加的书签。

## 🆘 遇到问题？

### 常见问题快速解决

#### 问题1：数据库连接失败
```bash
# 检查数据库是否存在
wrangler d1 list

# 重新初始化数据库
wrangler d1 execute bookmark-manager --file=./schema.sql
```

#### 问题2：API返回404
```bash
# 重新部署
wrangler pages deploy public --project-name=bookmark-manager
```

#### 问题3：页面显示空白
1. 检查浏览器控制台是否有错误
2. 确认D1数据库绑定配置正确
3. 访问 `/test.html` 测试API接口

### 获取帮助
- 📖 查看完整文档：[README.md](./README.md)
- 🔧 详细部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 🧪 使用API测试页面：`/test.html`

## 🎯 下一步

现在你的书签管理系统已经运行了！你可以：

1. **添加更多书签**：在管理后台批量添加你的书签
2. **创建分类**：组织你的书签，支持主分类和子分类
3. **导入现有书签**：如果你有其他格式的书签，可以转换为JSON格式导入
4. **自定义域名**：在Cloudflare Pages中配置你自己的域名
5. **备份数据**：定期使用导出功能备份你的书签数据

享受你的新书签管理系统吧！ 🎉
