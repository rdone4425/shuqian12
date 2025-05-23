# 🚀 Cloudflare Pages 部署检查清单

## 📋 部署前检查

### 1. **文件结构验证**
```
bookmark-manager/
├── public/                    ✅ 静态文件目录
│   ├── _routes.json          ✅ API路由配置
│   ├── index.html            ✅ 前台页面
│   ├── admin.html            ✅ 管理后台
│   ├── database.html         ✅ 数据库管理
│   ├── api-test.html         ✅ API测试页面
│   ├── css/                  ✅ 样式文件
│   └── js/                   ✅ JavaScript文件
├── functions/                 ✅ Cloudflare Functions
│   ├── api/                  ✅ API端点
│   │   ├── test.js           ✅ 基础测试API
│   │   ├── check-database.js ✅ 数据库检查
│   │   ├── init-database.js  ✅ 数据库初始化
│   │   └── ...               ✅ 其他API端点
│   └── utils/                ✅ 工具函数
│       └── cors.js           ✅ CORS处理
└── wrangler.toml             ✅ Cloudflare配置
```

### 2. **配置文件检查**

#### ✅ `_routes.json` 配置
```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": ["/api/assets/*"]
}
```

#### ✅ `wrangler.toml` 配置
```toml
name = "bookmark-manager"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "bookmark-db"
database_id = "your-database-id"
```

## 🔧 Cloudflare Pages 设置

### 1. **项目创建**
- [ ] 在Cloudflare Dashboard中创建Pages项目
- [ ] 连接到GitHub仓库
- [ ] 设置构建配置：
  - 构建命令：`echo "No build required"`
  - 构建输出目录：`public`

### 2. **D1数据库绑定**
- [ ] 创建D1数据库实例
- [ ] 在Pages项目设置中绑定D1数据库
- [ ] 变量名设置为：`DB`
- [ ] 确认绑定成功

### 3. **环境变量设置**
- [ ] 如需要，设置其他环境变量
- [ ] 确认所有配置保存

## 🧪 部署后测试

### 1. **基础功能测试**
访问：`https://your-domain.pages.dev/api-test.html`

#### ✅ 测试项目
- [ ] `/api/test` - 基础Functions测试
- [ ] `/api/check-database` - 数据库检查
- [ ] `/api/init-database` - 数据库初始化
- [ ] `/api/stats` - 统计API
- [ ] `/api/bookmarks` - 书签API

### 2. **错误排查**

#### ❌ 如果API返回404
```
原因：Functions未正确部署
解决：
1. 检查functions目录结构
2. 确认_routes.json文件存在
3. 重新部署项目
```

#### ❌ 如果API返回HTML而不是JSON
```
原因：路由配置问题
解决：
1. 检查_routes.json配置
2. 确认API路径正确
3. 验证Functions代码
```

#### ❌ 如果数据库连接失败
```
原因：D1数据库未绑定或配置错误
解决：
1. 检查D1数据库绑定
2. 确认变量名为"DB"
3. 验证数据库ID正确
```

## 🔍 诊断工具

### 1. **浏览器控制台诊断**
```javascript
// 运行完整API诊断
diagnoseAPI()

// 测试单个端点
fetch('/api/test').then(r => r.json()).then(console.log)
```

### 2. **可视化测试页面**
访问：`/api-test.html`
- 自动测试所有API端点
- 显示详细的错误信息
- 提供解决建议

## 📞 常见问题解决

### Q: API返回405错误
**A:** 检查HTTP方法是否正确，确保API支持所使用的方法

### Q: CORS错误
**A:** 已添加CORS处理，如仍有问题请检查浏览器控制台

### Q: 数据库初始化失败
**A:** 确保D1数据库已正确绑定，变量名为"DB"

### Q: Functions部署失败
**A:** 检查代码语法，确保所有import路径正确

## 🎯 成功标志

部署成功的标志：
- ✅ `/api/test` 返回成功响应
- ✅ `/api/check-database` 能正常检查数据库
- ✅ 管理后台能正常访问
- ✅ 数据库管理功能正常工作

## 📝 部署日志

记录每次部署的情况：

```
日期: ____
版本: ____
状态: [ ] 成功 [ ] 失败
问题: ____
解决: ____
```
