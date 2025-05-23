/**
 * 书签管理系统前台脚本
 */

// 全局变量
const state = {
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
  }
};

// DOM 元素
const elements = {
  bookmarksList: document.getElementById('bookmarks-list'),
  domainFilter: document.getElementById('domain-filter'),
  categoryFilter: document.getElementById('category-filter'),
  subcategoryFilter: document.getElementById('subcategory-filter'),
  searchInput: document.getElementById('search-input'),
  applyFilters: document.getElementById('apply-filters'),
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  totalCount: document.getElementById('total-count'),
  domainCount: document.getElementById('domain-count'),
  categoryCount: document.getElementById('category-count'),
  dbStatus: document.getElementById('db-status'),
  themeToggle: document.getElementById('theme-toggle')
};

// 初始化
async function init() {
  try {
    // 检查数据库连接
    await checkDatabaseStatus();

    // 加载设置
    await loadSettings();

    // 加载分类
    await loadCategories();

    // 加载域名
    await loadDomains();

    // 加载书签
    await loadBookmarks();

    // 更新统计信息
    updateStats();

    // 设置事件监听器
    setupEventListeners();

    // 加载主题
    loadTheme();
  } catch (error) {
    console.error('初始化失败:', error);
    showError('系统初始化失败，请刷新页面重试');
  }
}

// 检查数据库状态
async function checkDatabaseStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (data.status === 'ready' || data.status === 'connected' || data.status === 'online') {
      elements.dbStatus.textContent = '已连接';
      elements.dbStatus.style.color = '#10b981';
    } else if (data.status === 'needs_setup') {
      elements.dbStatus.textContent = '需要初始化';
      elements.dbStatus.style.color = '#f59e0b';
      console.warn('数据库需要初始化，请访问管理后台进行初始化');
      // 不抛出错误，允许继续加载其他组件
    } else {
      elements.dbStatus.textContent = '连接失败';
      elements.dbStatus.style.color = '#ef4444';
      console.error('数据库状态:', data);
      // 不抛出错误，允许继续尝试加载
    }
  } catch (error) {
    elements.dbStatus.textContent = '连接失败';
    elements.dbStatus.style.color = '#ef4444';
    console.error('检查数据库状态失败:', error);
    // 不抛出错误，允许继续尝试加载
  }
}

// 加载设置
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();

    if (data.success && data.settings) {
      // 处理新的设置格式（对象包含value属性）
      if (data.settings.items_per_page) {
        const itemsPerPage = data.settings.items_per_page.value || data.settings.items_per_page;
        state.itemsPerPage = parseInt(itemsPerPage) || 20;
      } else {
        state.itemsPerPage = 20; // 默认值
      }
    } else {
      console.warn('加载设置失败，使用默认值:', data.message);
      state.itemsPerPage = 20; // 默认值
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    state.itemsPerPage = 20; // 默认值
  }
}

// 加载分类
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const data = await response.json();

    if (data.success) {
      state.categories = data.categories;

      // 清空分类选择器
      elements.categoryFilter.innerHTML = '<option value="">所有分类</option>';

      // 添加主分类
      const mainCategories = state.categories.filter(category => !category.parent_id);
      mainCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        elements.categoryFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

// 加载子分类
function loadSubcategories(parentId) {
  // 清空子分类选择器
  elements.subcategoryFilter.innerHTML = '<option value="">全部</option>';

  if (!parentId) return;

  // 添加子分类
  const subcategories = state.categories.filter(category => category.parent_id === parseInt(parentId));
  subcategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    elements.subcategoryFilter.appendChild(option);
  });
}

