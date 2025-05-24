/**
 * 管理后台方法集合
 */

// 防抖搜索
let bookmarkSearchTimeout;
const debouncedBookmarkSearch = (loadAdminBookmarks, adminCurrentPage) => {
  clearTimeout(bookmarkSearchTimeout);
  bookmarkSearchTimeout = setTimeout(() => {
    adminCurrentPage.value = 1;
    loadAdminBookmarks();
  }, 600);
};

// 加载管理后台书签
const loadAdminBookmarks = async (adminLoading, adminBookmarks, adminCurrentPage, adminTotalPages, bookmarkDomainFilter, bookmarkCategoryFilter, bookmarkSearch) => {
  if (adminLoading.value) return;

  try {
    adminLoading.value = true;
    const params = new URLSearchParams({
      page: adminCurrentPage.value,
      limit: 20,
      domain: bookmarkDomainFilter.value,
      category: bookmarkCategoryFilter.value,
      search: bookmarkSearch.value
    });

    const response = await fetch(`/api/bookmarks?${params}`);
    const data = await response.json();

    if (data.success) {
      adminBookmarks.value = data.bookmarks || data.data || [];
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
const loadCategories = async (categoriesLoading, categories) => {
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
const loadDomains = async (domains) => {
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
const loadAdminStats = async (adminStats) => {
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
const checkDatabase = async (dbLoading, dbStatus) => {
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
const checkDatabaseSilently = async (dbStatus) => {
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
const initDatabase = async (dbLoading, checkDatabaseSilently, activeTab, loadAdminBookmarks, loadCategories, loadAdminStats) => {
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

// 导出所有方法
window.AdminMethods = {
  debouncedBookmarkSearch,
  loadAdminBookmarks,
  loadCategories,
  loadDomains,
  loadAdminStats,
  checkDatabase,
  checkDatabaseSilently,
  initDatabase
};
