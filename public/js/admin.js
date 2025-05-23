/**
 * 书签管理系统管理后台脚本
 */

// 全局状态
const adminState = {
  bookmarks: [],
  categories: [],
  domains: [],
  currentPage: 1,
  totalPages: 1,
  itemsPerPage: 20,
  filters: {
    domain: '',
    category: '',
    subcategory: '',
    search: ''
  },
  selectedCategory: null,
  editingBookmark: null,
  editingCategory: null
};

// DOM 元素
const adminElements = {
  // 侧边栏
  addBookmarkBtn: document.getElementById('add-bookmark-btn'),
  addBookmarkBtnMain: document.getElementById('add-bookmark-btn-main'),
  menuItems: document.querySelectorAll('.nav-item'),

  // 标签页
  tabContents: document.querySelectorAll('.tab-content'),
  bookmarksTab: document.getElementById('bookmarks-tab'),
  categoriesTab: document.getElementById('categories-tab'),
  settingsTab: document.getElementById('settings-tab'),

  // 仪表板统计
  dashboardBookmarks: document.getElementById('dashboard-bookmarks'),
  dashboardDomains: document.getElementById('dashboard-domains'),
  dashboardCategories: document.getElementById('dashboard-categories'),
  dashboardStatus: document.getElementById('dashboard-status'),

  // 书签管理
  bookmarkSearch: document.getElementById('bookmark-search'),
  adminDomainFilter: document.getElementById('admin-domain-filter'),
  adminCategoryFilter: document.getElementById('admin-category-filter'),
  adminSubcategoryFilter: document.getElementById('admin-subcategory-filter'),
  adminApplyFilters: document.getElementById('admin-apply-filters'),
  bookmarksTableBody: document.getElementById('bookmarks-table-body'),
  adminPrevPage: document.getElementById('admin-prev-page'),
  adminNextPage: document.getElementById('admin-next-page'),
  adminPageInfo: document.getElementById('admin-page-info'),

  // 分类管理
  addCategoryBtn: document.getElementById('add-category-btn'),
  mainCategories: document.getElementById('main-categories'),
  subcategories: document.getElementById('subcategories'),
  selectedCategory: document.getElementById('selected-category'),

  // 系统设置
  dbInitStatus: document.getElementById('db-init-status'),
  checkDbStatus: document.getElementById('check-db-status'),
  initDatabase: document.getElementById('init-database'),
  exportData: document.getElementById('export-data'),
  importData: document.getElementById('import-data'),
  backupDb: document.getElementById('backup-db'),
  itemsPerPage: document.getElementById('items-per-page'),
  saveSettings: document.getElementById('save-settings'),
  totalBookmarks: document.getElementById('total-bookmarks'),
  totalDomains: document.getElementById('total-domains'),
  totalCategories: document.getElementById('total-categories'),
  lastUpdate: document.getElementById('last-update'),

  // 对话框
  bookmarkDialog: document.getElementById('bookmark-dialog'),
  categoryDialog: document.getElementById('category-dialog'),
  confirmDialog: document.getElementById('confirm-dialog'),
  helpDialog: document.getElementById('help-dialog'),

  // 书签对话框
  dialogTitle: document.getElementById('dialog-title'),
  bookmarkForm: document.getElementById('bookmark-form'),
  bookmarkId: document.getElementById('bookmark-id'),
  bookmarkTitle: document.getElementById('bookmark-title'),
  bookmarkUrl: document.getElementById('bookmark-url'),
  bookmarkCategory: document.getElementById('bookmark-category'),
  bookmarkSubcategory: document.getElementById('bookmark-subcategory'),
  bookmarkIcon: document.getElementById('bookmark-icon'),
  saveBookmark: document.getElementById('save-bookmark'),
  cancelBookmark: document.getElementById('cancel-bookmark'),
  closeBookmarkDialog: document.getElementById('close-bookmark-dialog'),

  // 分类对话框
  categoryDialogTitle: document.getElementById('category-dialog-title'),
  categoryForm: document.getElementById('category-form'),
  categoryId: document.getElementById('category-id'),
  categoryName: document.getElementById('category-name'),
  parentCategory: document.getElementById('parent-category'),
  saveCategory: document.getElementById('save-category'),
  cancelCategory: document.getElementById('cancel-category'),
  closeCategoryDialog: document.getElementById('close-category-dialog'),

  // 确认对话框
  confirmMessage: document.getElementById('confirm-message'),
  confirmOk: document.getElementById('confirm-ok'),
  confirmCancel: document.getElementById('confirm-cancel'),
  closeConfirmDialog: document.getElementById('close-confirm-dialog'),

  // 其他
  dbStatus: document.getElementById('db-status'),
  themeToggle: document.getElementById('theme-toggle'),
  showHelp: document.getElementById('show-help'),
  closeHelp: document.getElementById('close-help')
};

