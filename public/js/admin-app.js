/**
 * 管理后台应用入口
 */

// 创建管理后台应用
function createAdminApp() {
  const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

  return createApp({
    setup() {
      // 标签页配置
      const tabs = [
        { id: 'dashboard', name: '监控面板', icon: 'fas fa-tachometer-alt' },
        { id: 'bookmarks', name: '书签管理', icon: 'fas fa-bookmark' },
        { id: 'categories', name: '分类管理', icon: 'fas fa-folder' },
        { id: 'database', name: '数据库', icon: 'fas fa-database' },
        { id: 'logs', name: '日志', icon: 'fas fa-list-alt' },
        { id: 'api', name: 'API文档', icon: 'fas fa-code' },
        { id: 'settings', name: '设置', icon: 'fas fa-cog' }
      ];

      // 当前活动标签页
      const activeTab = ref('dashboard');

      // 书签管理相关状态
      const bookmarkState = reactive({
        items: [],
        loading: false,
        currentPage: 1,
        totalPages: 1,
        search: '',
        domainFilter: '',
        categoryFilter: ''
      });

      // 分类管理相关状态
      const categoryState = reactive({
        items: [],
        loading: false
      });

      // 数据库管理相关状态
      const databaseState = reactive({
        status: { connected: false, error: null },
        loading: false,
        tables: { loading: false, data: null, error: null }
      });

      // 监控面板相关状态
      const dashboardState = reactive({
        data: {
          systemStats: null,
          performanceData: null,
          recentLogs: [],
          syncHistory: []
        },
        loading: false,
        lastUpdateTime: null
      });

      // 其他状态
      const otherState = reactive({
        domains: [],
        adminStats: { bookmarks: 0, domains: 0, categories: 0 },
        logs: [],
        logsLoading: false,
        logCurrentPage: 1,
        logTotalPages: 1,
        logTypeFilter: '',
        logTimeFilter: '',
        expandedLogs: [],
        apiTesting: false,
        apiTestResult: null,
        apiBaseUrl: window.location.origin,
        showAddBookmark: false,
        showAddCategory: false
      });

      // 设置相关状态
      const settingsState = reactive({
        itemsPerPage: 20,
        userProfile: {
          username: '',
          email: '',
          currentPassword: '',
          newPassword: ''
        },
        profileLoading: false,
        securitySettings: {
          require_login: 'false',
          session_timeout: '86400'
        },
        securityLoading: false
      });

      // 计算属性
      const sessionTimeoutHours = computed({
        get: () => Math.floor(parseInt(settingsState.securitySettings.session_timeout) / 3600),
        set: (hours) => {
          settingsState.securitySettings.session_timeout = (hours * 3600).toString();
        }
      });

      // 加载监控面板数据
      const loadDashboard = async () => {
        dashboardState.loading = true;
        try {
          const [statsResponse, logsResponse] = await Promise.all([
            fetch('/api/system/stats'),
            fetch('/api/system/logs?limit=5')
          ]);

          const statsData = await statsResponse.json();
          const logsData = await logsResponse.json();

          if (statsData.success) {
            dashboardState.data.systemStats = statsData.stats || statsData.data;
          }

          if (logsData.success) {
            dashboardState.data.recentLogs = logsData.logs || logsData.data || [];
          }

          dashboardState.lastUpdateTime = new Date().toLocaleTimeString();
        } catch (error) {
          console.error('加载监控面板数据失败:', error);
        } finally {
          dashboardState.loading = false;
        }
      };

      // 生命周期钩子
      onMounted(async () => {
        // 静默检查数据库状态
        if (window.AdminMethods?.checkDatabaseSilently) {
          await window.AdminMethods.checkDatabaseSilently(databaseState.status);
        }
        
        // 加载初始数据
        if (activeTab.value === 'dashboard') {
          await loadDashboard();
        }
      });

      // 监听标签页变化
      watch(activeTab, async (newTab) => {
        if (newTab === 'dashboard') {
          await loadDashboard();
        } else if (newTab === 'bookmarks' && window.AdminMethods) {
          await window.AdminMethods.loadAdminBookmarks(
            bookmarkState.loading, bookmarkState.items, bookmarkState.currentPage,
            bookmarkState.totalPages, bookmarkState.domainFilter, 
            bookmarkState.categoryFilter, bookmarkState.search
          );
          await window.AdminMethods.loadCategories(categoryState.loading, categoryState.items);
          await window.AdminMethods.loadDomains(otherState.domains);
        } else if (newTab === 'categories' && window.AdminMethods) {
          await window.AdminMethods.loadCategories(categoryState.loading, categoryState.items);
        } else if (newTab === 'settings' && window.AdminMethods) {
          await window.AdminMethods.loadAdminStats(otherState.adminStats);
        }
      });

      // 返回所有状态和方法
      return {
        // 基础数据
        tabs,
        activeTab,
        
        // 状态对象
        bookmarkState,
        categoryState,
        databaseState,
        dashboardState,
        otherState,
        settingsState,
        
        // 计算属性
        sessionTimeoutHours,
        
        // 方法
        loadDashboard,
        
        // 工具方法（如果存在）
        ...(window.AdminMethods || {}),
        ...(window.AdminUtils || {})
      };
    },

    // 模板
    template: `
      <div class="admin-container">
        <!-- 标签页导航 -->
        <div class="admin-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['tab-btn', { active: activeTab === tab.id }]"
          >
            <i :class="tab.icon"></i>
            {{ tab.name }}
          </button>
        </div>

        <!-- 标签页内容 -->
        <div class="tab-content">
          <!-- 监控面板 -->
          <div v-if="activeTab === 'dashboard'" class="dashboard-view">
            <div class="dashboard-actions">
              <button @click="loadDashboard" class="btn btn-primary" :disabled="dashboardState.loading">
                <i class="fas fa-sync" :class="{ 'fa-spin': dashboardState.loading }"></i>
                刷新数据
              </button>
              <span v-if="dashboardState.lastUpdateTime" class="last-update">
                最后更新: {{ dashboardState.lastUpdateTime }}
              </span>
            </div>
            
            <div v-if="dashboardState.loading" class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i>
              正在加载监控数据...
            </div>
            
            <div v-else class="dashboard-grid">
              <!-- 系统统计 -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3><i class="fas fa-chart-bar"></i> 系统统计</h3>
                </div>
                <div class="card-content">
                  <div class="stats-grid">
                    <div class="stat-item">
                      <div class="stat-number">{{ dashboardState.data.systemStats?.bookmarks_count || 0 }}</div>
                      <div class="stat-label">书签总数</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-number">{{ dashboardState.data.systemStats?.domains_count || 0 }}</div>
                      <div class="stat-label">域名数量</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-number">{{ dashboardState.data.systemStats?.categories_count || 0 }}</div>
                      <div class="stat-label">分类数量</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-number">{{ dashboardState.data.systemStats?.users_count || 0 }}</div>
                      <div class="stat-label">用户数量</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 最近日志 -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3><i class="fas fa-list-alt"></i> 最近日志</h3>
                </div>
                <div class="card-content">
                  <div v-if="dashboardState.data.recentLogs.length === 0" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    暂无日志记录
                  </div>
                  <div v-else class="recent-logs">
                    <div v-for="log in dashboardState.data.recentLogs" :key="log.id" class="log-item">
                      <span class="log-time">{{ formatDateTime(log.created_at) }}</span>
                      <span class="log-level" :class="'level-' + log.level">{{ getLogLevelText(log.level) }}</span>
                      <span class="log-message">{{ log.message }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 其他标签页内容 -->
          <div v-else class="tab-placeholder">
            <i class="fas fa-cog fa-spin"></i>
            <p>{{ tabs.find(t => t.id === activeTab)?.name }} 功能正在开发中...</p>
          </div>
        </div>
      </div>
    `
  });
}

// 导出到全局
window.createAdminApp = createAdminApp;
