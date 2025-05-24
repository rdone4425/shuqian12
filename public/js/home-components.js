/**
 * 前台主页 Vue.js 组件
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
    const loadStats = async () => {
      try {
        const response = await fetch('/api/system/stats');
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
