/**
 * Components Index
 * 组件索引文件 - 统一管理所有组件的注册
 */

// 组件注册函数
window.registerAdminComponents = function(app) {
  // 基础组件
  app.component('loading-screen', window.LoadingScreen);
  app.component('top-nav', window.TopNav);
  app.component('tab-nav', window.TabNav);
  
  // 功能组件
  app.component('dashboard-tab', window.DashboardTab);
  app.component('database-tab', window.DatabaseTab);
  app.component('bookmarks-tab', window.BookmarksTab);
  app.component('placeholder-tab', window.PlaceholderTab);
  
  // 容器组件
  app.component('tab-content', window.TabContent);
  app.component('admin-app', window.AdminApp);
  
  console.log('✅ 所有管理后台组件已注册完成');
};

// 组件列表（用于调试和文档）
window.AdminComponents = {
  basic: [
    'loading-screen',
    'top-nav', 
    'tab-nav'
  ],
  functional: [
    'dashboard-tab',
    'database-tab',
    'bookmarks-tab',
    'placeholder-tab'
  ],
  container: [
    'tab-content',
    'admin-app'
  ]
};