// 加载域名
async function loadDomains() {
  try {
    const response = await fetch('/api/domains');
    const data = await response.json();

    if (data.success) {
      state.domains = data.domains;

      // 清空域名选择器
      elements.domainFilter.innerHTML = '<option value="">所有网站</option>';

      // 添加域名
      state.domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        elements.domainFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('加载域名失败:', error);
  }
}

// 加载书签
async function loadBookmarks(page = 1) {
  try {
    elements.bookmarksList.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>
    `;

    const params = new URLSearchParams({
      page: page,
      limit: state.itemsPerPage,
      domain: state.filters.domain,
      category: state.filters.category,
      subcategory: state.filters.subcategory,
      search: state.filters.search
    });

    const response = await fetch(`/api/bookmarks?${params}`);
    const data = await response.json();

    console.log('书签API响应:', data); // 调试信息

    if (data.success) {
      // 兼容两种数据格式：data.bookmarks 或 data.data
      const bookmarksArray = data.bookmarks || data.data || [];

      console.log('提取的书签数组:', bookmarksArray); // 调试信息
      console.log('书签数组类型:', Array.isArray(bookmarksArray)); // 调试信息

      if (Array.isArray(bookmarksArray)) {
        state.bookmarks = bookmarksArray;
        state.currentPage = page;

        // 兼容两种分页格式：data.total 或 data.pagination.total
        const total = data.total || (data.pagination && data.pagination.total) || 0;
        state.totalPages = Math.ceil(total / state.itemsPerPage);

        console.log('加载的书签数量:', state.bookmarks.length); // 调试信息
        console.log('总数量:', total); // 调试信息
        console.log('总页数:', state.totalPages); // 调试信息

        // 更新分页信息
        updatePagination();

        // 渲染书签列表
        renderBookmarks();
      } else {
        console.error('书签数据不是数组:', bookmarksArray);
        // 确保bookmarks是空数组
        state.bookmarks = [];
        state.currentPage = 1;
        state.totalPages = 0;
        showError('书签数据格式错误');
        updatePagination();
      }
    } else {
      // 确保bookmarks是空数组，避免undefined错误
      state.bookmarks = [];
      state.currentPage = 1;
      state.totalPages = 0;

      console.error('API返回失败状态:', data); // 调试信息

      // 显示错误信息
      const errorMessage = data.message || data.error || '加载书签失败';
      showError(errorMessage);

      // 更新分页信息
      updatePagination();
    }
  } catch (error) {
    console.error('加载书签失败:', error);

    // 确保bookmarks是空数组，避免undefined错误
    state.bookmarks = [];
    state.currentPage = 1;
    state.totalPages = 0;

    showError('加载书签失败: ' + error.message);

    // 更新分页信息
    updatePagination();
  }
}

// 渲染书签列表
function renderBookmarks() {
  console.log('开始渲染书签，数量:', state.bookmarks.length); // 调试信息

  // 清空书签列表
  elements.bookmarksList.innerHTML = '';

  // 安全检查：确保bookmarks是数组
  if (!Array.isArray(state.bookmarks)) {
    console.warn('state.bookmarks不是数组:', state.bookmarks);
    state.bookmarks = [];
  }

  if (state.bookmarks.length === 0) {
    console.log('没有书签数据，显示空状态'); // 调试信息
    elements.bookmarksList.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-search"></i>
        <p>没有找到书签</p>
      </div>
    `;
    return;
  }

  // 获取书签模板
  const template = document.getElementById('bookmark-template');

  // 渲染每个书签
  state.bookmarks.forEach((bookmark, index) => {
    console.log(`渲染书签 ${index + 1}:`, bookmark); // 调试信息

    const bookmarkElement = document.importNode(template.content, true);

    // 设置书签数据
    const title = bookmarkElement.querySelector('.bookmark-title a');
    title.href = bookmark.url;
    title.textContent = bookmark.title;

    const url = bookmarkElement.querySelector('.bookmark-url');
    url.textContent = bookmark.url;

    const domain = bookmarkElement.querySelector('.bookmark-domain');
    domain.textContent = bookmark.domain;

    // 处理分类名称 - 兼容不同的字段名
    let categoryName = '未分类';
    if (bookmark.category_name) {
      categoryName = bookmark.category_name;
    } else if (bookmark.category_id) {
      const category = state.categories.find(cat => cat.id === bookmark.category_id);
      if (category) categoryName = category.name;
    } else if (bookmark.category) {
      categoryName = bookmark.category;
    }

    const category = bookmarkElement.querySelector('.bookmark-category');
    category.textContent = categoryName;

    const dateText = bookmarkElement.querySelector('.date-text');
    dateText.textContent = formatDate(bookmark.created_at);

    const icon = bookmarkElement.querySelector('.bookmark-favicon img');
    if (bookmark.icon_url) {
      icon.src = bookmark.icon_url;
      icon.onerror = () => {
        icon.src = `https://www.google.com/s2/favicons?domain=${bookmark.domain}&sz=32`;
      };
    } else {
      icon.src = `https://www.google.com/s2/favicons?domain=${bookmark.domain}&sz=32`;
    }
    icon.alt = `${bookmark.title} 图标`;

    // 添加到书签列表
    elements.bookmarksList.appendChild(bookmarkElement);
  });
}

// 更新分页信息
function updatePagination() {
  if (state.totalPages > 0) {
    elements.pageInfo.textContent = `第 ${state.currentPage} 页，共 ${state.totalPages} 页`;
  } else {
    elements.pageInfo.textContent = '暂无数据';
  }

  // 更新上一页按钮状态
  if (state.currentPage <= 1) {
    elements.prevPage.disabled = true;
  } else {
    elements.prevPage.disabled = false;
  }

  // 更新下一页按钮状态
  if (state.currentPage >= state.totalPages) {
    elements.nextPage.disabled = true;
  } else {
    elements.nextPage.disabled = false;
  }
}

// 更新统计信息
function updateStats() {
  fetch('/api/stats')
    .then(response => response.json())
    .then(data => {
      console.log('统计API响应:', data); // 调试信息
      if (data.success) {
        // 兼容不同的数据格式
        const stats = data.stats || data.data || {};
        elements.totalCount.textContent = stats.bookmarks_count || stats.total_bookmarks || 0;
        elements.domainCount.textContent = stats.domains_count || stats.total_domains || 0;
        elements.categoryCount.textContent = stats.categories_count || stats.total_categories || 0;
      } else {
        console.warn('统计信息加载失败:', data);
        // 设置默认值
        elements.totalCount.textContent = '0';
        elements.domainCount.textContent = '0';
        elements.categoryCount.textContent = '0';
      }
    })
    .catch(error => {
      console.error('加载统计信息失败:', error);
      // 设置默认值
      elements.totalCount.textContent = '0';
      elements.domainCount.textContent = '0';
      elements.categoryCount.textContent = '0';
    });
}

// 设置事件监听器
function setupEventListeners() {
  // 分类筛选器变更时加载子分类
  elements.categoryFilter.addEventListener('change', () => {
    loadSubcategories(elements.categoryFilter.value);
  });

  // 应用筛选器
  elements.applyFilters.addEventListener('click', () => {
    state.filters.domain = elements.domainFilter.value;
    state.filters.category = elements.categoryFilter.value;
    state.filters.subcategory = elements.subcategoryFilter.value;
    state.filters.search = elements.searchInput.value;
    loadBookmarks(1);
  });

  // 回车键应用筛选
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.applyFilters.click();
    }
  });

  // 分页按钮
  elements.prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) {
      loadBookmarks(state.currentPage - 1);
    }
  });

  elements.nextPage.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
      loadBookmarks(state.currentPage + 1);
    }
  });

  // 主题切换
  elements.themeToggle.addEventListener('click', toggleTheme);

  // 快捷键
  document.addEventListener('keydown', (e) => {
    // Alt + D: 聚焦域名筛选器
    if (e.altKey && e.key === 'd') {
      elements.domainFilter.focus();
      e.preventDefault();
    }

    // Alt + C: 聚焦分类筛选器
    if (e.altKey && e.key === 'c') {
      elements.categoryFilter.focus();
      e.preventDefault();
    }

    // Alt + S: 聚焦搜索框
    if (e.altKey && e.key === 's') {
      elements.searchInput.focus();
      e.preventDefault();
    }

    // Alt + T: 切换主题
    if (e.altKey && e.key === 't') {
      toggleTheme();
      e.preventDefault();
    }

    // Alt + ←: 上一页
    if (e.altKey && e.key === 'ArrowLeft') {
      if (!elements.prevPage.disabled) {
        elements.prevPage.click();
      }
      e.preventDefault();
    }

    // Alt + →: 下一页
    if (e.altKey && e.key === 'ArrowRight') {
      if (!elements.nextPage.disabled) {
        elements.nextPage.click();
      }
      e.preventDefault();
    }
  });
}