// 初始化
async function initAdmin() {
  try {
    // 检查数据库连接
    await checkDatabaseStatus();

    // 检查数据库初始化状态
    await checkDatabaseInitStatus();

    // 加载设置
    await loadSettings();

    // 加载分类
    await loadCategories();

    // 加载域名
    await loadDomains();

    // 加载书签
    await loadBookmarks();

    // 更新统计信息
    await updateStats();

    // 设置事件监听器
    setupAdminEventListeners();

    // 加载主题
    loadTheme();

    console.log('管理后台初始化完成');
  } catch (error) {
    console.error('管理后台初始化失败:', error);
    showError('系统初始化失败，请刷新页面重试');
  }
}

// 检查数据库状态
async function checkDatabaseStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (data.status === 'ready' || data.status === 'connected' || data.status === 'online') {
      adminElements.dbStatus.textContent = '已连接';
      adminElements.dbStatus.style.color = 'var(--success-color)';
    } else if (data.status === 'needs_setup') {
      adminElements.dbStatus.textContent = '需要初始化';
      adminElements.dbStatus.style.color = 'var(--warning-color)';
      // 不抛出错误，允许继续初始化
    } else {
      adminElements.dbStatus.textContent = '连接失败';
      adminElements.dbStatus.style.color = 'var(--danger-color)';
      console.warn('数据库状态:', data);
      // 不抛出错误，允许继续尝试
    }
  } catch (error) {
    adminElements.dbStatus.textContent = '连接失败';
    adminElements.dbStatus.style.color = 'var(--danger-color)';
    console.error('检查数据库状态失败:', error);
    // 不抛出错误，允许继续尝试
  }
}

