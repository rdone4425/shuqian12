/**
 * 管理视图的逻辑代码
 */

// 管理视图的 setup 函数
const adminViewSetup = () => {
  // 标签页配置
  const tabs = [
    { id: 'bookmarks', name: '书签管理', icon: 'fas fa-bookmark' },
    { id: 'categories', name: '分类管理', icon: 'fas fa-folder' },
    { id: 'database', name: '数据库', icon: 'fas fa-database' },
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
  const loadAdminStats = async () => {
    try {
      const response = await fetch('/api/stats');
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
      const response = await fetch('/api/check-database');
      const data = await response.json();
      
      if (data.success) {
        dbStatus.value = {
          connected: data.database_connected || false,
          tablesExist: data.tables_exist || false
        };
        alert('数据库检查完成');
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

  // 初始化数据库
  const initDatabase = async () => {
    if (!confirm('确定要初始化数据库吗？这将创建所有必要的表结构。')) {
      return;
    }

    try {
      dbLoading.value = true;
      const response = await fetch('/api/init-database', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert('数据库初始化成功');
        await checkDatabase(); // 重新检查状态
      } else {
        alert('数据库初始化失败: ' + data.message);
      }
    } catch (error) {
      console.error('初始化数据库失败:', error);
      alert('初始化数据库失败: ' + error.message);
    } finally {
      dbLoading.value = false;
    }
  };

  // 导出数据
  const exportData = async () => {
    try {
      dbLoading.value = true;
      const response = await fetch('/api/export');
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

      const response = await fetch('/api/import', {
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
      const response = await fetch('/api/settings', {
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

  // 编辑和删除函数（简化版）
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
    showAddBookmark,
    showAddCategory,
    debouncedBookmarkSearch,
    loadAdminBookmarks,
    loadCategories,
    loadDomains,
    loadAdminStats,
    checkDatabase,
    initDatabase,
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
};