// 切换主题
function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';

  if (isDark) {
    document.body.removeAttribute('data-theme');
    elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', 'dark');
  }
}

// 加载主题
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.removeAttribute('data-theme');
    elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 显示错误信息
function showError(message) {
  let errorHtml = `<div class="loading" style="color: var(--danger-color);">${message}</div>`;

  // 如果是数据库相关错误，显示更友好的提示
  if (message.includes('数据库表未初始化') || message.includes('no such table')) {
    errorHtml = `
      <div class="error-container" style="text-align: center; padding: 40px; color: var(--text-color);">
        <div style="font-size: 48px; margin-bottom: 20px;">🗄️</div>
        <h3 style="color: var(--warning-color); margin-bottom: 15px;">数据库需要初始化</h3>
        <p style="margin-bottom: 20px; color: var(--text-secondary);">
          系统检测到数据库表尚未创建，请先进行初始化操作。
        </p>
        <a href="/admin.html" style="
          display: inline-block;
          padding: 12px 24px;
          background: var(--primary-color);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        ">前往管理后台初始化</a>
      </div>
    `;
  } else if (message.includes('数据库未绑定')) {
    errorHtml = `
      <div class="error-container" style="text-align: center; padding: 40px; color: var(--text-color);">
        <div style="font-size: 48px; margin-bottom: 20px;">🔗</div>
        <h3 style="color: var(--danger-color); margin-bottom: 15px;">数据库未绑定</h3>
        <p style="margin-bottom: 20px; color: var(--text-secondary);">
          请在Cloudflare Pages项目设置中绑定D1数据库（变量名：DB）。
        </p>
      </div>
    `;
  }

  elements.bookmarksList.innerHTML = errorHtml;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

// admin.js - 管理后台脚本
if (window.location.pathname.includes('admin.html')) {
  const adminState = {
    currentTab: 'bookmarks',
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10, // 减少每页数量，提高加载速度
    bookmarks: [],
    categories: [],
    domains: [],
    filters: { domain: '', category: '', search: '' },
    isLoading: false, // 添加加载状态，防止重复请求
    cache: new Map(), // 添加缓存机制
    lastRequestKey: '', // 记录最后一次请求的key
    stateRestored: false // 标记是否已恢复状态
  };

  const adminElements = {
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    dbStatus: document.getElementById('db-status'),
    bookmarkSearch: document.getElementById('bookmark-search'),
    domainFilter: document.getElementById('domain-filter'),
    categoryFilter: document.getElementById('category-filter'),
    addBookmarkBtn: document.getElementById('add-bookmark-btn'),
    bookmarksTable: document.getElementById('bookmarks-table'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    addCategoryBtn: document.getElementById('add-category-btn'),
    categoriesTable: document.getElementById('categories-table'),
    totalBookmarks: document.getElementById('total-bookmarks'),
    totalDomains: document.getElementById('total-domains'),
    totalCategories: document.getElementById('total-categories'),
    dbStatusText: document.getElementById('db-status-text'),
    checkDbBtn: document.getElementById('check-db-btn'),
    initDbBtn: document.getElementById('init-db-btn'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    backupBtn: document.getElementById('backup-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn')
  };

  // 保存状态到URL和localStorage
  function adminSaveState() {
    const state = {
      tab: adminState.currentTab,
      page: adminState.currentPage,
      filters: adminState.filters,
      itemsPerPage: adminState.itemsPerPage
    };

    // 保存到localStorage
    localStorage.setItem('adminState', JSON.stringify(state));

    // 更新URL参数
    const url = new URL(window.location);
    url.searchParams.set('tab', adminState.currentTab);
    url.searchParams.set('page', adminState.currentPage);

    // 清除空的参数
    if (adminState.filters.search) {
      url.searchParams.set('search', adminState.filters.search);
    } else {
      url.searchParams.delete('search');
    }

    if (adminState.filters.domain) {
      url.searchParams.set('domain', adminState.filters.domain);
    } else {
      url.searchParams.delete('domain');
    }

    if (adminState.filters.category) {
      url.searchParams.set('category', adminState.filters.category);
    } else {
      url.searchParams.delete('category');
    }

    // 使用replaceState避免产生过多历史记录
    window.history.replaceState(null, '', url.toString());
  }

  // 从URL和localStorage恢复状态
  function adminRestoreState() {
    try {
      // 优先从URL参数恢复
      const url = new URL(window.location);
      const urlTab = url.searchParams.get('tab');
      const urlPage = url.searchParams.get('page');
      const urlSearch = url.searchParams.get('search');
      const urlDomain = url.searchParams.get('domain');
      const urlCategory = url.searchParams.get('category');

      if (urlTab || urlPage || urlSearch || urlDomain || urlCategory) {
        // 从URL恢复状态
        if (urlTab) adminState.currentTab = urlTab;
        if (urlPage) adminState.currentPage = parseInt(urlPage) || 1;
        if (urlSearch) adminState.filters.search = urlSearch;
        if (urlDomain) adminState.filters.domain = urlDomain;
        if (urlCategory) adminState.filters.category = urlCategory;

        console.log('📍 从URL恢复状态:', { tab: adminState.currentTab, page: adminState.currentPage, filters: adminState.filters });
        return true;
      }

      // 从localStorage恢复状态
      const savedState = localStorage.getItem('adminState');
      if (savedState) {
        const state = JSON.parse(savedState);
        adminState.currentTab = state.tab || 'bookmarks';
        adminState.currentPage = state.page || 1;
        adminState.filters = { ...adminState.filters, ...state.filters };
        adminState.itemsPerPage = state.itemsPerPage || 10;

        console.log('💾 从localStorage恢复状态:', state);
        return true;
      }
    } catch (error) {
      console.error('恢复状态失败:', error);
    }

    return false;
  }

  async function adminInit() {
    try {
      console.log('🚀 开始初始化管理后台...');
      const initStartTime = Date.now();

      // 恢复页面状态
      const stateRestored = adminRestoreState();
      adminState.stateRestored = stateRestored;

      await adminCheckDatabaseStatus();
      await adminLoadData();
      adminSetupEventListeners();

      // 恢复UI状态
      if (stateRestored) {
        adminRestoreUI();
      }

      const initTime = Date.now() - initStartTime;
      console.log(`✅ 管理后台初始化完成 - 总耗时: ${initTime}ms`);

      // 显示性能提示
      if (initTime > 3000) {
        console.warn('⚠️ 初始化时间较长，建议检查网络连接或API性能');
      }
    } catch (error) {
      console.error('❌ 初始化失败:', error);
    }
  }

  async function adminCheckDatabaseStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();

      if (data.status === 'ready' || data.status === 'connected') {
        adminElements.dbStatus.textContent = '已连接';
        adminElements.dbStatus.style.background = '#f0fff4';
        adminElements.dbStatus.style.color = '#22543d';
      } else {
        adminElements.dbStatus.textContent = '需要初始化';
        adminElements.dbStatus.style.background = '#fffbf0';
        adminElements.dbStatus.style.color = '#744210';
      }
    } catch (error) {
      adminElements.dbStatus.textContent = '连接失败';
      adminElements.dbStatus.style.background = '#fed7d7';
      adminElements.dbStatus.style.color = '#742a2a';
    }
  }

  // 恢复UI状态
  function adminRestoreUI() {
    // 恢复标签页
    adminSwitchTab(adminState.currentTab, false); // false表示不重新加载数据

    // 恢复搜索框
    if (adminElements.bookmarkSearch && adminState.filters.search) {
      adminElements.bookmarkSearch.value = adminState.filters.search;
    }

    // 恢复筛选器（需要等待数据加载完成）
    setTimeout(() => {
      if (adminElements.domainFilter && adminState.filters.domain) {
        adminElements.domainFilter.value = adminState.filters.domain;
      }
      if (adminElements.categoryFilter && adminState.filters.category) {
        adminElements.categoryFilter.value = adminState.filters.category;
      }
    }, 200);
  }

  async function adminLoadData() {
    // 根据当前标签页决定加载顺序
    if (adminState.currentTab === 'bookmarks') {
      // 优先加载书签
      await adminLoadBookmarks(adminState.currentPage);

      // 延迟加载其他数据
      setTimeout(() => {
        adminLoadCategories();
        adminLoadDomains();
        adminLoadStats();
      }, 100);
    } else if (adminState.currentTab === 'categories') {
      // 优先加载分类
      await adminLoadCategories();

      setTimeout(() => {
        adminLoadBookmarks();
        adminLoadDomains();
        adminLoadStats();
      }, 100);
    } else if (adminState.currentTab === 'settings') {
      // 优先加载统计
      await adminLoadStats();

      setTimeout(() => {
        adminLoadBookmarks();
        adminLoadCategories();
        adminLoadDomains();
      }, 100);
    } else {
      // 默认加载顺序
      await adminLoadBookmarks();

      setTimeout(() => {
        adminLoadCategories();
        adminLoadDomains();
        adminLoadStats();
      }, 100);
    }
  }

  async function adminLoadBookmarks(page = 1) {
    // 防止重复请求
    if (adminState.isLoading) {
      console.log('正在加载中，跳过重复请求');
      return;
    }

    // 生成缓存key
    const cacheKey = `${page}-${adminState.itemsPerPage}-${adminState.filters.domain}-${adminState.filters.category}-${adminState.filters.search}`;

    // 检查缓存
    if (adminState.cache.has(cacheKey) && cacheKey === adminState.lastRequestKey) {
      console.log('使用缓存数据');
      const cachedData = adminState.cache.get(cacheKey);
      adminState.bookmarks = cachedData.bookmarks;
      adminState.currentPage = cachedData.currentPage;
      adminState.totalPages = cachedData.totalPages;
      adminRenderBookmarks();
      adminUpdatePagination();
      return;
    }

    try {
      adminState.isLoading = true;
      adminShowLoading(adminElements.bookmarksTable, 6);

      const params = new URLSearchParams({
        page: page,
        limit: adminState.itemsPerPage,
        domain: adminState.filters.domain,
        category: adminState.filters.category,
        search: adminState.filters.search
      });

      console.log(`开始加载书签 - 第${page}页`);
      const startTime = Date.now();

      const response = await fetch(`/api/bookmarks?${params}`);
      const data = await response.json();

      const loadTime = Date.now() - startTime;
      console.log(`书签加载完成 - 耗时: ${loadTime}ms`);

      if (data.success) {
        adminState.bookmarks = data.bookmarks || data.data || [];
        adminState.currentPage = page;
        adminState.totalPages = Math.ceil((data.total || 0) / adminState.itemsPerPage);

        // 保存到缓存
        adminState.cache.set(cacheKey, {
          bookmarks: adminState.bookmarks,
          currentPage: adminState.currentPage,
          totalPages: adminState.totalPages
        });
        adminState.lastRequestKey = cacheKey;

        // 限制缓存大小，只保留最近10个请求
        if (adminState.cache.size > 10) {
          const firstKey = adminState.cache.keys().next().value;
          adminState.cache.delete(firstKey);
        }

        adminRenderBookmarks();
        adminUpdatePagination();

        // 保存状态
        adminSaveState();
      } else {
        adminShowError(adminElements.bookmarksTable, '加载书签失败', 6);
      }
    } catch (error) {
      console.error('加载书签失败:', error);
      adminShowError(adminElements.bookmarksTable, '网络错误，请检查API连接', 6);
    } finally {
      adminState.isLoading = false;
    }
  }

  function adminRenderBookmarks() {
    if (adminState.bookmarks.length === 0) {
      adminElements.bookmarksTable.innerHTML = `
        <tr><td colspan="6" style="text-align: center; padding: 40px; color: #a0aec0;">
          <i class="fas fa-search"></i> 没有找到书签
        </td></tr>`;
      return;
    }

    adminElements.bookmarksTable.innerHTML = adminState.bookmarks.map((bookmark, index) => {
      const categoryName = adminGetCategoryName(bookmark.category_id);
      const rowNumber = (adminState.currentPage - 1) * adminState.itemsPerPage + index + 1;

      return `
        <tr>
          <td>${rowNumber}</td>
          <td><div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${bookmark.title}">${bookmark.title}</div></td>
          <td>${bookmark.domain}</td>
          <td>${categoryName}</td>
          <td>${adminFormatDate(bookmark.created_at)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-sm btn-edit" onclick="adminEditBookmark(${bookmark.id})" title="编辑"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-delete" onclick="adminDeleteBookmark(${bookmark.id})" title="删除"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function adminGetCategoryName(categoryId) {
    if (!categoryId) return '未分类';
    const category = adminState.categories.find(cat => cat.id === categoryId);
    return category ? category.name : '未分类';
  }

  function adminFormatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN');
  }

  function adminShowLoading(element, colspan) {
    element.innerHTML = `
      <tr>
        <td colspan="${colspan}" style="text-align: center; padding: 40px; color: #a0aec0;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
            <span>正在加载书签数据...</span>
            <small style="color: #718096;">首次加载可能需要几秒钟</small>
          </div>
        </td>
      </tr>
    `;
  }

  function adminShowError(element, message, colspan) {
    element.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 40px; color: #e53e3e;"><i class="fas fa-exclamation-triangle"></i> ${message}</td></tr>`;
  }

  function adminUpdatePagination() {
    adminElements.pageInfo.textContent = `第 ${adminState.currentPage} 页，共 ${adminState.totalPages} 页`;
    adminElements.prevPage.disabled = adminState.currentPage <= 1;
    adminElements.nextPage.disabled = adminState.currentPage >= adminState.totalPages;
  }

  function adminSetupEventListeners() {
    adminElements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        adminSwitchTab(tabName);
      });
    });

    adminElements.bookmarkSearch.addEventListener('input', (e) => {
      clearTimeout(adminState.searchTimeout);
      adminState.searchTimeout = setTimeout(() => {
        const searchValue = e.target.value.trim();
        // 只有当搜索词长度大于2或为空时才搜索，减少无效请求
        if (searchValue.length === 0 || searchValue.length >= 2) {
          adminState.filters.search = searchValue;
          adminState.currentPage = 1; // 搜索时重置到第1页
          adminLoadBookmarks(1);
        }
      }, 800); // 增加延迟到800ms，减少请求频率
    });

    adminElements.prevPage.addEventListener('click', () => {
      if (adminState.currentPage > 1) adminLoadBookmarks(adminState.currentPage - 1);
    });

    adminElements.nextPage.addEventListener('click', () => {
      if (adminState.currentPage < adminState.totalPages) adminLoadBookmarks(adminState.currentPage + 1);
    });

    // 筛选器事件
    if (adminElements.domainFilter) {
      adminElements.domainFilter.addEventListener('change', (e) => {
        adminState.filters.domain = e.target.value;
        adminState.currentPage = 1; // 筛选时重置到第1页
        adminLoadBookmarks(1);
      });
    }

    if (adminElements.categoryFilter) {
      adminElements.categoryFilter.addEventListener('change', (e) => {
        adminState.filters.category = e.target.value;
        adminState.currentPage = 1; // 筛选时重置到第1页
        adminLoadBookmarks(1);
      });
    }

    adminElements.addBookmarkBtn.addEventListener('click', () => alert('添加书签功能开发中'));
    adminElements.checkDbBtn.addEventListener('click', adminCheckDatabaseStatus);

    // 监听浏览器前进后退
    window.addEventListener('popstate', () => {
      console.log('🔄 检测到浏览器前进/后退，恢复状态');
      adminRestoreState();
      adminRestoreUI();
      adminLoadData();
    });
  }

  function adminSwitchTab(tabName, shouldLoadData = true) {
    adminElements.navTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-tab') === tabName) tab.classList.add('active');
    });

    adminElements.tabContents.forEach(content => content.classList.remove('active'));

    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) targetContent.classList.add('active');

    adminState.currentTab = tabName;

    // 保存状态
    adminSaveState();

    // 根据参数决定是否加载数据
    if (shouldLoadData) {
      if (tabName === 'bookmarks') adminLoadBookmarks(1); // 切换标签页时重置到第1页
      else if (tabName === 'categories') adminLoadCategories();
      else if (tabName === 'settings') adminLoadStats();
    }
  }

  async function adminLoadCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        adminState.categories = data.categories || data.data || [];
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  async function adminLoadDomains() {
    try {
      const response = await fetch('/api/domains');
      const data = await response.json();

      if (data.success) {
        adminState.domains = data.domains || data.data || [];
      }
    } catch (error) {
      console.error('加载域名失败:', error);
    }
  }

  async function adminLoadStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (data.success) {
        const stats = data.stats || data.data || {};
        if (adminElements.totalBookmarks) adminElements.totalBookmarks.textContent = stats.bookmarks_count || stats.total_bookmarks || 0;
        if (adminElements.totalDomains) adminElements.totalDomains.textContent = stats.domains_count || stats.total_domains || 0;
        if (adminElements.totalCategories) adminElements.totalCategories.textContent = stats.categories_count || stats.total_categories || 0;
        if (adminElements.dbStatusText) adminElements.dbStatusText.textContent = '正常';
      }
    } catch (error) {
      console.error('加载统计失败:', error);
      if (adminElements.dbStatusText) adminElements.dbStatusText.textContent = '异常';
    }
  }

  window.adminEditBookmark = function(id) { alert(`编辑书签 ${id} 功能开发中`); };
  window.adminDeleteBookmark = function(id) { if (confirm('确定要删除这个书签吗？')) alert(`删除书签 ${id} 功能开发中`); };

  document.addEventListener('DOMContentLoaded', adminInit);
}