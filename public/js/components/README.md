# 管理后台组件文档

## 📁 组件结构

```
js/components/
├── index.js              # 组件注册索引
├── README.md             # 组件文档
├── admin-app.js          # 主应用容器组件
├── loading-screen.js     # 加载屏幕组件
├── top-nav.js           # 顶部导航组件
├── tab-nav.js           # 标签页导航组件
├── tab-content.js       # 标签页内容容器组件
├── dashboard-tab.js     # 监控面板组件
├── database-tab.js      # 数据库管理组件
├── bookmarks-tab.js     # 书签管理组件
└── placeholder-tab.js   # 占位符组件
```

## 🧩 组件分类

### 基础组件 (Basic Components)
- **loading-screen**: 加载状态显示
- **top-nav**: 顶部导航栏
- **tab-nav**: 标签页导航

### 功能组件 (Functional Components)
- **dashboard-tab**: 系统监控面板
- **database-tab**: 数据库管理
- **bookmarks-tab**: 书签管理
- **placeholder-tab**: 功能开发中占位符

### 容器组件 (Container Components)
- **tab-content**: 标签页内容容器
- **admin-app**: 主应用容器

## 📋 组件详情

### AdminApp (主应用组件)
**文件**: `admin-app.js`
**作用**: 整个管理后台的根组件
**Props**: 
- `isDark`: 暗色主题状态
- `currentUser`: 当前用户信息
- `isLoading`: 加载状态
- `activeTab`: 当前活跃标签页
- `tabs`: 标签页配置
- `systemStats`: 系统统计数据
- 其他数据库相关状态

**Events**:
- `toggle-theme`: 切换主题
- `logout`: 用户登出
- `refresh-dashboard`: 刷新监控面板
- 其他数据库操作事件

### TopNav (顶部导航)
**文件**: `top-nav.js`
**作用**: 显示品牌信息、用户信息和操作按钮
**Props**:
- `currentUser`: 当前用户信息
- `isDark`: 暗色主题状态

**Events**:
- `logout`: 登出事件
- `toggle-theme`: 切换主题事件

### TabNav (标签页导航)
**文件**: `tab-nav.js`
**作用**: 显示标签页导航按钮
**Props**:
- `tabs`: 标签页配置数组
- `activeTab`: 当前活跃标签页ID

**Events**:
- `switch-tab`: 切换标签页事件

### DashboardTab (监控面板)
**文件**: `dashboard-tab.js`
**作用**: 显示系统统计、数据库状态等监控信息
**Props**:
- `systemStats`: 系统统计数据
- `dashboardLoading`: 加载状态
- `dbConnected`: 数据库连接状态
- `tablesExist`: 数据表存在状态

**Events**:
- `refresh-dashboard`: 刷新数据
- `switch-tab`: 切换到其他标签页

### DatabaseTab (数据库管理)
**文件**: `database-tab.js`
**作用**: 数据库操作和状态管理
**Props**:
- `dbConnected`: 数据库连接状态
- `tablesExist`: 数据表存在状态
- `dbLoading`: 操作加载状态
- `dbMessage`: 操作结果消息
- `dbMessageType`: 消息类型

**Events**:
- `check-database`: 检查数据库
- `init-database`: 初始化数据库
- `export-data`: 导出数据
- `import-data`: 导入数据

### BookmarksTab (书签管理)
**文件**: `bookmarks-tab.js`
**作用**: 书签的增删改查操作
**特性**:
- 搜索和过滤功能
- 分页显示
- 添加/编辑模态框
- 分类管理

### PlaceholderTab (占位符)
**文件**: `placeholder-tab.js`
**作用**: 未完成功能的占位显示
**Props**:
- `tabName`: 标签页名称
- `description`: 描述信息

**Events**:
- `switch-tab`: 返回其他标签页

## 🔧 使用方法

### 1. 引入组件文件
```html
<!-- 按顺序引入所有组件文件 -->
<script src="js/components/loading-screen.js"></script>
<script src="js/components/top-nav.js"></script>
<!-- ... 其他组件 -->
<script src="js/components/index.js"></script>
```

### 2. 注册组件
```javascript
// 使用统一注册函数
window.registerAdminComponents(app);
```

### 3. 使用组件
```html
<admin-app
  :is-dark="isDark"
  :current-user="currentUser"
  @toggle-theme="toggleTheme"
  @logout="logout"
></admin-app>
```

## 🎯 设计原则

1. **单一职责**: 每个组件只负责一个特定功能
2. **松耦合**: 组件间通过 props 和 events 通信
3. **可复用**: 组件可以在不同场景中重复使用
4. **可维护**: 清晰的文件结构和命名规范

## 🚀 扩展指南

### 添加新标签页组件
1. 创建新的组件文件 `js/components/new-tab.js`
2. 在 `index.js` 中注册组件
3. 在 `tab-content.js` 中添加条件渲染
4. 在主应用的 `tabs` 配置中添加新标签页

### 修改现有组件
1. 直接编辑对应的组件文件
2. 确保 props 和 events 接口保持兼容
3. 更新相关的 CSS 样式

## 📝 注意事项

- 所有组件都使用 Vue 3 Composition API
- 组件间通信优先使用 props 和 events
- 避免在组件中直接操作 DOM
- 保持组件的纯函数特性
