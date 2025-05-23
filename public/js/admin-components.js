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
            <div class="settings-card">
              <h3>显示设置</h3>
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

            <div class="settings-card">
              <h3>统计信息</h3>
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
      { id: 'bookmarks', name: '书签管理', icon: 'fas fa-bookmark' },
      { id: 'categories', name: '分类管理', icon: 'fas fa-folder' },
      { id: 'database', name: '数据库', icon: 'fas fa-database' },
      { id: 'logs', name: '日志', icon: 'fas fa-list-alt' },
      { id: 'api', name: 'API文档', icon: 'fas fa-code' },
      { id: 'settings', name: '设置', icon: 'fas fa-cog' }
    ];

    // 响应式数据
    const activeTab = ref('bookmarks');

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

    // 初始化时先检查数据库状态
    onMounted(async () => {
      // 先静默检查数据库状态
      await checkDatabaseSilently();

      // 如果数据库已初始化，则加载数据
      if (dbStatus.value.tablesExist) {
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
        checkDatabase();
      } else if (newTab === 'logs') {
        // 加载日志
        loadLogs();
      } else if (newTab === 'settings') {
        // 只有在数据库已初始化时才加载统计
        if (dbStatus.value.tablesExist) {
          loadAdminStats();
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
      adminStats,
      logs,
      logsLoading,
      logCurrentPage,
      logTotalPages,
      logTypeFilter,
      logTimeFilter,
      expandedLogs,
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
      checkDatabase,
      checkDatabaseSilently,
      initDatabase,
      initDatabaseSimple,
      upgradeDatabase,
      exportData,
      importData,
      saveSettings,
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