// 加载设置
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();

    if (data.success) {
      adminState.itemsPerPage = parseInt(data.settings.items_per_page) || 20;
      adminElements.itemsPerPage.value = adminState.itemsPerPage;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 加载分类
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const data = await response.json();

    if (data.success) {
      adminState.categories = data.categories || data.data || [];

      // 更新分类筛选器
      updateCategoryFilters();

      // 更新分类管理界面
      updateCategoriesDisplay();

      // 更新书签表单中的分类选择器
      updateBookmarkCategoryOptions();
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

// 加载域名
async function loadDomains() {
  try {
    const response = await fetch('/api/domains');
    const data = await response.json();

    if (data.success) {
      adminState.domains = data.domains || data.data || [];

      // 更新域名筛选器
      adminElements.adminDomainFilter.innerHTML = '<option value="">全部</option>';
      adminState.domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        adminElements.adminDomainFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('加载域名失败:', error);
  }
}

// 加载书签
async function loadBookmarks(page = 1) {
  try {
    adminElements.bookmarksTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
        </td>
      </tr>
    `;

    const params = new URLSearchParams({
      page: page,
      limit: adminState.itemsPerPage,
      domain: adminState.filters.domain,
      category: adminState.filters.category,
      subcategory: adminState.filters.subcategory,
      search: adminState.filters.search
    });

    const response = await fetch(`/api/bookmarks?${params}`);
    const data = await response.json();

    if (data.success) {
      adminState.bookmarks = data.bookmarks || data.data || [];
      adminState.currentPage = page;
      adminState.totalPages = Math.ceil((data.total || data.pagination?.total || 0) / adminState.itemsPerPage);

      // 更新分页信息
      updateAdminPagination();

      // 渲染书签表格
      renderBookmarksTable();
    } else {
      showError('加载书签失败');
    }
  } catch (error) {
    console.error('加载书签失败:', error);
    showError('加载书签失败');
  }
}

// 更新统计信息
async function updateStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();

    if (data.success) {
      const stats = data.stats || data.data || {};
      const bookmarksCount = stats.bookmarks_count || stats.total_bookmarks || 0;
      const domainsCount = stats.domains_count || stats.total_domains || 0;
      const categoriesCount = stats.categories_count || stats.total_categories || 0;

      // 更新设置页面的统计
      if (adminElements.totalBookmarks) {
        adminElements.totalBookmarks.textContent = bookmarksCount;
      }
      if (adminElements.totalDomains) {
        adminElements.totalDomains.textContent = domainsCount;
      }
      if (adminElements.totalCategories) {
        adminElements.totalCategories.textContent = categoriesCount;
      }
      if (adminElements.lastUpdate) {
        adminElements.lastUpdate.textContent = stats.last_update ? formatDate(stats.last_update) : '未知';
      }

      // 更新仪表板统计
      if (adminElements.dashboardBookmarks) {
        adminElements.dashboardBookmarks.textContent = bookmarksCount;
      }
      if (adminElements.dashboardDomains) {
        adminElements.dashboardDomains.textContent = domainsCount;
      }
      if (adminElements.dashboardCategories) {
        adminElements.dashboardCategories.textContent = categoriesCount;
      }
      if (adminElements.dashboardStatus) {
        adminElements.dashboardStatus.textContent = '正常';
      }
    }
  } catch (error) {
    console.error('加载统计信息失败:', error);
    // 设置默认值
    if (adminElements.dashboardStatus) {
      adminElements.dashboardStatus.textContent = '异常';
    }
  }
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 显示错误信息
function showError(message) {
  adminElements.bookmarksTableBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="6">
        <div class="loading-content" style="color: #e53e3e;">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${message}</span>
        </div>
      </td>
    </tr>
  `;
}

// 加载主题
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    adminElements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.removeAttribute('data-theme');
    adminElements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// 设置事件监听器
function setupAdminEventListeners() {
  // 侧边栏菜单切换
  adminElements.menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // 添加书签按钮
  adminElements.addBookmarkBtn.addEventListener('click', () => {
    openBookmarkDialog();
  });

  // 主要添加书签按钮
  if (adminElements.addBookmarkBtnMain) {
    adminElements.addBookmarkBtnMain.addEventListener('click', () => {
      openBookmarkDialog();
    });
  }

  // 搜索功能
  adminElements.bookmarkSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      adminState.filters.search = adminElements.bookmarkSearch.value;
      loadBookmarks(1);
    }
  });

  adminElements.bookmarkSearch.addEventListener('input', (e) => {
    // 优化搜索，延迟800ms减少请求
    clearTimeout(adminState.searchTimeout);
    adminState.searchTimeout = setTimeout(() => {
      adminState.filters.search = e.target.value;
      loadBookmarks(1);
    }, 800);
  });

  // 筛选器
  adminElements.adminCategoryFilter.addEventListener('change', () => {
    loadSubcategories(adminElements.adminCategoryFilter.value);
  });

  adminElements.adminApplyFilters.addEventListener('click', () => {
    adminState.filters.domain = adminElements.adminDomainFilter.value;
    adminState.filters.category = adminElements.adminCategoryFilter.value;
    adminState.filters.subcategory = adminElements.adminSubcategoryFilter.value;
    loadBookmarks(1);
  });

  // 分页
  adminElements.adminPrevPage.addEventListener('click', () => {
    if (adminState.currentPage > 1) {
      loadBookmarks(adminState.currentPage - 1);
    }
  });

  adminElements.adminNextPage.addEventListener('click', () => {
    if (adminState.currentPage < adminState.totalPages) {
      loadBookmarks(adminState.currentPage + 1);
    }
  });

  // 分类管理
  adminElements.addCategoryBtn.addEventListener('click', () => {
    openCategoryDialog();
  });

  // 设置
  adminElements.checkDbStatus.addEventListener('click', checkDatabaseInitStatus);
  adminElements.initDatabase.addEventListener('click', initializeDatabase);
  adminElements.saveSettings.addEventListener('click', saveSettings);
  adminElements.exportData.addEventListener('click', exportData);
  adminElements.importData.addEventListener('click', importData);
  adminElements.backupDb.addEventListener('click', backupDatabase);

  // 书签对话框
  adminElements.saveBookmark.addEventListener('click', saveBookmark);
  adminElements.cancelBookmark.addEventListener('click', closeBookmarkDialog);
  adminElements.closeBookmarkDialog.addEventListener('click', closeBookmarkDialog);

  // 分类对话框
  adminElements.saveCategory.addEventListener('click', saveCategory);
  adminElements.cancelCategory.addEventListener('click', closeCategoryDialog);
  adminElements.closeCategoryDialog.addEventListener('click', closeCategoryDialog);

  // 确认对话框
  adminElements.confirmCancel.addEventListener('click', closeConfirmDialog);
  adminElements.closeConfirmDialog.addEventListener('click', closeConfirmDialog);

  // 帮助对话框
  adminElements.showHelp.addEventListener('click', () => {
    adminElements.helpDialog.style.display = 'flex';
  });

  adminElements.closeHelp.addEventListener('click', () => {
    adminElements.helpDialog.style.display = 'none';
  });

  // 主题切换
  adminElements.themeToggle.addEventListener('click', toggleTheme);

  // 点击对话框外部关闭
  [adminElements.bookmarkDialog, adminElements.categoryDialog, adminElements.confirmDialog, adminElements.helpDialog].forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.style.display = 'none';
      }
    });
  });

  // 书签分类选择器变更
  adminElements.bookmarkCategory.addEventListener('change', () => {
    loadBookmarkSubcategories(adminElements.bookmarkCategory.value);
  });
}

