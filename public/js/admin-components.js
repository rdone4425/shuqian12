/**
 * 管理后台 Vue.js 组件
 */

// 管理视图组件
const AdminView = {
  template: `
    <div>
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
        <div v-if="activeTab === 'dashboard'" class="tab-panel">
          <div class="panel-header">
            <h2>系统监控面板</h2>
            <div class="dashboard-actions">
              <button @click="refreshDashboard" class="btn btn-primary" :disabled="dashboardLoading">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': dashboardLoading }"></i>
                刷新数据
              </button>
              <span v-if="lastUpdateTime" class="last-update">
                最后更新: {{ formatDateTime(lastUpdateTime) }}
              </span>
            </div>
          </div>

          <!-- 系统概览卡片 -->
          <div class="dashboard-grid">
            <!-- 系统统计 -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3><i class="fas fa-chart-bar"></i> 系统统计</h3>
              </div>
              <div class="card-content">
                <div v-if="dashboardData.systemStats" class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-number">{{ dashboardData.systemStats.total_bookmarks || 0 }}</div>
                    <div class="stat-label">总书签数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ dashboardData.systemStats.total_categories || 0 }}</div>
                    <div class="stat-label">分类数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ dashboardData.systemStats.total_domains || 0 }}</div>
                    <div class="stat-label">域名数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ dashboardData.systemStats.today_added || 0 }}</div>
                    <div class="stat-label">今日新增</div>
                  </div>
                </div>
                <div v-else class="loading-placeholder">
                  <i class="fas fa-spinner fa-spin"></i> 加载中...
                </div>
              </div>
            </div>

            <!-- 性能监控 -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3><i class="fas fa-tachometer-alt"></i> 性能监控</h3>
              </div>
              <div class="card-content">
                <div v-if="dashboardData.performanceData" class="performance-info">
                  <div class="performance-item">
                    <span class="label">数据库状态:</span>
                    <span :class="['status', dashboardData.performanceData.database_available ? 'online' : 'offline']">
                      {{ dashboardData.performanceData.database_available ? '在线' : '离线' }}
                    </span>
                  </div>
                  <div class="performance-item">
                    <span class="label">平均响应时间:</span>
                    <span class="value">{{ dashboardData.performanceData.average_response_time_ms }}ms</span>
                  </div>
                  <div class="performance-item">
                    <span class="label">性能评级:</span>
                    <span :class="['grade', getGradeClass(dashboardData.performanceData.performance_grade)]">
                      {{ dashboardData.performanceData.performance_grade }}
                    </span>
                  </div>
                  <div class="performance-item">
                    <span class="label">成功率:</span>
                    <span class="value">{{ dashboardData.performanceData.success_rate }}</span>
                  </div>
                </div>
                <div v-else class="loading-placeholder">
                  <i class="fas fa-spinner fa-spin"></i> 加载中...
                </div>
              </div>
            </div>

            <!-- 最近日志 -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3><i class="fas fa-list-alt"></i> 最近日志</h3>
                <button @click="activeTab = 'logs'" class="btn-sm btn-outline">查看全部</button>
              </div>
              <div class="card-content">
                <div v-if="dashboardData.recentLogs.length > 0" class="recent-logs">
                  <div v-for="log in dashboardData.recentLogs.slice(0, 5)" :key="log.id" class="log-item">
                    <div class="log-time">{{ formatDateTime(log.created_at) }}</div>
                    <div :class="['log-level', 'level-' + log.level]">{{ getLogLevelText(log.level) }}</div>
                    <div class="log-message">{{ log.message }}</div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="fas fa-inbox"></i>
                  <p>暂无日志记录</p>
                </div>
              </div>
            </div>

            <!-- 同步历史 -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3><i class="fas fa-sync-alt"></i> 同步历史</h3>
              </div>
              <div class="card-content">
                <div v-if="dashboardData.syncHistory.length > 0" class="sync-history">
                  <div v-for="sync in dashboardData.syncHistory.slice(0, 5)" :key="sync.id" class="sync-item">
                    <div class="sync-time">{{ formatDateTime(sync.created_at) }}</div>
                    <div :class="['sync-status', sync.level === 'success' ? 'success' : 'error']">
                      <i :class="sync.level === 'success' ? 'fas fa-check' : 'fas fa-times'"></i>
                      {{ sync.message }}
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="fas fa-sync-alt"></i>
                  <p>暂无同步记录</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 书签管理 -->
        <div v-if="activeTab === 'bookmarks'" class="tab-panel">
          <div class="panel-header">
            <h2>书签管理</h2>
            <button @click="showAddBookmark = true" class="btn btn-primary">
              <i class="fas fa-plus"></i>
              添加书签
            </button>
          </div>

          <div class="admin-toolbar">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                v-model="bookmarkSearch"
                type="text"
                placeholder="搜索书签..."
                class="search-input"
                @input="debouncedBookmarkSearch"
              >
            </div>
            <div class="filters">
              <select v-model="bookmarkDomainFilter" @change="loadAdminBookmarks" class="filter-select">
                <option value="">所有域名</option>
                <option v-for="domain in domains" :key="domain" :value="domain">
                  {{ domain }}
                </option>
              </select>
              <select v-model="bookmarkCategoryFilter" @change="loadAdminBookmarks" class="filter-select">
                <option value="">所有分类</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>域名</th>
                  <th>分类</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="adminLoading">
                  <td colspan="5" class="loading-cell">
                    <i class="fas fa-spinner fa-spin"></i>
                    加载中...
                  </td>
                </tr>
                <tr v-else-if="!dbStatus.tablesExist">
                  <td colspan="5" class="empty-cell">
                    <div style="text-align: center; padding: 20px;">
                      <i class="fas fa-database" style="font-size: 2rem; color: #ffa500; margin-bottom: 10px;"></i>
                      <p style="margin: 0; color: #666;">数据库尚未初始化</p>
                      <p style="margin: 5px 0 15px 0; font-size: 0.875rem; color: #999;">请先到"数据库"标签页初始化数据库</p>
                      <button @click="activeTab = 'database'" class="btn btn-primary btn-sm">
                        <i class="fas fa-arrow-right"></i>
                        前往初始化
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="adminBookmarks.length === 0">
                  <td colspan="5" class="empty-cell">暂无数据</td>
                </tr>
                <tr v-else v-for="bookmark in adminBookmarks" :key="bookmark.id">
                  <td>
                    <div class="bookmark-title-cell">
                      <img
                        :src="getIconUrl(bookmark)"
                        :alt="bookmark.title"
                        class="table-icon"
                        @error="handleIconError"
                      >
                      <span>{{ bookmark.title }}</span>
                    </div>
                  </td>
                  <td>{{ bookmark.domain }}</td>
                  <td>{{ getCategoryName(bookmark.category_id) }}</td>
                  <td>{{ formatDate(bookmark.created_at) }}</td>
                  <td>
                    <div class="actions">
                      <button @click="editBookmark(bookmark)" class="btn-sm btn-edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteBookmark(bookmark.id)" class="btn-sm btn-delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <div v-if="adminTotalPages > 1" class="pagination">
            <button
              @click="prevAdminPage"
              :disabled="adminCurrentPage <= 1"
              class="page-btn"
            >
              <i class="fas fa-chevron-left"></i>
              上一页
            </button>
            <span class="page-info">第 {{ adminCurrentPage }} 页，共 {{ adminTotalPages }} 页</span>
            <button
              @click="nextAdminPage"
              :disabled="adminCurrentPage >= adminTotalPages"
              class="page-btn"
            >
              下一页
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- 分类管理 -->
        <div v-if="activeTab === 'categories'" class="tab-panel">
          <div class="panel-header">
            <h2>分类管理</h2>
            <button @click="showAddCategory = true" class="btn btn-primary">
              <i class="fas fa-plus"></i>
              添加分类
            </button>
          </div>

          <div class="table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>分类名称</th>
                  <th>父分类</th>
                  <th>书签数量</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="categoriesLoading">
                  <td colspan="5" class="loading-cell">
                    <i class="fas fa-spinner fa-spin"></i>
                    加载中...
                  </td>
                </tr>
                <tr v-else-if="!dbStatus.tablesExist">
                  <td colspan="5" class="empty-cell">
                    <div style="text-align: center; padding: 20px;">
                      <i class="fas fa-database" style="font-size: 2rem; color: #ffa500; margin-bottom: 10px;"></i>
                      <p style="margin: 0; color: #666;">数据库尚未初始化</p>
                      <p style="margin: 5px 0 15px 0; font-size: 0.875rem; color: #999;">请先到"数据库"标签页初始化数据库</p>
                      <button @click="activeTab = 'database'" class="btn btn-primary btn-sm">
                        <i class="fas fa-arrow-right"></i>
                        前往初始化
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="categories.length === 0">
                  <td colspan="5" class="empty-cell">暂无数据</td>
                </tr>
                <tr v-else v-for="category in categories" :key="category.id">
                  <td>{{ category.name }}</td>
                  <td>{{ getParentCategoryName(category.parent_id) }}</td>
                  <td>{{ category.bookmark_count || 0 }}</td>
                  <td>{{ formatDate(category.created_at) }}</td>
                  <td>
                    <div class="actions">
                      <button @click="editCategory(category)" class="btn-sm btn-edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteCategory(category.id)" class="btn-sm btn-delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 数据库管理 -->
        <div v-if="activeTab === 'database'" class="tab-panel">
          <div class="panel-header">
            <h2>数据库管理</h2>
          </div>

          <div class="database-cards">
            <div class="db-card">
              <h3><i class="fas fa-search"></i> 数据库检查</h3>
              <p>检查D1数据库绑定状态和表结构完整性</p>
              <button @click="checkDatabase" class="btn btn-primary" :disabled="dbLoading">
                <i class="fas fa-search"></i>
                检查数据库
              </button>
            </div>

            <div class="db-card">
              <h3><i class="fas fa-magic"></i> 数据库初始化</h3>
              <p>创建书签系统所需的所有数据表和索引</p>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button @click="initDatabase" class="btn btn-success" :disabled="dbLoading">
                  <i class="fas fa-play"></i>
                  标准初始化
                </button>
                <button @click="initDatabaseSimple" class="btn btn-info" :disabled="dbLoading">
                  <i class="fas fa-rocket"></i>
                  简化初始化
                </button>
              </div>
            </div>

            <div class="db-card">
              <h3><i class="fas fa-sync-alt"></i> 数据库升级</h3>
              <p>升级现有数据库结构到最新版本</p>
              <button @click="upgradeDatabase" class="btn btn-warning" :disabled="dbLoading">
                <i class="fas fa-sync-alt"></i>
                升级数据库
              </button>
            </div>

            <div class="db-card">
              <h3><i class="fas fa-download"></i> 数据导出</h3>
              <p>导出所有书签数据为JSON格式</p>
              <button @click="exportData" class="btn btn-info" :disabled="dbLoading">
                <i class="fas fa-download"></i>
                导出数据
              </button>
            </div>

            <div class="db-card">
              <h3><i class="fas fa-upload"></i> 数据导入</h3>
              <p>从JSON文件导入书签数据</p>
              <input
                type="file"
                ref="fileInput"
                @change="importData"
                accept=".json"
                style="display: none"
              >
              <button @click="$refs.fileInput.click()" class="btn btn-warning" :disabled="dbLoading">
                <i class="fas fa-upload"></i>
                导入数据
              </button>
            </div>
          </div>

          <!-- 数据库状态 -->
          <div class="db-status">
            <h3>数据库状态</h3>
            <div class="status-info">
              <div class="status-item">
                <span class="label">连接状态:</span>
                <span :class="['status', dbStatus.connected ? 'success' : 'error']">
                  {{ dbStatus.connected ? '✅ 已连接' : '❌ 未连接' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">表结构:</span>
                <span :class="['status', dbStatus.tablesExist ? 'success' : 'warning']">
                  {{ dbStatus.tablesExist ? '✅ 正常' : '⚠️ 需要初始化' }}
                </span>
              </div>
              <div v-if="dbStatus.health" class="status-item">
                <span class="label">健康状态:</span>
                <span :class="['status', dbStatus.health === 'healthy' ? 'success' : dbStatus.health === 'warning' ? 'warning' : 'error']">
                  {{ dbStatus.message }} ({{ dbStatus.percentage }}%)
                </span>
              </div>
            </div>

            <!-- 快速操作按钮 -->
            <div class="db-quick-actions" style="margin-top: 16px;">
              <button
                @click="checkDatabase"
                class="btn btn-info btn-sm"
                :disabled="dbLoading"
                style="margin-right: 8px;"
              >
                <i class="fas fa-sync" :class="{ 'fa-spin': dbLoading }"></i>
                {{ dbLoading ? '检查中...' : '重新检查' }}
              </button>

              <button
                v-if="!dbStatus.tablesExist"
                @click="initDatabase"
                class="btn btn-success btn-sm"
                :disabled="dbLoading"
              >
                <i class="fas fa-magic"></i>
                快速初始化
              </button>
            </div>
          </div>
        </div>

        <!-- 日志管理 -->
        <div v-if="activeTab === 'logs'" class="tab-panel">
          <div class="panel-header">
            <h2>系统日志</h2>
            <div class="log-actions">
              <button @click="refreshLogs" class="btn btn-info" :disabled="logsLoading">
                <i class="fas fa-sync" :class="{ 'fa-spin': logsLoading }"></i>
                刷新日志
              </button>
              <button @click="clearLogs" class="btn btn-warning">
                <i class="fas fa-trash"></i>
                清空日志
              </button>
            </div>
          </div>

          <!-- 日志筛选 -->
          <div class="log-filters">
            <div class="filter-group">
              <label>日志类型:</label>
              <select v-model="logTypeFilter" @change="loadLogs" class="filter-select">
                <option value="">全部</option>
                <option value="sync">同步日志</option>
                <option value="database">数据库操作</option>
                <option value="api">API调用</option>
                <option value="error">错误日志</option>
                <option value="system">系统日志</option>
              </select>
            </div>
            <div class="filter-group">
              <label>时间范围:</label>
              <select v-model="logTimeFilter" @change="loadLogs" class="filter-select">
                <option value="">全部</option>
                <option value="today">今天</option>
                <option value="week">最近7天</option>
                <option value="month">最近30天</option>
              </select>
            </div>
          </div>

          <!-- 日志列表 -->
          <div class="log-container">
            <div v-if="logsLoading" class="loading-cell">
              <i class="fas fa-spinner fa-spin"></i>
              加载日志中...
            </div>

            <div v-else-if="logs.length === 0" class="empty-cell">
              <i class="fas fa-file-alt" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
              <p>暂无日志记录</p>
            </div>

            <div v-else class="log-list">
              <div
                v-for="log in logs"
                :key="log.id"
                :class="['log-item', 'log-' + log.level]"
              >
                <div class="log-header">
                  <span class="log-time">{{ formatDateTime(log.created_at) }}</span>
                  <span :class="['log-level', 'level-' + log.level]">
                    <i :class="getLogIcon(log.level)"></i>
                    {{ getLogLevelText(log.level) }}
                  </span>
                  <span class="log-type">{{ log.type || '系统' }}</span>
                </div>
                <div class="log-content">
                  <div class="log-message">{{ log.message }}</div>
                  <div v-if="log.details" class="log-details">
                    <button
                      @click="toggleLogDetails(log.id)"
                      class="btn-sm btn-info"
                      style="margin-top: 8px;"
                    >
                      <i class="fas fa-info-circle"></i>
                      {{ expandedLogs.includes(log.id) ? '收起详情' : '查看详情' }}
                    </button>
                    <div v-if="expandedLogs.includes(log.id)" class="log-details-content">
                      <pre>{{ formatLogDetails(log.details) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 日志分页 -->
            <div v-if="logTotalPages > 1" class="pagination">
              <button
                @click="prevLogPage"
                :disabled="logCurrentPage <= 1"
                class="page-btn"
              >
                <i class="fas fa-chevron-left"></i>
                上一页
              </button>
              <span class="page-info">第 {{ logCurrentPage }} 页，共 {{ logTotalPages }} 页</span>
              <button
                @click="nextLogPage"
                :disabled="logCurrentPage >= logTotalPages"
                class="page-btn"
              >
                下一页
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- API文档 -->
        <div v-if="activeTab === 'api'" class="tab-panel">
          <div class="panel-header">
            <h2>API文档</h2>
            <div class="api-actions">
              <button @click="copyApiUrl" class="btn btn-info">
                <i class="fas fa-copy"></i>
                复制基础URL
              </button>
              <button @click="testApiConnection" class="btn btn-success" :disabled="apiTesting">
                <i class="fas fa-plug" :class="{ 'fa-spin': apiTesting }"></i>
                测试连接
              </button>
            </div>
          </div>

          <!-- API基础信息 -->
          <div class="api-info-card">
            <h3><i class="fas fa-info-circle"></i> 基础信息</h3>
            <div class="api-base-info">
              <div class="info-item">
                <span class="label">基础URL:</span>
                <code class="api-url">{{ apiBaseUrl }}</code>
              </div>
              <div class="info-item">
                <span class="label">Chrome插件API:</span>
                <code class="api-url">{{ apiBaseUrl }}/api/bookmarks</code>
              </div>
              <div class="info-item">
                <span class="label">调试端点:</span>
                <code class="api-url">{{ apiBaseUrl }}/api/debug</code>
              </div>
              <div class="info-item">
                <span class="label">书签测试:</span>
                <code class="api-url">{{ apiBaseUrl }}/api/test-bookmark</code>
              </div>
              <div class="info-item">
                <span class="label">认证方式:</span>
                <span class="value">无需认证（公开API）</span>
              </div>
              <div class="info-item">
                <span class="label">数据格式:</span>
                <span class="value">JSON</span>
              </div>
            </div>
          </div>

          <!-- Chrome插件故障排除 -->
          <div class="api-info-card">
            <h3><i class="fas fa-exclamation-triangle"></i> Chrome插件故障排除</h3>
            <div class="troubleshooting-steps">
              <div class="step">
                <h4>1. 检查API地址配置</h4>
                <p>确保Chrome插件中的API地址设置为：<code>{{ apiBaseUrl }}/api/bookmarks</code></p>
              </div>
              <div class="step">
                <h4>2. 测试API连接</h4>
                <p>点击上方的"测试连接"按钮，确认API服务正常</p>
              </div>
              <div class="step">
                <h4>3. 检查数据库状态</h4>
                <p>前往"数据库"标签页，确认数据库已正确初始化</p>
              </div>
              <div class="step">
                <h4>4. 使用调试端点</h4>
                <p>访问 <code>{{ apiBaseUrl }}/api/debug</code> 查看详细的请求信息</p>
                <p>或使用 <code>{{ apiBaseUrl }}/api/test-bookmark</code> 专门测试书签数据</p>
              </div>
              <div class="step">
                <h4>5. 常见错误码</h4>
                <ul>
                  <li><strong>400 Bad Request:</strong> 请求数据格式错误，检查JSON格式</li>
                  <li><strong>409 Conflict:</strong> 书签URL已存在</li>
                  <li><strong>500 Server Error:</strong> 服务器错误，检查数据库连接</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- API端点列表 -->
          <div class="api-endpoints">
            <div v-for="category in apiCategories" :key="category.name" class="api-category">
              <h3 class="category-title">
                <i :class="category.icon"></i>
                {{ category.name }}
              </h3>
              <div class="endpoints-list">
                <div v-for="endpoint in category.endpoints" :key="endpoint.path" class="endpoint-card">
                  <div class="endpoint-header">
                    <span :class="['method', 'method-' + endpoint.method.toLowerCase()]">
                      {{ endpoint.method }}
                    </span>
                    <code class="endpoint-path">{{ endpoint.path }}</code>
                    <button @click="testEndpoint(endpoint)" class="btn-sm btn-info test-btn">
                      <i class="fas fa-play"></i>
                      测试
                    </button>
                  </div>
                  <div class="endpoint-description">{{ endpoint.description }}</div>
                  <div v-if="endpoint.params && endpoint.params.length > 0" class="endpoint-params">
                    <h5>参数:</h5>
                    <ul>
                      <li v-for="param in endpoint.params" :key="param.name">
                        <code>{{ param.name }}</code>
                        <span class="param-type">({{ param.type }})</span>
                        <span v-if="param.required" class="param-required">必需</span>
                        - {{ param.description }}
                      </li>
                    </ul>
                  </div>
                  <div v-if="endpoint.example" class="endpoint-example">
                    <h5>示例:</h5>
                    <pre><code>{{ endpoint.example }}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- API测试结果 -->
          <div v-if="apiTestResult" class="api-test-result">
            <h3>测试结果</h3>
            <div :class="['test-result', apiTestResult.success ? 'success' : 'error']">
              <div class="result-header">
                <span class="status">{{ apiTestResult.status }}</span>
                <span class="url">{{ apiTestResult.url }}</span>
              </div>
              <pre class="result-body">{{ JSON.stringify(apiTestResult.data, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- 设置 -->
        <div v-if="activeTab === 'settings'" class="tab-panel">
          <div class="panel-header">
            <h2>系统设置</h2>
          </div>

          <div class="settings-cards">
            <!-- 账户管理 -->
            <div class="settings-card">
              <h3><i class="fas fa-user-cog"></i> 账户管理</h3>
              <div class="form-group">
                <label>用户名</label>
                <input
                  v-model="userProfile.username"
                  type="text"
                  placeholder="输入新用户名"
                  :disabled="profileLoading"
                >
              </div>
              <div class="form-group">
                <label>邮箱</label>
                <input
                  v-model="userProfile.email"
                  type="email"
                  placeholder="输入邮箱地址"
                  :disabled="profileLoading"
                >
              </div>
              <div class="form-group">
                <label>当前密码</label>
                <input
                  v-model="userProfile.currentPassword"
                  type="password"
                  placeholder="输入当前密码"
                  :disabled="profileLoading"
                >
              </div>
              <div class="form-group">
                <label>新密码</label>
                <input
                  v-model="userProfile.newPassword"
                  type="password"
                  placeholder="输入新密码（不修改请留空）"
                  :disabled="profileLoading"
                >
              </div>
              <button @click="updateProfile" class="btn btn-primary" :disabled="profileLoading">
                <i class="fas fa-save" :class="{ 'fa-spin': profileLoading }"></i>
                {{ profileLoading ? '保存中...' : '保存账户信息' }}
              </button>
            </div>

            <!-- 安全设置 -->
            <div class="settings-card">
              <h3><i class="fas fa-shield-alt"></i> 安全设置</h3>

              <!-- 管理后台路径 -->
              <div class="form-group">
                <label>管理后台路径</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input
                    v-model="securitySettings.admin_path"
                    type="text"
                    placeholder="自定义管理路径（留空使用默认）"
                    :disabled="securityLoading"
                  >
                  <button @click="generateAdminPath" class="btn btn-info btn-sm" :disabled="securityLoading">
                    <i class="fas fa-random"></i>
                    随机生成
                  </button>
                </div>
                <small style="color: #666; font-size: 0.875rem;">
                  设置后管理后台将通过 /路径/admin.html 访问
                </small>
              </div>

              <!-- 首页路径保护 -->
              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input
                    v-model="securitySettings.enable_home_path"
                    type="checkbox"
                    :true-value="'true'"
                    :false-value="'false'"
                    :disabled="securityLoading"
                  >
                  启用首页路径保护
                </label>
              </div>

              <div v-if="securitySettings.enable_home_path === 'true'" class="form-group">
                <label>首页访问路径</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input
                    v-model="securitySettings.home_path"
                    type="text"
                    placeholder="自定义首页路径"
                    :disabled="securityLoading"
                  >
                  <button @click="generateHomePath" class="btn btn-info btn-sm" :disabled="securityLoading">
                    <i class="fas fa-random"></i>
                    随机生成
                  </button>
                </div>
                <small style="color: #666; font-size: 0.875rem;">
                  设置后首页将通过 /路径/ 访问，原首页将显示404
                </small>
              </div>

              <!-- 登录要求 -->
              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input
                    v-model="securitySettings.require_login"
                    type="checkbox"
                    :true-value="'true'"
                    :false-value="'false'"
                    :disabled="securityLoading"
                  >
                  需要登录访问管理后台
                </label>
              </div>

              <!-- 会话超时 -->
              <div class="form-group">
                <label>会话超时时间（小时）</label>
                <select v-model="sessionTimeoutHours" :disabled="securityLoading">
                  <option value="1">1小时</option>
                  <option value="6">6小时</option>
                  <option value="12">12小时</option>
                  <option value="24">24小时</option>
                  <option value="72">3天</option>
                  <option value="168">7天</option>
                </select>
              </div>

              <button @click="saveSecuritySettings" class="btn btn-primary" :disabled="securityLoading">
                <i class="fas fa-save" :class="{ 'fa-spin': securityLoading }"></i>
                {{ securityLoading ? '保存中...' : '保存安全设置' }}
              </button>

              <button @click="testPaths" class="btn btn-info" :disabled="securityLoading">
                <i class="fas fa-link"></i>
                测试路径
              </button>

              <button @click="checkPathProtection" class="btn btn-warning" :disabled="securityLoading">
                <i class="fas fa-bug"></i>
                检查路径保护状态
              </button>

              <button @click="checkDatabaseStatus" class="btn btn-secondary" :disabled="securityLoading">
                <i class="fas fa-database"></i>
                检查数据库状态
              </button>
            </div>

            <!-- 显示设置 -->
            <div class="settings-card">
              <h3><i class="fas fa-display"></i> 显示设置</h3>
              <div class="form-group">
                <label>每页显示数量</label>
                <select v-model="settings.itemsPerPage">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              <button @click="saveSettings" class="btn btn-primary">
                <i class="fas fa-save"></i>
                保存设置
              </button>
            </div>

            <!-- 统计信息 -->
            <div class="settings-card">
              <h3><i class="fas fa-chart-bar"></i> 统计信息</h3>
              <div class="stats-list">
                <div class="stat-item">
                  <span class="label">书签总数:</span>
                  <span class="value">{{ adminStats.bookmarks || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">域名总数:</span>
                  <span class="value">{{ adminStats.domains || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">分类总数:</span>
                  <span class="value">{{ adminStats.categories || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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

    // 响应式数据
    const activeTab = ref('dashboard');

    // 书签管理相关
    const adminBookmarks = ref([]);
    const adminLoading = ref(false);
    const adminCurrentPage = ref(1);
    const adminTotalPages = ref(1);
    const bookmarkSearch = ref('');
    const bookmarkDomainFilter = ref('');
    const bookmarkCategoryFilter = ref('');

    // 分类管理相关
    const categories = ref([]);
    const categoriesLoading = ref(false);

    // 域名数据
    const domains = ref([]);

    // 数据库管理相关
    const dbLoading = ref(false);
    const dbStatus = ref({
      connected: false,
      tablesExist: false
    });

    // 设置相关
    const settings = ref({
      itemsPerPage: 20
    });

    // 用户资料管理
    const userProfile = ref({
      username: '',
      email: '',
      currentPassword: '',
      newPassword: ''
    });
    const profileLoading = ref(false);

    // 安全设置
    const securitySettings = ref({
      admin_path: '',
      home_path: '',
      enable_home_path: 'false',
      require_login: 'false',
      session_timeout: '86400'
    });
    const securityLoading = ref(false);

    // 会话超时时间（小时）
    const sessionTimeoutHours = computed({
      get: () => Math.floor(parseInt(securitySettings.value.session_timeout) / 3600),
      set: (hours) => {
        securitySettings.value.session_timeout = (hours * 3600).toString();
      }
    });

    // 统计信息
    const adminStats = ref({
      bookmarks: 0,
      domains: 0,
      categories: 0
    });

    // 日志管理相关
    const logs = ref([]);
    const logsLoading = ref(false);
    const logCurrentPage = ref(1);
    const logTotalPages = ref(1);
    const logTypeFilter = ref('');
    const logTimeFilter = ref('');
    const expandedLogs = ref([]);

    // 监控面板相关
    const dashboardData = ref({
      systemStats: null,
      performanceData: null,
      recentLogs: [],
      syncHistory: []
    });
    const dashboardLoading = ref(false);
    const lastUpdateTime = ref(null);

    // API文档相关
    const apiTesting = ref(false);
    const apiTestResult = ref(null);
    const apiBaseUrl = ref(window.location.origin);

    // 模态框状态
    const showAddBookmark = ref(false);
    const showAddCategory = ref(false);

    // 防抖搜索
    let bookmarkSearchTimeout;
    const debouncedBookmarkSearch = () => {
      clearTimeout(bookmarkSearchTimeout);
      bookmarkSearchTimeout = setTimeout(() => {
        adminCurrentPage.value = 1;
        loadAdminBookmarks();
      }, 600);
    };

    // 加载管理后台书签
    const loadAdminBookmarks = async (page = adminCurrentPage.value) => {
      if (adminLoading.value) return;

      try {
        adminLoading.value = true;
        const params = new URLSearchParams({
          page: page,
          limit: 20,
          domain: bookmarkDomainFilter.value,
          category: bookmarkCategoryFilter.value,
          search: bookmarkSearch.value
        });

        const response = await fetch(`/api/bookmarks?${params}`);
        const data = await response.json();

        if (data.success) {
          adminBookmarks.value = data.bookmarks || data.data || [];
          adminCurrentPage.value = page;
          adminTotalPages.value = Math.ceil((data.total || 0) / 20);
        } else {
          console.error('加载书签失败:', data.message);
          adminBookmarks.value = [];

          // 如果是数据库未初始化的错误，提示用户
          if (data.message && data.message.includes('未初始化')) {
            console.warn('数据库未初始化，请先初始化数据库');
          }
        }
      } catch (error) {
        console.error('加载书签失败:', error);
        adminBookmarks.value = [];
      } finally {
        adminLoading.value = false;
      }
    };

    // 加载分类
    const loadCategories = async () => {
      try {
        categoriesLoading.value = true;
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          categories.value = data.categories || [];
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      } finally {
        categoriesLoading.value = false;
      }
    };

    // 加载域名
    const loadDomains = async () => {
      try {
        const response = await fetch('/api/system/domains');
        const data = await response.json();
        if (data.success) {
          domains.value = data.domains || [];
        }
      } catch (error) {
        console.error('加载域名失败:', error);
      }
    };

    // 加载统计信息
    const loadAdminStats = async () => {
      try {
        const response = await fetch('/api/system/stats');
        const data = await response.json();
        if (data.success) {
          const statsData = data.stats || data.data || {};
          adminStats.value = {
            bookmarks: statsData.bookmarks_count || statsData.total_bookmarks || 0,
            domains: statsData.domains_count || statsData.total_domains || 0,
            categories: statsData.categories_count || statsData.total_categories || 0
          };
        }
      } catch (error) {
        console.error('加载统计信息失败:', error);
      }
    };

    // 检查数据库
    const checkDatabase = async () => {
      try {
        dbLoading.value = true;
        const response = await fetch('/api/database/check');
        const data = await response.json();

        if (data.success) {
          // 正确解析 API 响应结构
          const dbBinding = data.d1_binding || {};
          const tables = data.tables || {};
          const health = data.database_health || {};

          dbStatus.value = {
            connected: dbBinding.connected || false,
            tablesExist: tables.missing ? tables.missing.length === 0 : false,
            health: health.status || 'unknown',
            percentage: health.percentage || 0,
            message: health.message || '未知状态'
          };

          // 显示详细的检查结果
          let message = `数据库检查完成\n\n`;
          message += `连接状态: ${dbBinding.connected ? '✅ 已连接' : '❌ 未连接'}\n`;
          message += `健康状态: ${health.message} (${health.percentage}%)\n`;

          if (tables.missing && tables.missing.length > 0) {
            message += `\n缺少表: ${tables.missing.join(', ')}\n`;
            message += `建议: 点击"初始化数据库"创建缺少的表`;
          } else if (tables.existing && tables.existing.length > 0) {
            message += `\n已存在表: ${tables.existing.join(', ')}`;
          }

          if (data.recommendations && data.recommendations.length > 0) {
            message += `\n\n建议:\n${data.recommendations.join('\n')}`;
          }

          alert(message);
        } else {
          alert('数据库检查失败: ' + data.message);
        }
      } catch (error) {
        console.error('检查数据库失败:', error);
        alert('检查数据库失败: ' + error.message);
      } finally {
        dbLoading.value = false;
      }
    };

    // 静默检查数据库状态（不显示 alert）
    const checkDatabaseSilently = async () => {
      try {
        const response = await fetch('/api/database/check');
        const data = await response.json();

        if (data.success) {
          const dbBinding = data.d1_binding || {};
          const tables = data.tables || {};
          const health = data.database_health || {};

          dbStatus.value = {
            connected: dbBinding.connected || false,
            tablesExist: tables.missing ? tables.missing.length === 0 : false,
            health: health.status || 'unknown',
            percentage: health.percentage || 0,
            message: health.message || '未知状态'
          };
        }
      } catch (error) {
        console.error('静默检查数据库失败:', error);
      }
    };

    // 初始化数据库
    const initDatabase = async () => {
      if (!confirm('确定要初始化数据库吗？这将创建所有必要的表结构。')) {
        return;
      }

      try {
        dbLoading.value = true;
        const response = await fetch('/api/database/init', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          // 显示详细的初始化结果
          let message = '数据库初始化完成！\n\n';
          if (data.results && data.results.length > 0) {
            message += '执行结果:\n';
            data.results.forEach(result => {
              message += `${result}\n`;
            });
          }
          message += `\n初始化时间: ${data.timestamp || new Date().toLocaleString()}`;

          alert(message);

          // 重新检查状态并加载数据
          await checkDatabaseSilently();

          // 如果当前在相关标签页，重新加载数据
          if (activeTab.value === 'bookmarks') {
            await loadAdminBookmarks();
          } else if (activeTab.value === 'categories') {
            await loadCategories();
          } else if (activeTab.value === 'settings') {
            await loadAdminStats();
          }
        } else {
          let errorMessage = '数据库初始化失败: ' + data.message;
          if (data.instructions && data.instructions.length > 0) {
            errorMessage += '\n\n说明:\n' + data.instructions.join('\n');
          }
          alert(errorMessage);
        }
      } catch (error) {
        console.error('初始化数据库失败:', error);
        alert('初始化数据库失败: ' + error.message);
      } finally {
        dbLoading.value = false;
      }
    };

    // 简化初始化数据库
    const initDatabaseSimple = async () => {
      if (!confirm('确定要使用简化方式初始化数据库吗？\n\n这是专为 D1 数据库优化的初始化方式，兼容性更好。')) {
        return;
      }

      try {
        dbLoading.value = true;
        const response = await fetch('/api/database/init', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          // 显示详细的初始化结果
          let message = '数据库简化初始化完成！\n\n';
          if (data.results && data.results.length > 0) {
            message += '执行结果:\n';
            data.results.forEach(result => {
              message += `${result}\n`;
            });
          }
          message += `\n初始化时间: ${data.timestamp || new Date().toLocaleString()}`;

          alert(message);

          // 重新检查状态并加载数据
          await checkDatabaseSilently();

          // 如果当前在相关标签页，重新加载数据
          if (activeTab.value === 'bookmarks') {
            await loadAdminBookmarks();
          } else if (activeTab.value === 'categories') {
            await loadCategories();
          } else if (activeTab.value === 'settings') {
            await loadAdminStats();
          }
        } else {
          let errorMessage = '数据库简化初始化失败: ' + data.message;
          if (data.instructions && data.instructions.length > 0) {
            errorMessage += '\n\n说明:\n' + data.instructions.join('\n');
          }
          alert(errorMessage);
        }
      } catch (error) {
        console.error('简化初始化数据库失败:', error);
        alert('简化初始化数据库失败: ' + error.message);
      } finally {
        dbLoading.value = false;
      }
    };

    // 升级数据库
    const upgradeDatabase = async () => {
      if (!confirm('确定要升级数据库吗？这将更新数据库结构到最新版本。\n\n注意：升级过程中会备份现有数据，但建议先手动备份重要数据。')) {
        return;
      }

      try {
        dbLoading.value = true;
        const response = await fetch('/api/upgrade-database', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          // 显示详细的升级结果
          let message = '数据库升级完成！\n\n';
          if (data.results && data.results.length > 0) {
            message += '升级结果:\n';
            data.results.forEach(result => {
              message += `${result}\n`;
            });
          }
          message += `\n升级时间: ${data.timestamp || new Date().toLocaleString()}`;

          alert(message);

          // 重新检查状态并加载数据
          await checkDatabaseSilently();

          // 如果当前在相关标签页，重新加载数据
          if (activeTab.value === 'bookmarks') {
            await loadAdminBookmarks();
          } else if (activeTab.value === 'categories') {
            await loadCategories();
          } else if (activeTab.value === 'logs') {
            await loadLogs();
          } else if (activeTab.value === 'settings') {
            await loadAdminStats();
          }
        } else {
          alert('数据库升级失败: ' + data.message);
        }
      } catch (error) {
        console.error('升级数据库失败:', error);
        alert('升级数据库失败: ' + error.message);
      } finally {
        dbLoading.value = false;
      }
    };

    // 导出数据
    const exportData = async () => {
      try {
        dbLoading.value = true;
        const response = await fetch('/api/system/export');
        const data = await response.json();

        if (data.success) {
          // 创建下载链接
          const blob = new Blob([JSON.stringify(data.data, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bookmarks-export-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          alert('数据导出成功');
        } else {
          alert('数据导出失败: ' + data.message);
        }
      } catch (error) {
        console.error('导出数据失败:', error);
        alert('导出数据失败: ' + error.message);
      } finally {
        dbLoading.value = false;
      }
    };

    // 导入数据
    const importData = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!confirm('确定要导入数据吗？这将覆盖现有的书签数据。')) {
        event.target.value = '';
        return;
      }

      try {
        dbLoading.value = true;
        const text = await file.text();
        const jsonData = JSON.parse(text);

        const response = await fetch('/api/system/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(jsonData)
        });

        const data = await response.json();

        if (data.success) {
          alert('数据导入成功');
          await loadAdminBookmarks(); // 重新加载书签
          await loadAdminStats(); // 重新加载统计
        } else {
          alert('数据导入失败: ' + data.message);
        }
      } catch (error) {
        console.error('导入数据失败:', error);
        alert('导入数据失败: ' + error.message);
      } finally {
        dbLoading.value = false;
        event.target.value = '';
      }
    };

    // 保存设置
    const saveSettings = async () => {
      try {
        const response = await fetch('/api/system/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items_per_page: settings.value.itemsPerPage
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('设置保存成功');
        } else {
          alert('设置保存失败: ' + data.message);
        }
      } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败: ' + error.message);
      }
    };

    // 加载用户资料
    const loadUserProfile = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        const data = await response.json();

        if (data.success) {
          userProfile.value.username = data.user.username;
          userProfile.value.email = data.user.email || '';
        }
      } catch (error) {
        console.error('加载用户资料失败:', error);
      }
    };

    // 更新用户资料
    const updateProfile = async () => {
      if (!userProfile.value.username.trim()) {
        alert('用户名不能为空');
        return;
      }

      if (userProfile.value.newPassword && !userProfile.value.currentPassword) {
        alert('修改密码需要提供当前密码');
        return;
      }

      try {
        profileLoading.value = true;

        const updateData = {
          username: userProfile.value.username,
          email: userProfile.value.email
        };

        if (userProfile.value.newPassword) {
          updateData.currentPassword = userProfile.value.currentPassword;
          updateData.newPassword = userProfile.value.newPassword;
        }

        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
          alert('用户资料更新成功');
          // 清空密码字段
          userProfile.value.currentPassword = '';
          userProfile.value.newPassword = '';
        } else {
          alert('更新失败: ' + data.message);
        }
      } catch (error) {
        console.error('更新用户资料失败:', error);
        alert('更新失败: ' + error.message);
      } finally {
        profileLoading.value = false;
      }
    };

    // 加载安全设置
    const loadSecuritySettings = async () => {
      try {
        const response = await fetch('/api/settings/security');
        const data = await response.json();

        if (data.success) {
          Object.keys(securitySettings.value).forEach(key => {
            if (data.settings[key]) {
              securitySettings.value[key] = data.settings[key].value;
            }
          });
        }
      } catch (error) {
        console.error('加载安全设置失败:', error);
      }
    };

    // 保存安全设置
    const saveSecuritySettings = async () => {
      try {
        securityLoading.value = true;

        const response = await fetch('/api/settings/security', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            settings: securitySettings.value
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('安全设置保存成功');
        } else {
          alert('保存失败: ' + data.message);
        }
      } catch (error) {
        console.error('保存安全设置失败:', error);
        alert('保存失败: ' + error.message);
      } finally {
        securityLoading.value = false;
      }
    };

    // 生成随机管理路径
    const generateAdminPath = async () => {
      try {
        const response = await fetch('/api/utils/generate-path');
        const data = await response.json();

        if (data.success) {
          securitySettings.value.admin_path = data.path;
        } else {
          alert('生成路径失败: ' + data.message);
        }
      } catch (error) {
        console.error('生成路径失败:', error);
        alert('生成路径失败: ' + error.message);
      }
    };

    // 生成随机首页路径
    const generateHomePath = async () => {
      try {
        const response = await fetch('/api/utils/generate-path');
        const data = await response.json();

        if (data.success) {
          securitySettings.value.home_path = data.path;
        } else {
          alert('生成路径失败: ' + data.message);
        }
      } catch (error) {
        console.error('生成路径失败:', error);
        alert('生成路径失败: ' + error.message);
      }
    };

    // 测试路径设置
    const testPaths = () => {
      const messages = [];
      const currentDomain = window.location.origin;

      // 测试管理后台路径
      if (securitySettings.value.admin_path) {
        const adminPath = `${currentDomain}/${securitySettings.value.admin_path}/admin.html`;
        messages.push(`管理后台路径: ${adminPath}`);
      } else {
        messages.push('管理后台路径: 使用默认路径 /admin.html');
      }

      // 测试首页路径
      if (securitySettings.value.enable_home_path === 'true' && securitySettings.value.home_path) {
        const homePath = `${currentDomain}/${securitySettings.value.home_path}/`;
        messages.push(`首页路径: ${homePath}`);
        messages.push('默认首页 / 将显示404');
      } else {
        messages.push('首页路径: 使用默认路径 /');
      }

      messages.push('');
      messages.push('提示: 请先保存设置，然后在新标签页中测试这些路径。');

      alert(messages.join('\n'));
    };

    // 检查路径保护状态
    const checkPathProtection = async () => {
      try {
        const response = await fetch('/api/debug/path-protection');
        const data = await response.json();

        if (data.success) {
          const analysis = data.analysis;
          const messages = [];

          messages.push('=== 路径保护状态检查 ===');
          messages.push('');
          messages.push(`数据库状态: ${analysis.dbInitialized ? '已初始化' : '未初始化'}`);
          messages.push('');

          messages.push('当前设置:');
          messages.push(`- 首页路径保护: ${analysis.pathProtection.homePathEnabled ? '启用' : '禁用'}`);
          messages.push(`- 首页路径: ${analysis.pathProtection.homePathValue || '未设置'}`);
          messages.push(`- 管理路径: ${analysis.pathProtection.adminPathValue || '未设置'}`);
          messages.push('');

          if (analysis.urls.protectedHomePage) {
            messages.push(`受保护的首页: ${analysis.urls.protectedHomePage}`);
            messages.push(`被阻止的首页: ${analysis.urls.blockedHomePage}`);
          }

          if (analysis.urls.protectedAdminPage) {
            messages.push(`受保护的管理页: ${analysis.urls.protectedAdminPage}`);
            messages.push(`被阻止的管理页: ${analysis.urls.blockedAdminPage}`);
          }

          if (data.suggestions.length > 0) {
            messages.push('');
            messages.push('建议:');
            data.suggestions.forEach(suggestion => {
              messages.push(`- ${suggestion}`);
            });
          }

          alert(messages.join('\n'));
        } else {
          alert('检查失败: ' + data.message);
        }
      } catch (error) {
        console.error('检查路径保护状态失败:', error);
        alert('检查失败: ' + error.message);
      }
    };

    // 检查数据库状态
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch('/api/database/status');
        const data = await response.json();

        if (data.success) {
          const status = data.status;
          const messages = [];

          messages.push('=== 数据库状态检查 ===');
          messages.push('');
          messages.push(`数据库配置: ${status.dbConfigured ? '✅ 已配置' : '❌ 未配置'}`);
          messages.push(`表结构: ${status.tablesExist ? '✅ 完整' : '❌ 不完整'}`);
          messages.push(`初始化状态: ${data.isInitialized ? '✅ 已初始化' : '❌ 未初始化'}`);
          messages.push('');

          messages.push('数据统计:');
          messages.push(`- 设置项: ${status.settingsCount} 个`);
          messages.push(`- 用户: ${status.usersCount} 个`);
          messages.push(`- 书签: ${status.bookmarksCount} 个`);
          messages.push(`- 分类: ${status.categoriesCount} 个`);
          messages.push('');

          messages.push('存在的表:');
          status.tables.forEach(table => {
            messages.push(`- ${table}`);
          });

          if (status.lastInitTime) {
            messages.push('');
            messages.push(`最后初始化时间: ${new Date(status.lastInitTime).toLocaleString()}`);
          }

          messages.push('');
          messages.push('重要设置:');
          messages.push(`- 管理路径: ${status.settings.admin_path || '未设置'}`);
          messages.push(`- 首页路径: ${status.settings.home_path || '未设置'}`);
          messages.push(`- 首页保护: ${status.settings.enable_home_path === 'true' ? '启用' : '禁用'}`);

          if (data.recommendations.length > 0) {
            messages.push('');
            messages.push('建议:');
            data.recommendations.forEach(rec => {
              messages.push(`- ${rec}`);
            });
          }

          alert(messages.join('\n'));
        } else {
          alert('检查失败: ' + data.message);
        }
      } catch (error) {
        console.error('检查数据库状态失败:', error);
        alert('检查失败: ' + error.message);
      }
    };

    // 日志管理函数
    const loadLogs = async (page = logCurrentPage.value) => {
      if (logsLoading.value) return;

      try {
        logsLoading.value = true;
        const params = new URLSearchParams({
          page: page,
          limit: 20,
          type: logTypeFilter.value,
          time: logTimeFilter.value
        });

        const response = await fetch(`/api/system/logs?${params}`);
        const data = await response.json();

        if (data.success) {
          logs.value = data.logs || [];
          logCurrentPage.value = page;
          logTotalPages.value = Math.ceil((data.total || 0) / 20);
        } else {
          console.error('加载日志失败:', data.message);
          logs.value = [];
        }
      } catch (error) {
        console.error('加载日志失败:', error);
        logs.value = [];
      } finally {
        logsLoading.value = false;
      }
    };

    const refreshLogs = () => {
      loadLogs(1);
    };

    const clearLogs = async () => {
      if (!confirm('确定要清空所有日志吗？此操作不可恢复。')) return;

      try {
        const response = await fetch('/api/system/logs', { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
          alert('日志清空成功');
          await loadLogs(1);
        } else {
          alert('日志清空失败: ' + data.message);
        }
      } catch (error) {
        alert('日志清空失败: ' + error.message);
      }
    };

    const toggleLogDetails = (logId) => {
      const index = expandedLogs.value.indexOf(logId);
      if (index > -1) {
        expandedLogs.value.splice(index, 1);
      } else {
        expandedLogs.value.push(logId);
      }
    };

    const prevLogPage = () => {
      if (logCurrentPage.value > 1) {
        loadLogs(logCurrentPage.value - 1);
      }
    };

    const nextLogPage = () => {
      if (logCurrentPage.value < logTotalPages.value) {
        loadLogs(logCurrentPage.value + 1);
      }
    };

    // 日志工具函数
    const getLogIcon = (level) => {
      const icons = {
        info: 'fas fa-info-circle',
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        debug: 'fas fa-bug'
      };
      return icons[level] || 'fas fa-circle';
    };

    const getLogLevelText = (level) => {
      const texts = {
        info: '信息',
        success: '成功',
        warning: '警告',
        error: '错误',
        debug: '调试'
      };
      return texts[level] || level;
    };

    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    };

    const formatLogDetails = (details) => {
      if (typeof details === 'string') {
        try {
          return JSON.stringify(JSON.parse(details), null, 2);
        } catch {
          return details;
        }
      }
      return JSON.stringify(details, null, 2);
    };

    // API文档相关函数
    const apiCategories = ref([
      {
        name: '书签管理',
        icon: 'fas fa-bookmark',
        endpoints: [
          {
            method: 'GET',
            path: '/api/bookmarks',
            description: '获取书签列表（支持分页、搜索、筛选）',
            params: [
              { name: 'page', type: 'number', required: false, description: '页码，默认1' },
              { name: 'limit', type: 'number', required: false, description: '每页数量，默认20' },
              { name: 'domain', type: 'string', required: false, description: '域名筛选' },
              { name: 'category', type: 'number', required: false, description: '分类ID筛选' },
              { name: 'search', type: 'string', required: false, description: '搜索关键词' }
            ],
            example: 'GET /api/bookmarks?page=1&limit=10&domain=github.com'
          },
          {
            method: 'POST',
            path: '/api/bookmarks',
            description: '添加新书签',
            params: [
              { name: 'title', type: 'string', required: true, description: '书签标题' },
              { name: 'url', type: 'string', required: true, description: '书签URL' },
              { name: 'domain', type: 'string', required: true, description: '域名' },
              { name: 'path', type: 'string', required: false, description: 'URL路径' },
              { name: 'category_id', type: 'number', required: false, description: '分类ID' },
              { name: 'icon_url', type: 'string', required: false, description: '图标URL' }
            ],
            example: 'POST /api/bookmarks\n{\n  "title": "GitHub",\n  "url": "https://github.com",\n  "domain": "github.com"\n}'
          }
        ]
      },
      {
        name: '分类管理',
        icon: 'fas fa-folder',
        endpoints: [
          {
            method: 'GET',
            path: '/api/categories',
            description: '获取分类列表',
            params: [],
            example: 'GET /api/categories'
          },
          {
            method: 'POST',
            path: '/api/categories',
            description: '添加新分类',
            params: [
              { name: 'name', type: 'string', required: true, description: '分类名称' },
              { name: 'description', type: 'string', required: false, description: '分类描述' },
              { name: 'parent_id', type: 'number', required: false, description: '父分类ID' }
            ],
            example: 'POST /api/categories\n{\n  "name": "工作",\n  "description": "工作相关书签"\n}'
          }
        ]
      },
      {
        name: '数据库管理',
        icon: 'fas fa-database',
        endpoints: [
          {
            method: 'GET',
            path: '/api/database/check',
            description: '检查数据库状态和表结构',
            params: [],
            example: 'GET /api/database/check'
          },
          {
            method: 'POST',
            path: '/api/database/init',
            description: '初始化数据库表结构',
            params: [],
            example: 'POST /api/database/init'
          }
        ]
      },
      {
        name: '系统功能',
        icon: 'fas fa-cog',
        endpoints: [
          {
            method: 'GET',
            path: '/api/system/stats',
            description: '获取系统统计信息',
            params: [],
            example: 'GET /api/system/stats'
          },
          {
            method: 'GET',
            path: '/api/system/domains',
            description: '获取域名列表和统计',
            params: [],
            example: 'GET /api/system/domains'
          },
          {
            method: 'GET',
            path: '/api/system/logs',
            description: '获取系统日志',
            params: [
              { name: 'page', type: 'number', required: false, description: '页码' },
              { name: 'limit', type: 'number', required: false, description: '每页数量' },
              { name: 'type', type: 'string', required: false, description: '日志类型' },
              { name: 'time', type: 'string', required: false, description: '时间范围' }
            ],
            example: 'GET /api/system/logs?type=error&time=today'
          },
          {
            method: 'GET',
            path: '/api/system/export',
            description: '导出所有数据',
            params: [],
            example: 'GET /api/system/export'
          },
          {
            method: 'POST',
            path: '/api/system/import',
            description: '导入数据',
            params: [
              { name: 'bookmarks', type: 'array', required: false, description: '书签数据' },
              { name: 'categories', type: 'array', required: false, description: '分类数据' }
            ],
            example: 'POST /api/system/import\n{\n  "bookmarks": [...],\n  "categories": [...]\n}'
          }
        ]
      },
      {
        name: '调试工具',
        icon: 'fas fa-bug',
        endpoints: [
          {
            method: 'GET',
            path: '/api/debug',
            description: '获取请求调试信息（用于诊断Chrome插件问题）',
            params: [],
            example: 'GET /api/debug'
          },
          {
            method: 'POST',
            path: '/api/debug',
            description: '调试POST请求（测试Chrome插件数据格式）',
            params: [
              { name: 'title', type: 'string', required: false, description: '测试书签标题' },
              { name: 'url', type: 'string', required: false, description: '测试书签URL' }
            ],
            example: 'POST /api/debug\n{\n  "title": "测试书签",\n  "url": "https://example.com"\n}'
          },
          {
            method: 'POST',
            path: '/api/test-bookmark',
            description: '专门测试书签API（不会实际插入数据）',
            params: [
              { name: 'title', type: 'string', required: true, description: '书签标题' },
              { name: 'url', type: 'string', required: true, description: '书签URL' },
              { name: 'domain', type: 'string', required: false, description: '域名（可自动提取）' }
            ],
            example: 'POST /api/test-bookmark\n{\n  "title": "测试书签",\n  "url": "https://example.com"\n}'
          }
        ]
      }
    ]);

    const copyApiUrl = async () => {
      try {
        await navigator.clipboard.writeText(apiBaseUrl.value);
        alert('API基础URL已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    };

    const testApiConnection = async () => {
      apiTesting.value = true;
      apiTestResult.value = null;

      try {
        const response = await fetch('/api/system/stats');
        const data = await response.json();

        apiTestResult.value = {
          success: response.ok,
          status: `${response.status} ${response.statusText}`,
          url: '/api/system/stats',
          data: data
        };
      } catch (error) {
        apiTestResult.value = {
          success: false,
          status: 'Network Error',
          url: '/api/system/stats',
          data: { error: error.message }
        };
      } finally {
        apiTesting.value = false;
      }
    };

    const testEndpoint = async (endpoint) => {
      apiTestResult.value = null;

      try {
        const url = endpoint.path;
        const options = { method: endpoint.method };

        if (endpoint.method === 'POST' && endpoint.path.includes('bookmarks')) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({
            title: 'API测试书签',
            url: 'https://example.com/test',
            domain: 'example.com'
          });
        }

        const response = await fetch(url, options);
        const data = await response.json();

        apiTestResult.value = {
          success: response.ok,
          status: `${response.status} ${response.statusText}`,
          url: url,
          data: data
        };
      } catch (error) {
        apiTestResult.value = {
          success: false,
          status: 'Network Error',
          url: endpoint.path,
          data: { error: error.message }
        };
      }
    };

    // 监控面板相关函数
    const refreshDashboard = async () => {
      dashboardLoading.value = true;

      try {
        // 并行获取所有监控数据
        const [statsResponse, performanceResponse, logsResponse] = await Promise.all([
          fetch('/api/system/stats'),
          fetch('/api/performance'),
          fetch('/api/system/logs?limit=10&type=all')
        ]);

        // 解析响应
        const [statsData, performanceData, logsData] = await Promise.all([
          statsResponse.json(),
          performanceResponse.json(),
          logsResponse.json()
        ]);

        // 更新监控数据
        if (statsData.success) {
          dashboardData.value.systemStats = statsData.stats;
        }

        if (performanceData.success) {
          dashboardData.value.performanceData = performanceData.performance.summary;
        }

        if (logsData.success) {
          dashboardData.value.recentLogs = logsData.logs || [];
          // 筛选同步相关的日志作为同步历史
          dashboardData.value.syncHistory = (logsData.logs || []).filter(log =>
            log.type === 'chrome_plugin' || log.message.includes('同步') || log.message.includes('sync')
          );
        }

        lastUpdateTime.value = new Date().toISOString();

      } catch (error) {
        console.error('刷新监控面板失败:', error);
        alert('刷新监控数据失败: ' + error.message);
      } finally {
        dashboardLoading.value = false;
      }
    };

    const getGradeClass = (grade) => {
      if (!grade) return 'unknown';
      const letter = grade.charAt(0).toLowerCase();
      return `grade-${letter}`;
    };

    // 页面加载时自动刷新监控面板
    const initDashboard = () => {
      if (activeTab.value === 'dashboard') {
        refreshDashboard();
      }
    };

    // 监听标签页切换
    watch(activeTab, (newTab) => {
      if (newTab === 'dashboard' && !dashboardData.value.systemStats) {
        refreshDashboard();
      }
    });

    // 工具函数
    const getIconUrl = (bookmark) => {
      return bookmark.icon_url || `https://www.google.com/s2/favicons?domain=${bookmark.domain}&sz=32`;
    };

    const handleIconError = (event) => {
      event.target.src = `https://www.google.com/s2/favicons?domain=default&sz=32`;
    };

    const getCategoryName = (categoryId) => {
      if (!categoryId) return '未分类';
      const category = categories.value.find(cat => cat.id === categoryId);
      return category ? category.name : '未分类';
    };

    const getParentCategoryName = (parentId) => {
      if (!parentId) return '无';
      const category = categories.value.find(cat => cat.id === parentId);
      return category ? category.name : '无';
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    };

    // 分页函数
    const prevAdminPage = () => {
      if (adminCurrentPage.value > 1) {
        loadAdminBookmarks(adminCurrentPage.value - 1);
      }
    };

    const nextAdminPage = () => {
      if (adminCurrentPage.value < adminTotalPages.value) {
        loadAdminBookmarks(adminCurrentPage.value + 1);
      }
    };

    // 编辑和删除函数
    const editBookmark = (bookmark) => {
      alert('编辑功能待实现');
    };

    const deleteBookmark = async (id) => {
      if (!confirm('确定要删除这个书签吗？')) return;

      try {
        const response = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
          alert('删除成功');
          await loadAdminBookmarks();
        } else {
          alert('删除失败: ' + data.message);
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    };

    const editCategory = (category) => {
      alert('编辑功能待实现');
    };

    const deleteCategory = async (id) => {
      if (!confirm('确定要删除这个分类吗？')) return;

      try {
        const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
          alert('删除成功');
          await loadCategories();
        } else {
          alert('删除失败: ' + data.message);
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    };

    // 页面初始化
    onMounted(async () => {
      // 先静默检查数据库状态
      await checkDatabaseSilently();

      // 根据当前标签页加载对应数据
      if (activeTab.value === 'dashboard') {
        refreshDashboard();
      } else if (dbStatus.value.tablesExist) {
        // 如果数据库已初始化，则加载数据
        await Promise.all([
          loadCategories(),
          loadDomains(),
          loadAdminStats(),
          loadAdminBookmarks()
        ]);
      } else {
        // 如果数据库未初始化，只加载基本信息
        console.log('数据库未初始化，跳过数据加载');
      }
    });

    // 监听标签页切换
    watch(activeTab, (newTab) => {
      if (newTab === 'bookmarks') {
        // 只有在数据库已初始化时才加载书签
        if (dbStatus.value.tablesExist) {
          loadAdminBookmarks();
        }
      } else if (newTab === 'categories') {
        // 只有在数据库已初始化时才加载分类
        if (dbStatus.value.tablesExist) {
          loadCategories();
        }
      } else if (newTab === 'database') {
        // 静默检查数据库状态，不弹窗
        checkDatabaseSilently();
      } else if (newTab === 'logs') {
        // 加载日志
        loadLogs();
      } else if (newTab === 'settings') {
        // 加载设置页面数据
        if (dbStatus.value.tablesExist) {
          loadAdminStats();
          loadUserProfile();
          loadSecuritySettings();
        }
      }
    });

    return {
      tabs,
      activeTab,
      adminBookmarks,
      adminLoading,
      adminCurrentPage,
      adminTotalPages,
      bookmarkSearch,
      bookmarkDomainFilter,
      bookmarkCategoryFilter,
      categories,
      categoriesLoading,
      domains,
      dbLoading,
      dbStatus,
      settings,
      userProfile,
      profileLoading,
      securitySettings,
      securityLoading,
      sessionTimeoutHours,
      adminStats,
      logs,
      logsLoading,
      logCurrentPage,
      logTotalPages,
      logTypeFilter,
      logTimeFilter,
      expandedLogs,
      dashboardData,
      dashboardLoading,
      lastUpdateTime,
      apiTesting,
      apiTestResult,
      apiBaseUrl,
      apiCategories,
      showAddBookmark,
      showAddCategory,
      debouncedBookmarkSearch,
      loadAdminBookmarks,
      loadCategories,
      loadDomains,
      loadAdminStats,
      loadLogs,
      refreshLogs,
      clearLogs,
      toggleLogDetails,
      prevLogPage,
      nextLogPage,
      getLogIcon,
      getLogLevelText,
      formatDateTime,
      formatLogDetails,
      copyApiUrl,
      testApiConnection,
      testEndpoint,
      refreshDashboard,
      getGradeClass,
      initDashboard,
      checkDatabase,
      checkDatabaseSilently,
      initDatabase,
      initDatabaseSimple,
      upgradeDatabase,
      exportData,
      importData,
      saveSettings,
      loadUserProfile,
      updateProfile,
      loadSecuritySettings,
      saveSecuritySettings,
      generateAdminPath,
      generateHomePath,
      testPaths,
      checkPathProtection,
      checkDatabaseStatus,
      getIconUrl,
      handleIconError,
      getCategoryName,
      getParentCategoryName,
      formatDate,
      prevAdminPage,
      nextAdminPage,
      editBookmark,
      deleteBookmark,
      editCategory,
      deleteCategory
    };
  }
};
