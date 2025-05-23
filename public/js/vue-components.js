/**
 * Vue.js 组件定义
 */

// 主页视图组件
const HomeView = {
  template: `
    <div>
      <!-- 搜索区域 -->
      <div class="search-section">
        <div class="search-container">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索书签..."
              class="search-input"
              @input="debouncedSearch"
            >
          </div>
          <div class="filters">
            <select v-model="selectedDomain" @change="loadBookmarks" class="filter-select">
              <option value="">所有网站</option>
              <option v-for="domain in domains" :key="domain" :value="domain">
                {{ domain }}
              </option>
            </select>
            <select v-model="selectedCategory" @change="loadBookmarks" class="filter-select">
              <option value="">所有分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-bookmark"></i>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.bookmarks || 0 }}</div>
              <div class="stat-label">书签</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-globe"></i>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.domains || 0 }}</div>
              <div class="stat-label">网站</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-folder"></i>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.categories || 0 }}</div>
              <div class="stat-label">分类</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 书签列表 -->
      <div class="bookmarks-section">
        <div v-if="loading" class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>

        <div v-else-if="bookmarks.length === 0" class="loading">
          <i class="fas fa-search"></i>
          <p>没有找到书签</p>
        </div>

        <div v-else class="bookmarks-grid">
          <div
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            class="bookmark-card"
            @click="openBookmark(bookmark.url)"
          >
            <div class="bookmark-header">
              <div class="bookmark-favicon">
                <img
                  :src="getIconUrl(bookmark)"
                  :alt="bookmark.title + ' 图标'"
                  loading="lazy"
                  @error="handleIconError"
                >
              </div>
              <div class="bookmark-domain-info">
                <span class="bookmark-domain">{{ bookmark.domain }}</span>
                <span class="bookmark-category">{{ getCategoryName(bookmark.category_id) }}</span>
              </div>
            </div>
            <div class="bookmark-body">
              <h3 class="bookmark-title">{{ bookmark.title }}</h3>
              <p class="bookmark-url">{{ bookmark.url }}</p>
            </div>
            <div class="bookmark-footer">
              <span class="bookmark-date">
                <i class="fas fa-calendar-alt"></i>
                {{ formatDate(bookmark.created_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            @click="prevPage"
            :disabled="currentPage <= 1"
            class="page-btn"
          >
            <i class="fas fa-chevron-left"></i>
            上一页
          </button>
          <span class="page-info">第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
          <button
            @click="nextPage"
            :disabled="currentPage >= totalPages"
            class="page-btn"
          >
            下一页
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  setup() {
    const bookmarks = ref([]);
    const categories = ref([]);
    const domains = ref([]);
    const stats = ref({});
    const loading = ref(false);

    const searchQuery = ref('');
    const selectedDomain = ref('');
    const selectedCategory = ref('');
    const currentPage = ref(1);
    const totalPages = ref(1);
    const itemsPerPage = ref(20);

    // 防抖搜索
    let searchTimeout;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage.value = 1;
        loadBookmarks();
      }, 600);
    };

    // 加载书签
    const loadBookmarks = async (page = currentPage.value) => {
      if (loading.value) return;

      try {
        loading.value = true;
        const params = new URLSearchParams({
          page: page,
          limit: itemsPerPage.value,
          domain: selectedDomain.value,
          category: selectedCategory.value,
          search: searchQuery.value
        });

        const response = await fetch(`/api/bookmarks?${params}`);
        const data = await response.json();

        if (data.success) {
          bookmarks.value = data.bookmarks || data.data || [];
          currentPage.value = page;
          totalPages.value = Math.ceil((data.total || 0) / itemsPerPage.value);
        } else {
          console.error('加载书签失败:', data.message);
          bookmarks.value = [];
        }
      } catch (error) {
        console.error('加载书签失败:', error);
        bookmarks.value = [];
      } finally {
        loading.value = false;
      }
    };

    // 加载分类
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          categories.value = data.categories || [];
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };

    // 加载域名
    const loadDomains = async () => {
      try {
        const response = await fetch('/api/domains');
        const data = await response.json();
        if (data.success) {
          domains.value = data.domains || [];
        }
      } catch (error) {
        console.error('加载域名失败:', error);
      }
    };

    // 加载统计信息
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        if (data.success) {
          const statsData = data.stats || data.data || {};
          stats.value = {
            bookmarks: statsData.bookmarks_count || statsData.total_bookmarks || 0,
            domains: statsData.domains_count || statsData.total_domains || 0,
            categories: statsData.categories_count || statsData.total_categories || 0
          };
        }
      } catch (error) {
        console.error('加载统计信息失败:', error);
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

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    };

    const openBookmark = (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        loadBookmarks(currentPage.value - 1);
      }
    };

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        loadBookmarks(currentPage.value + 1);
      }
    };

    // 初始化
    onMounted(async () => {
      await Promise.all([
        loadCategories(),
        loadDomains(),
        loadStats(),
        loadBookmarks()
      ]);
    });

    return {
      bookmarks,
      categories,
      domains,
      stats,
      loading,
      searchQuery,
      selectedDomain,
      selectedCategory,
      currentPage,
      totalPages,
      debouncedSearch,
      loadBookmarks,
      getIconUrl,
      handleIconError,
      getCategoryName,
      formatDate,
      openBookmark,
      prevPage,
      nextPage
    };
  }
};

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
                @input="debouncedBookmarkSearch"
              >
            </div>
            <div class="filters">
              <select v-model="bookmarkDomainFilter" @change="loadAdminBookmarks">
                <option value="">所有域名</option>
                <option v-for="domain in domains" :key="domain" :value="domain">
                  {{ domain }}
                </option>
              </select>
              <select v-model="bookmarkCategoryFilter" @change="loadAdminBookmarks">
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
              <button @click="initDatabase" class="btn btn-success" :disabled="dbLoading">
                <i class="fas fa-play"></i>
                初始化数据库
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
                  {{ dbStatus.connected ? '已连接' : '未连接' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">表结构:</span>
                <span :class="['status', dbStatus.tablesExist ? 'success' : 'warning']">
                  {{ dbStatus.tablesExist ? '正常' : '需要初始化' }}
                </span>
              </div>
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

      <!-- 模态框等组件会在后续添加 -->
    </div>
  `,
  setup() {
    // 初始化时加载数据
    onMounted(async () => {
      await Promise.all([
        loadCategories(),
        loadDomains(),
        loadAdminStats(),
        loadAdminBookmarks()
      ]);
    });

    // 监听标签页切换
    watch(activeTab, (newTab) => {
      if (newTab === 'bookmarks') {
        loadAdminBookmarks();
      } else if (newTab === 'categories') {
        loadCategories();
      } else if (newTab === 'database') {
        checkDatabase();
      } else if (newTab === 'settings') {
        loadAdminStats();
      }
    });

    // 返回所有需要的数据和方法
    return adminViewSetup();
  }
};
