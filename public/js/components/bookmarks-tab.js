/**
 * Bookmarks Tab Component
 * 书签管理标签页组件
 */

window.BookmarksTab = {
  template: `
    <div class="tab-panel">
      <div class="panel-header">
        <h2>书签管理</h2>
        <div class="header-actions">
          <button @click="showAddForm = true" class="btn btn-primary" type="button">
            <i class="fas fa-plus"></i>
            添加书签
          </button>
          <button @click="refreshBookmarks" class="btn btn-secondary" :disabled="loading" type="button">
            <i class="fas fa-sync" :class="{ 'fa-spin': loading }"></i>
            刷新
          </button>
        </div>
      </div>

      <!-- 搜索和过滤 -->
      <div class="search-filters">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            @input="debouncedSearch"
            type="text" 
            placeholder="搜索书签标题、URL或描述..."
            class="form-control"
          >
          <i class="fas fa-search search-icon"></i>
        </div>
        
        <div class="filter-controls">
          <select v-model="selectedCategory" @change="loadBookmarks" class="form-control">
            <option value="">所有分类</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
          
          <select v-model="selectedDomain" @change="loadBookmarks" class="form-control">
            <option value="">所有域名</option>
            <option v-for="domain in domains" :key="domain" :value="domain">
              {{ domain }}
            </option>
          </select>
        </div>
      </div>

      <!-- 书签列表 -->
      <div class="bookmarks-container">
        <div v-if="loading" class="loading-placeholder">
          <i class="fas fa-spinner fa-spin"></i> 加载中...
        </div>
        
        <div v-else-if="bookmarks.length === 0" class="empty-state">
          <i class="fas fa-bookmark empty-icon"></i>
          <h3>暂无书签</h3>
          <p>{{ searchQuery ? '没有找到匹配的书签' : '开始添加您的第一个书签吧！' }}</p>
          <button v-if="!searchQuery" @click="showAddForm = true" class="btn btn-primary" type="button">
            <i class="fas fa-plus"></i>
            添加书签
          </button>
        </div>
        
        <div v-else class="bookmarks-grid">
          <div v-for="bookmark in bookmarks" :key="bookmark.id" class="bookmark-card">
            <div class="bookmark-header">
              <div class="bookmark-favicon">
                <img v-if="bookmark.icon_url" :src="bookmark.icon_url" :alt="bookmark.domain" @error="handleImageError">
                <i v-else class="fas fa-bookmark"></i>
              </div>
              <div class="bookmark-info">
                <h4 class="bookmark-title">{{ bookmark.title }}</h4>
                <a :href="bookmark.url" target="_blank" class="bookmark-url">{{ bookmark.domain }}</a>
              </div>
              <div class="bookmark-actions">
                <button @click="editBookmark(bookmark)" class="btn-icon" title="编辑" type="button">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="deleteBookmark(bookmark)" class="btn-icon btn-danger" title="删除" type="button">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div v-if="bookmark.description" class="bookmark-description">
              {{ bookmark.description }}
            </div>
            
            <div class="bookmark-meta">
              <span v-if="bookmark.category_name" class="bookmark-category">
                <i class="fas fa-folder"></i>
                {{ bookmark.category_name }}
              </span>
              <span class="bookmark-date">
                <i class="fas fa-clock"></i>
                {{ formatDate(bookmark.created_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination && pagination.pages > 1" class="pagination-container">
          <div class="pagination">
            <button 
              @click="changePage(pagination.page - 1)" 
              :disabled="pagination.page <= 1"
              class="btn btn-sm"
              type="button"
            >
              <i class="fas fa-chevron-left"></i>
              上一页
            </button>
            
            <span class="page-info">
              第 {{ pagination.page }} 页，共 {{ pagination.pages }} 页
            </span>
            
            <button 
              @click="changePage(pagination.page + 1)" 
              :disabled="pagination.page >= pagination.pages"
              class="btn btn-sm"
              type="button"
            >
              下一页
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 添加/编辑书签模态框 -->
      <div v-if="showAddForm || editingBookmark" class="modal-overlay" @click="closeForm">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ editingBookmark ? '编辑书签' : '添加书签' }}</h3>
            <button @click="closeForm" class="btn-close" type="button">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <form @submit.prevent="saveBookmark" class="bookmark-form">
            <div class="form-group">
              <label for="bookmark-title">标题 *</label>
              <input 
                id="bookmark-title"
                v-model="formData.title" 
                type="text" 
                class="form-control" 
                required
                placeholder="请输入书签标题"
              >
            </div>
            
            <div class="form-group">
              <label for="bookmark-url">URL *</label>
              <input 
                id="bookmark-url"
                v-model="formData.url" 
                type="url" 
                class="form-control" 
                required
                placeholder="https://example.com"
              >
            </div>
            
            <div class="form-group">
              <label for="bookmark-category">分类</label>
              <select id="bookmark-category" v-model="formData.category_id" class="form-control">
                <option value="">无分类</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="bookmark-description">描述</label>
              <textarea 
                id="bookmark-description"
                v-model="formData.description" 
                class="form-control" 
                rows="3"
                placeholder="可选的书签描述"
              ></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="closeForm" class="btn btn-secondary">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                {{ saving ? '保存中...' : (editingBookmark ? '更新' : '添加') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      bookmarks: [],
      categories: [],
      domains: [],
      pagination: null,
      loading: false,
      saving: false,
      searchQuery: '',
      selectedCategory: '',
      selectedDomain: '',
      showAddForm: false,
      editingBookmark: null,
      formData: {
        title: '',
        url: '',
        category_id: '',
        description: ''
      },
      searchTimeout: null
    };
  },
  mounted() {
    this.loadBookmarks();
    this.loadCategories();
  },
  methods: {
    async loadBookmarks(page = 1) {
      this.loading = true;
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20'
        });
        
        if (this.searchQuery) params.append('search', this.searchQuery);
        if (this.selectedCategory) params.append('category', this.selectedCategory);
        if (this.selectedDomain) params.append('domain', this.selectedDomain);

        const response = await fetch(`/api/bookmarks?${params}`);
        const data = await response.json();
        
        if (data.success) {
          this.bookmarks = data.bookmarks || [];
          this.pagination = data.pagination;
          
          // 提取域名列表
          const domains = [...new Set(this.bookmarks.map(b => b.domain))];
          this.domains = domains.sort();
        }
      } catch (error) {
        console.error('加载书签失败:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          this.categories = data.categories || [];
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    },

    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadBookmarks(1);
      }, 500);
    },

    changePage(page) {
      if (page >= 1 && page <= this.pagination.pages) {
        this.loadBookmarks(page);
      }
    },

    refreshBookmarks() {
      this.loadBookmarks(this.pagination?.page || 1);
    },

    editBookmark(bookmark) {
      this.editingBookmark = bookmark;
      this.formData = {
        title: bookmark.title,
        url: bookmark.url,
        category_id: bookmark.category_id || '',
        description: bookmark.description || ''
      };
    },

    async deleteBookmark(bookmark) {
      if (!confirm(`确定要删除书签"${bookmark.title}"吗？`)) {
        return;
      }

      try {
        const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          this.loadBookmarks(this.pagination?.page || 1);
        } else {
          alert('删除失败');
        }
      } catch (error) {
        console.error('删除书签失败:', error);
        alert('删除失败');
      }
    },

    async saveBookmark() {
      this.saving = true;
      try {
        const url = this.editingBookmark 
          ? `/api/bookmarks/${this.editingBookmark.id}`
          : '/api/bookmarks';
        
        const method = this.editingBookmark ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.formData)
        });

        const data = await response.json();
        
        if (data.success) {
          this.closeForm();
          this.loadBookmarks(this.pagination?.page || 1);
        } else {
          alert(data.message || '保存失败');
        }
      } catch (error) {
        console.error('保存书签失败:', error);
        alert('保存失败');
      } finally {
        this.saving = false;
      }
    },

    closeForm() {
      this.showAddForm = false;
      this.editingBookmark = null;
      this.formData = {
        title: '',
        url: '',
        category_id: '',
        description: ''
      };
    },

    handleImageError(event) {
      event.target.style.display = 'none';
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    }
  }
};
