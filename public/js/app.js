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
  themeToggle: document.getElementById('theme-toggle'),
  helpDialog: document.getElementById('help-dialog'),
  showHelp: document.getElementById('show-help'),
  closeHelp: document.getElementById('close-help')
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
    
    if (data.status === 'connected') {
      elements.dbStatus.textContent = '已连接';
      elements.dbStatus.style.color = 'var(--success-color)';
    } else {
      elements.dbStatus.textContent = '连接失败';
      elements.dbStatus.style.color = 'var(--danger-color)';
      throw new Error('数据库连接失败');
    }
  } catch (error) {
    elements.dbStatus.textContent = '连接失败';
    elements.dbStatus.style.color = 'var(--danger-color)';
    throw new Error('数据库连接失败');
  }
}

// 加载设置
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (data.success) {
      state.itemsPerPage = parseInt(data.settings.items_per_page) || 20;
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
      state.categories = data.categories;
      
      // 清空分类选择器
      elements.categoryFilter.innerHTML = '<option value="">全部</option>';
      
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
      elements.domainFilter.innerHTML = '<option value="">全部</option>';
      
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
    elements.bookmarksList.innerHTML = '<div class="loading">加载中...</div>';
    
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
    
    if (data.success) {
      state.bookmarks = data.bookmarks;
      state.currentPage = page;
      state.totalPages = Math.ceil(data.total / state.itemsPerPage);
      
      // 更新分页信息
      updatePagination();
      
      // 渲染书签列表
      renderBookmarks();
    } else {
      showError('加载书签失败');
    }
  } catch (error) {
    console.error('加载书签失败:', error);
    showError('加载书签失败');
  }
}

// 渲染书签列表
function renderBookmarks() {
  // 清空书签列表
  elements.bookmarksList.innerHTML = '';
  
  if (state.bookmarks.length === 0) {
    elements.bookmarksList.innerHTML = '<div class="loading">没有找到书签</div>';
    return;
  }
  
  // 获取书签模板
  const template = document.getElementById('bookmark-template');
  
  // 渲染每个书签
  state.bookmarks.forEach(bookmark => {
    const bookmarkElement = document.importNode(template.content, true);
    
    // 设置书签数据
    const title = bookmarkElement.querySelector('.bookmark-title a');
    title.href = bookmark.url;
    title.textContent = bookmark.title;
    
    const url = bookmarkElement.querySelector('.bookmark-url');
    url.textContent = bookmark.url;
    
    const domain = bookmarkElement.querySelector('.bookmark-domain');
    domain.innerHTML = `<i class="fas fa-globe"></i> ${bookmark.domain}`;
    
    // 查找分类名称
    let categoryName = '未分类';
    if (bookmark.category_id) {
      const category = state.categories.find(cat => cat.id === bookmark.category_id);
      if (category) categoryName = category.name;
    }
    
    const category = bookmarkElement.querySelector('.bookmark-category');
    category.innerHTML = `<i class="fas fa-folder"></i> ${categoryName}`;
    
    const date = bookmarkElement.querySelector('.bookmark-date');
    date.innerHTML = `<i class="fas fa-calendar"></i> ${formatDate(bookmark.created_at)}`;
    
    const icon = bookmarkElement.querySelector('.bookmark-icon img');
    icon.src = bookmark.icon_url || `https://www.google.com/s2/favicons?domain=${bookmark.domain}`;
    icon.alt = `${bookmark.domain} 图标`;
    
    // 添加到书签列表
    elements.bookmarksList.appendChild(bookmarkElement);
  });
}

// 更新分页信息
function updatePagination() {
  elements.pageInfo.textContent = `第 ${state.currentPage} 页，共 ${state.totalPages} 页`;
  
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
      if (data.success) {
        elements.totalCount.textContent = data.stats.bookmarks_count;
        elements.domainCount.textContent = data.stats.domains_count;
        elements.categoryCount.textContent = data.stats.categories_count;
      }
    })
    .catch(error => {
      console.error('加载统计信息失败:', error);
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
  
  // 帮助对话框
  elements.showHelp.addEventListener('click', () => {
    elements.helpDialog.style.display = 'flex';
  });
  
  elements.closeHelp.addEventListener('click', () => {
    elements.helpDialog.style.display = 'none';
  });
  
  // 点击对话框外部关闭对话框
  elements.helpDialog.addEventListener('click', (e) => {
    if (e.target === elements.helpDialog) {
      elements.helpDialog.style.display = 'none';
    }
  });
  
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
  elements.bookmarksList.innerHTML = `<div class="loading" style="color: var(--danger-color);">${message}</div>`;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init); 