/**
 * Admin App Component
 * 管理后台主应用组件
 */

window.AdminApp = {
  template: `
    <div class="app-container">
      <!-- 顶部导航 -->
      <top-nav
        :current-user="currentUser"
        :is-dark="isDark"
        @logout="logout"
        @toggle-theme="toggleTheme"
      ></top-nav>

      <!-- 主要内容 -->
      <main class="main-content">
        <!-- 加载状态 -->
        <loading-screen 
          v-if="isLoading" 
          message="正在验证身份..."
        ></loading-screen>
        
        <!-- 主要内容区域 -->
        <div v-else>
          <!-- 标签页导航 -->
          <tab-nav
            :tabs="tabs"
            :active-tab="activeTab"
            @switch-tab="activeTab = $event"
          ></tab-nav>

          <!-- 标签页内容 -->
          <tab-content
            :active-tab="activeTab"
            :tabs="tabs"
            :system-stats="systemStats"
            :dashboard-loading="dashboardLoading"
            :db-connected="dbConnected"
            :tables-exist="tablesExist"
            :db-loading="dbLoading"
            :db-message="dbMessage"
            :db-message-type="dbMessageType"
            @refresh-dashboard="refreshDashboard"
            @switch-tab="activeTab = $event"
            @check-database="checkDatabase"
            @init-database="initDatabase"
            @export-data="exportData"
            @import-data="importData"
          ></tab-content>
        </div>
      </main>
    </div>
  `,
  props: {
    // 所有需要的 props
    isDark: Boolean,
    currentUser: Object,
    isLoading: Boolean,
    activeTab: String,
    tabs: Array,
    systemStats: Object,
    dashboardLoading: Boolean,
    dbConnected: Boolean,
    tablesExist: Boolean,
    dbLoading: Boolean,
    dbMessage: String,
    dbMessageType: String
  },
  emits: [
    'toggle-theme',
    'logout',
    'refresh-dashboard',
    'check-database',
    'init-database',
    'export-data',
    'import-data'
  ],
  methods: {
    toggleTheme() {
      this.$emit('toggle-theme');
    },
    logout() {
      this.$emit('logout');
    },
    refreshDashboard() {
      this.$emit('refresh-dashboard');
    },
    checkDatabase() {
      this.$emit('check-database');
    },
    initDatabase() {
      this.$emit('init-database');
    },
    exportData() {
      this.$emit('export-data');
    },
    importData(event) {
      this.$emit('import-data', event);
    }
  }
};