// 切换标签页
function switchTab(tabName) {
  // 更新菜单项状态
  adminElements.menuItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    }
  });

  // 更新标签页内容
  adminElements.tabContents.forEach(tab => {
    tab.classList.remove('active');
  });

  const targetTab = document.getElementById(`${tabName}-tab`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // 根据标签页加载相应数据
  switch (tabName) {
    case 'dashboard':
      updateStats();
      break;
    case 'bookmarks':
      loadBookmarks();
      break;
    case 'categories':
      loadCategories();
      break;
    case 'settings':
      updateStats();
      break;
  }
}

// 更新分页信息
function updateAdminPagination() {
  adminElements.adminPageInfo.textContent = `第 ${adminState.currentPage} 页，共 ${adminState.totalPages} 页`;

  adminElements.adminPrevPage.disabled = adminState.currentPage <= 1;
  adminElements.adminNextPage.disabled = adminState.currentPage >= adminState.totalPages;
}

// 渲染书签表格
function renderBookmarksTable() {
  adminElements.bookmarksTableBody.innerHTML = '';

  if (adminState.bookmarks.length === 0) {
    adminElements.bookmarksTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-content">
            <i class="fas fa-search"></i>
            <span>没有找到书签</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  adminState.bookmarks.forEach((bookmark, index) => {
    const row = document.createElement('tr');

    // 查找分类名称
    let categoryName = '未分类';
    if (bookmark.category_name) {
      categoryName = bookmark.category_name;
    } else if (bookmark.category_id) {
      const category = adminState.categories.find(cat => cat.id === bookmark.category_id);
      if (category) categoryName = category.name;
    } else if (bookmark.category) {
      categoryName = bookmark.category;
    }

    row.innerHTML = `
      <td>${(adminState.currentPage - 1) * adminState.itemsPerPage + index + 1}</td>
      <td>
        <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${bookmark.title}">
          ${bookmark.title}
        </div>
      </td>
      <td>
        <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${bookmark.domain}">
          ${bookmark.domain}
        </div>
      </td>
      <td>${categoryName}</td>
      <td>${formatDate(bookmark.created_at)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit-btn" onclick="editBookmark(${bookmark.id})" title="编辑书签">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" onclick="deleteBookmark(${bookmark.id})" title="删除书签">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    adminElements.bookmarksTableBody.appendChild(row);
  });
}

// 更新分类筛选器
function updateCategoryFilters() {
  // 清空分类选择器
  adminElements.adminCategoryFilter.innerHTML = '<option value="">全部</option>';

  // 添加主分类
  const mainCategories = adminState.categories.filter(category => !category.parent_id);
  mainCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    adminElements.adminCategoryFilter.appendChild(option);
  });
}

// 加载子分类
function loadSubcategories(parentId) {
  // 清空子分类选择器
  adminElements.adminSubcategoryFilter.innerHTML = '<option value="">全部</option>';

  if (!parentId) return;

  // 添加子分类
  const subcategories = adminState.categories.filter(category => category.parent_id === parseInt(parentId));
  subcategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    adminElements.adminSubcategoryFilter.appendChild(option);
  });
}

// 切换主题
function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';

  if (isDark) {
    document.body.removeAttribute('data-theme');
    adminElements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    adminElements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', 'dark');
  }
}

// 书签管理功能
function openBookmarkDialog(bookmark = null) {
  adminState.editingBookmark = bookmark;

  if (bookmark) {
    // 编辑模式
    adminElements.dialogTitle.textContent = '编辑书签';
    adminElements.bookmarkId.value = bookmark.id;
    adminElements.bookmarkTitle.value = bookmark.title;
    adminElements.bookmarkUrl.value = bookmark.url;
    adminElements.bookmarkCategory.value = bookmark.category_id || '';
    adminElements.bookmarkIcon.value = bookmark.icon_url || '';

    // 加载子分类
    if (bookmark.category_id) {
      loadBookmarkSubcategories(bookmark.category_id);
      setTimeout(() => {
        adminElements.bookmarkSubcategory.value = bookmark.subcategory_id || '';
      }, 100);
    }
  } else {
    // 添加模式
    adminElements.dialogTitle.textContent = '添加书签';
    adminElements.bookmarkForm.reset();
    adminElements.bookmarkId.value = '';
  }

  adminElements.bookmarkDialog.style.display = 'flex';
}

function closeBookmarkDialog() {
  adminElements.bookmarkDialog.style.display = 'none';
  adminState.editingBookmark = null;
}

async function saveBookmark() {
  const formData = {
    title: adminElements.bookmarkTitle.value.trim(),
    url: adminElements.bookmarkUrl.value.trim(),
    category_id: adminElements.bookmarkCategory.value || null,
    subcategory_id: adminElements.bookmarkSubcategory.value || null,
    icon_url: adminElements.bookmarkIcon.value.trim() || null
  };

  // 验证必填字段
  if (!formData.title || !formData.url) {
    alert('请填写标题和URL');
    return;
  }

  try {
    const isEdit = adminState.editingBookmark !== null;
    const url = isEdit ? `/api/bookmarks/${adminElements.bookmarkId.value}` : '/api/bookmarks';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      closeBookmarkDialog();
      loadBookmarks(adminState.currentPage);
      updateStats();
      alert(isEdit ? '书签更新成功' : '书签添加成功');
    } else {
      alert('操作失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('保存书签失败:', error);
    alert('保存失败，请重试');
  }
}

function editBookmark(id) {
  const bookmark = adminState.bookmarks.find(b => b.id === id);
  if (bookmark) {
    openBookmarkDialog(bookmark);
  }
}

function deleteBookmark(id) {
  const bookmark = adminState.bookmarks.find(b => b.id === id);
  if (!bookmark) return;

  showConfirmDialog(
    `确定要删除书签"${bookmark.title}"吗？`,
    async () => {
      try {
        const response = await fetch(`/api/bookmarks/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          loadBookmarks(adminState.currentPage);
          updateStats();
          alert('书签删除成功');
        } else {
          alert('删除失败: ' + (data.message || '未知错误'));
        }
      } catch (error) {
        console.error('删除书签失败:', error);
        alert('删除失败，请重试');
      }
    }
  );
}

