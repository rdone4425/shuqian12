/**
 * Tab Content Component
 * 标签页内容容器组件
 */

window.TabContent = {
  template: `
    <div class="tab-content">
      <!-- 监控面板 -->
      <dashboard-tab 
        v-if="activeTab === 'dashboard'"
        :system-stats="systemStats"
        :dashboard-loading="dashboardLoading"
        :db-connected="dbConnected"
        :tables-exist="tablesExist"
        @refresh-dashboard="$emit('refresh-dashboard')"
        @switch-tab="$emit('switch-tab', $event)"
      ></dashboard-tab>

      <!-- 数据库管理 -->
      <database-tab 
        v-else-if="activeTab === 'database'"
        :db-connected="dbConnected"
        :tables-exist="tablesExist"
        :db-loading="dbLoading"
        :db-message="dbMessage"
        :db-message-type="dbMessageType"
        @check-database="$emit('check-database')"
        @init-database="$emit('init-database')"
        @export-data="$emit('export-data')"
        @import-data="$emit('import-data', $event)"
      ></database-tab>

      <!-- 书签管理 -->
      <bookmarks-tab 
        v-else-if="activeTab === 'bookmarks'"
      ></bookmarks-tab>

      <!-- 其他标签页 -->
      <placeholder-tab 
        v-else
        :tab-name="getTabName(activeTab)"
        @switch-tab="$emit('switch-tab', $event)"
      ></placeholder-tab>
    </div>
  `,
  props: {
    activeTab: String,
    systemStats: Object,
    dashboardLoading: Boolean,
    dbConnected: Boolean,
    tablesExist: Boolean,
    dbLoading: Boolean,
    dbMessage: String,
    dbMessageType: String,
    tabs: Array
  },
  emits: [
    'refresh-dashboard',
    'switch-tab',
    'check-database',
    'init-database',
    'export-data',
    'import-data'
  ],
  methods: {
    getTabName(tabId) {
      const tab = this.tabs.find(t => t.id === tabId);
      return tab ? tab.name : '未知页面';
    }
  }
};
