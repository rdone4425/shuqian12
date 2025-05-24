/**
 * Dashboard Tab Component
 * 监控面板标签页组件
 */

window.DashboardTab = {
  template: `
    <div class="tab-panel">
      <div class="panel-header">
        <h2>系统监控面板</h2>
        <button @click="refreshDashboard" class="btn btn-primary" :disabled="dashboardLoading" type="button">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': dashboardLoading }"></i>
          刷新数据
        </button>
      </div>

      <!-- 系统概览卡片 -->
      <div class="dashboard-grid">
        <!-- 系统统计 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3><i class="fas fa-chart-bar"></i> 系统统计</h3>
          </div>
          <div class="card-content">
            <div v-if="systemStats" class="stats-grid">
              <div class="stat-item">
                <div class="stat-number">{{ systemStats.bookmarks_count || 0 }}</div>
                <div class="stat-label">总书签数</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ systemStats.categories_count || 0 }}</div>
                <div class="stat-label">分类数</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ systemStats.domains_count || 0 }}</div>
                <div class="stat-label">域名数</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ systemStats.users_count || 0 }}</div>
                <div class="stat-label">用户数</div>
              </div>
            </div>
            <div v-else class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i> 加载中...
            </div>
          </div>
        </div>

        <!-- 数据库状态 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3><i class="fas fa-database"></i> 数据库状态</h3>
          </div>
          <div class="card-content">
            <div class="status-info">
              <div class="status-item">
                <span class="label">连接状态:</span>
                <span :class="['status', dbConnected ? 'success' : 'error']">
                  {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">表结构:</span>
                <span :class="['status', tablesExist ? 'success' : 'warning']">
                  {{ tablesExist ? '✅ 正常' : '⚠️ 需要初始化' }}
                </span>
              </div>
            </div>
            <div class="card-actions">
              <button @click="$emit('switch-tab', 'database')" class="btn btn-primary btn-sm" type="button">
                <i class="fas fa-database"></i>
                数据库管理
              </button>
            </div>
          </div>
        </div>

        <!-- 最近活动 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3><i class="fas fa-clock"></i> 最近活动</h3>
          </div>
          <div class="card-content">
            <div v-if="systemStats && systemStats.latest_bookmarks" class="recent-activity">
              <div v-for="bookmark in systemStats.latest_bookmarks.slice(0, 3)" :key="bookmark.url" class="activity-item">
                <div class="activity-icon">
                  <i class="fas fa-bookmark"></i>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{{ bookmark.title }}</div>
                  <div class="activity-meta">{{ bookmark.domain }} • {{ formatDate(bookmark.created_at) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i> 加载中...
            </div>
          </div>
        </div>

        <!-- 热门域名 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3><i class="fas fa-globe"></i> 热门域名</h3>
          </div>
          <div class="card-content">
            <div v-if="systemStats && systemStats.top_domains" class="top-domains">
              <div v-for="domain in systemStats.top_domains.slice(0, 5)" :key="domain.domain" class="domain-item">
                <div class="domain-name">{{ domain.domain }}</div>
                <div class="domain-count">{{ domain.count }} 个书签</div>
              </div>
            </div>
            <div v-else class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i> 加载中...
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    systemStats: Object,
    dashboardLoading: Boolean,
    dbConnected: Boolean,
    tablesExist: Boolean
  },
  emits: ['refresh-dashboard', 'switch-tab'],
  methods: {
    refreshDashboard() {
      this.$emit('refresh-dashboard');
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '今天';
      if (diffDays === 2) return '昨天';
      if (diffDays <= 7) return `${diffDays} 天前`;
      return date.toLocaleDateString('zh-CN');
    }
  }
};