// 更新书签表单中的分类选择器
function updateBookmarkCategoryOptions() {
  adminElements.bookmarkCategory.innerHTML = '<option value="">无分类</option>';

  const mainCategories = adminState.categories.filter(category => !category.parent_id);
  mainCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    adminElements.bookmarkCategory.appendChild(option);
  });
}

// 加载书签表单中的子分类
function loadBookmarkSubcategories(parentId) {
  adminElements.bookmarkSubcategory.innerHTML = '<option value="">无子分类</option>';

  if (!parentId) return;

  const subcategories = adminState.categories.filter(category => category.parent_id === parseInt(parentId));
  subcategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    adminElements.bookmarkSubcategory.appendChild(option);
  });
}

// 分类管理功能
function updateCategoriesDisplay() {
  // 更新主分类列表
  adminElements.mainCategories.innerHTML = '';

  const mainCategories = adminState.categories.filter(category => !category.parent_id);

  if (mainCategories.length === 0) {
    adminElements.mainCategories.innerHTML = '<li class="loading-item">暂无分类</li>';
  } else {
    mainCategories.forEach(category => {
      const li = document.createElement('li');
      li.className = 'category-item';
      li.innerHTML = `
        <span>${category.name}</span>
        <div class="category-actions">
          <button class="admin-btn" onclick="editCategory(${category.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-btn danger-btn" onclick="deleteCategory(${category.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        if (!e.target.closest('.category-actions')) {
          selectCategory(category);
        }
      });

      adminElements.mainCategories.appendChild(li);
    });
  }

  // 清空子分类显示
  adminElements.subcategories.innerHTML = '<li class="placeholder">请先选择一个主分类</li>';
  adminElements.selectedCategory.textContent = '（请选择主分类）';
}

function selectCategory(category) {
  adminState.selectedCategory = category;

  // 更新选中状态
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
  });

  // 找到对应的DOM元素并添加active类
  const categoryItems = document.querySelectorAll('#main-categories .category-item');
  categoryItems.forEach(item => {
    const span = item.querySelector('span');
    if (span && span.textContent === category.name) {
      item.classList.add('active');
    }
  });

  // 更新子分类显示
  adminElements.selectedCategory.textContent = `（${category.name}）`;

  const subcategories = adminState.categories.filter(cat => cat.parent_id === category.id);

  adminElements.subcategories.innerHTML = '';

  if (subcategories.length === 0) {
    adminElements.subcategories.innerHTML = '<li class="placeholder">该分类下暂无子分类</li>';
  } else {
    subcategories.forEach(subcategory => {
      const li = document.createElement('li');
      li.className = 'category-item';
      li.innerHTML = `
        <span>${subcategory.name}</span>
        <div class="category-actions">
          <button class="admin-btn" onclick="editCategory(${subcategory.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-btn danger-btn" onclick="deleteCategory(${subcategory.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      adminElements.subcategories.appendChild(li);
    });
  }
}

function openCategoryDialog(category = null) {
  adminState.editingCategory = category;

  // 更新父分类选择器
  adminElements.parentCategory.innerHTML = '<option value="">无（创建主分类）</option>';

  const mainCategories = adminState.categories.filter(cat => !cat.parent_id);
  mainCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    adminElements.parentCategory.appendChild(option);
  });

  if (category) {
    // 编辑模式
    adminElements.categoryDialogTitle.textContent = '编辑分类';
    adminElements.categoryId.value = category.id;
    adminElements.categoryName.value = category.name;
    adminElements.parentCategory.value = category.parent_id || '';
  } else {
    // 添加模式
    adminElements.categoryDialogTitle.textContent = '添加分类';
    adminElements.categoryForm.reset();
    adminElements.categoryId.value = '';

    // 如果有选中的分类，默认作为父分类
    if (adminState.selectedCategory) {
      adminElements.parentCategory.value = adminState.selectedCategory.id;
    }
  }

  adminElements.categoryDialog.style.display = 'flex';
}

function closeCategoryDialog() {
  adminElements.categoryDialog.style.display = 'none';
  adminState.editingCategory = null;
}

async function saveCategory() {
  const formData = {
    name: adminElements.categoryName.value.trim(),
    parent_id: adminElements.parentCategory.value || null
  };

  if (!formData.name) {
    alert('请填写分类名称');
    return;
  }

  try {
    const isEdit = adminState.editingCategory !== null;
    const url = isEdit ? `/api/categories/${adminElements.categoryId.value}` : '/api/categories';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      closeCategoryDialog();
      loadCategories();
      updateStats();
      alert(isEdit ? '分类更新成功' : '分类添加成功');
    } else {
      alert('操作失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('保存分类失败:', error);
    alert('保存失败，请重试');
  }
}

function editCategory(id) {
  const category = adminState.categories.find(c => c.id === id);
  if (category) {
    openCategoryDialog(category);
  }
}

function deleteCategory(id) {
  const category = adminState.categories.find(c => c.id === id);
  if (!category) return;

  showConfirmDialog(
    `确定要删除分类"${category.name}"吗？删除主分类将同时删除其所有子分类。`,
    async () => {
      try {
        const response = await fetch(`/api/categories/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          loadCategories();
          updateStats();
          alert('分类删除成功');
        } else {
          alert('删除失败: ' + (data.message || '未知错误'));
        }
      } catch (error) {
        console.error('删除分类失败:', error);
        alert('删除失败，请重试');
      }
    }
  );
}

// 确认对话框
function showConfirmDialog(message, onConfirm) {
  adminElements.confirmMessage.textContent = message;
  adminElements.confirmDialog.style.display = 'flex';

  // 移除之前的事件监听器
  adminElements.confirmOk.replaceWith(adminElements.confirmOk.cloneNode(true));
  adminElements.confirmOk = document.getElementById('confirm-ok');

  // 添加新的事件监听器
  adminElements.confirmOk.addEventListener('click', () => {
    closeConfirmDialog();
    onConfirm();
  });
}

function closeConfirmDialog() {
  adminElements.confirmDialog.style.display = 'none';
}

// 系统设置功能
async function saveSettings() {
  const itemsPerPage = parseInt(adminElements.itemsPerPage.value);

  if (itemsPerPage < 10 || itemsPerPage > 100) {
    alert('每页显示数量必须在10-100之间');
    return;
  }

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items_per_page: itemsPerPage
      })
    });

    const data = await response.json();

    if (data.success) {
      adminState.itemsPerPage = itemsPerPage;
      alert('设置保存成功');
    } else {
      alert('保存失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    alert('保存失败，请重试');
  }
}

async function exportData() {
  try {
    const response = await fetch('/api/export');
    const data = await response.json();

    if (data.success) {
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('数据导出成功');
    } else {
      alert('导出失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('导出数据失败:', error);
    alert('导出失败，请重试');
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        loadBookmarks();
        loadCategories();
        updateStats();
        alert('数据导入成功');
      } else {
        alert('导入失败: ' + (result.message || '未知错误'));
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  input.click();
}

async function backupDatabase() {
  try {
    const response = await fetch('/api/backup', {
      method: 'POST'
    });

    const data = await response.json();

    if (data.success) {
      alert('数据库备份成功');
      updateStats();
    } else {
      alert('备份失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('备份数据库失败:', error);
    alert('备份失败，请重试');
  }
}

// 检查数据库初始化状态
async function checkDatabaseInitStatus() {
  try {
    const response = await fetch('/api/setup');
    const data = await response.json();

    updateDatabaseStatusDisplay(data);
  } catch (error) {
    console.error('检查数据库初始化状态失败:', error);
    adminElements.dbInitStatus.innerHTML = `
      <div class="status-indicator error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>检查失败: ${error.message}</span>
      </div>
    `;
  }
}

// 更新数据库状态显示
function updateDatabaseStatusDisplay(data) {
  if (!data.success) {
    if (data.status === 'no_binding') {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator warning">
          <i class="fas fa-exclamation-triangle"></i>
          <span>未绑定D1数据库</span>
        </div>
        <div class="status-details">
          <p>请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）</p>
        </div>
      `;
      adminElements.initDatabase.style.display = 'none';
    } else if (data.status === 'connection_error') {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator error">
          <i class="fas fa-times-circle"></i>
          <span>数据库连接失败</span>
        </div>
        <div class="status-details">
          <p>${data.message}</p>
        </div>
      `;
      adminElements.initDatabase.style.display = 'none';
    } else {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator error">
          <i class="fas fa-times-circle"></i>
          <span>检查失败</span>
        </div>
        <div class="status-details">
          <p>${data.message}</p>
        </div>
      `;
      adminElements.initDatabase.style.display = 'none';
    }
  } else {
    if (data.status === 'ready') {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator success">
          <i class="fas fa-check-circle"></i>
          <span>数据库已完全初始化</span>
        </div>
        <div class="status-details">
          <p>书签: ${data.details.data.bookmarks} | 分类: ${data.details.data.categories} | 设置: ${data.details.data.settings}</p>
        </div>
      `;
      adminElements.initDatabase.style.display = 'none';
    } else if (data.status === 'needs_setup') {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator warning">
          <i class="fas fa-exclamation-triangle"></i>
          <span>需要初始化表结构</span>
        </div>
        <div class="status-details">
          <p>缺少表: ${data.details.missing_tables.join(', ')}</p>
        </div>
      `;
      adminElements.initDatabase.style.display = 'inline-block';
    }
  }
}

// 初始化数据库
async function initializeDatabase() {
  try {
    adminElements.initDatabase.disabled = true;
    adminElements.initDatabase.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 初始化中...';

    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator success">
          <i class="fas fa-check-circle"></i>
          <span>数据库初始化成功</span>
        </div>
        <div class="status-details">
          <ul>
            ${data.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        </div>
      `;
      adminElements.initDatabase.style.display = 'none';

      // 重新加载数据
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      adminElements.dbInitStatus.innerHTML = `
        <div class="status-indicator error">
          <i class="fas fa-times-circle"></i>
          <span>初始化失败</span>
        </div>
        <div class="status-details">
          <p>${data.message}</p>
        </div>
      `;
      adminElements.initDatabase.disabled = false;
      adminElements.initDatabase.innerHTML = '<i class="fas fa-database"></i> 一键初始化';
    }
  } catch (error) {
    console.error('初始化数据库失败:', error);
    adminElements.dbInitStatus.innerHTML = `
      <div class="status-indicator error">
        <i class="fas fa-times-circle"></i>
        <span>初始化失败</span>
      </div>
      <div class="status-details">
        <p>${error.message}</p>
      </div>
    `;
    adminElements.initDatabase.disabled = false;
    adminElements.initDatabase.innerHTML = '<i class="fas fa-database"></i> 一键初始化';
  }
}

// 分类管理功能
function openCategoryDialog(category = null) {
  adminState.editingCategory = category;

  if (category) {
    // 编辑模式
    adminElements.categoryDialogTitle.textContent = '编辑分类';
    adminElements.categoryId.value = category.id;
    adminElements.categoryName.value = category.name;
    adminElements.parentCategory.value = category.parent_id || '';
  } else {
    // 添加模式
    adminElements.categoryDialogTitle.textContent = '添加分类';
    adminElements.categoryForm.reset();
    adminElements.categoryId.value = '';
  }

  // 更新父分类选择器
  updateParentCategoryOptions();
  adminElements.categoryDialog.style.display = 'flex';
}

function closeCategoryDialog() {
  adminElements.categoryDialog.style.display = 'none';
  adminState.editingCategory = null;
}

async function saveCategory() {
  const formData = {
    name: adminElements.categoryName.value.trim(),
    parent_id: adminElements.parentCategory.value || null
  };

  // 验证必填字段
  if (!formData.name) {
    alert('请填写分类名称');
    return;
  }

  try {
    const isEdit = adminState.editingCategory !== null;
    const url = isEdit ? `/api/categories/${adminElements.categoryId.value}` : '/api/categories';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      closeCategoryDialog();
      loadCategories();
      updateStats();
      alert(isEdit ? '分类更新成功' : '分类添加成功');
    } else {
      alert('操作失败: ' + (data.message || '未知错误'));
    }
  } catch (error) {
    console.error('保存分类失败:', error);
    alert('保存失败，请重试');
  }
}

function editCategory(id) {
  const category = adminState.categories.find(c => c.id === id);
  if (category) {
    openCategoryDialog(category);
  }
}

function deleteCategory(id) {
  const category = adminState.categories.find(c => c.id === id);
  if (!category) return;

  showConfirmDialog(
    `确定要删除分类"${category.name}"吗？`,
    async () => {
      try {
        const response = await fetch(`/api/categories/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          loadCategories();
          updateStats();
          alert('分类删除成功');
        } else {
          alert('删除失败: ' + (data.message || '未知错误'));
        }
      } catch (error) {
        console.error('删除分类失败:', error);
        alert('删除失败，请重试');
      }
    }
  );
}

function updateParentCategoryOptions() {
  adminElements.parentCategory.innerHTML = '<option value="">无（创建主分类）</option>';

  const mainCategories = adminState.categories.filter(category => !category.parent_id);
  mainCategories.forEach(category => {
    // 如果是编辑模式，不能选择自己作为父分类
    if (adminState.editingCategory && adminState.editingCategory.id === category.id) {
      return;
    }

    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    adminElements.parentCategory.appendChild(option);
  });
}

// 确认对话框
function showConfirmDialog(message, onConfirm) {
  adminElements.confirmMessage.textContent = message;
  adminElements.confirmDialog.style.display = 'flex';

  // 移除之前的事件监听器
  adminElements.confirmOk.onclick = null;

  // 添加新的事件监听器
  adminElements.confirmOk.onclick = () => {
    closeConfirmDialog();
    onConfirm();
  };
}

function closeConfirmDialog() {
  adminElements.confirmDialog.style.display = 'none';
  adminElements.confirmOk.onclick = null;
}

// 全局函数，供HTML onclick使用
window.editBookmark = editBookmark;
window.deleteBookmark = deleteBookmark;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.switchTab = switchTab;

// 初始化应用
document.addEventListener('DOMContentLoaded', initAdmin);
