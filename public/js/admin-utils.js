/**
 * 管理后台工具函数
 */

// 获取图标URL
const getIconUrl = (bookmark) => {
  if (bookmark.icon_url) {
    return bookmark.icon_url;
  }
  return `https://www.google.com/s2/favicons?domain=${bookmark.domain}&sz=32`;
};

// 处理图标错误
const handleIconError = (event) => {
  const img = event.target;
  const domain = img.getAttribute('data-domain');
  if (domain) {
    img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } else {
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiA4QzEyLjY4NjMgOCAxMCAxMC42ODYzIDEwIDE0VjE4QzEwIDIxLjMxMzcgMTIuNjg2MyAyNCAxNiAyNEMxOS4zMTM3IDI0IDIyIDIxLjMxMzcgMjIgMThWMTRDMjIgMTAuNjg2MyAxOS4zMTM3IDggMTYgOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
  }
};

// 获取分类名称
const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return '未分类';
  const category = categories.find(c => c.id === categoryId);
  return category ? category.name : '未知分类';
};

// 获取父分类名称
const getParentCategoryName = (parentId, categories) => {
  if (!parentId) return '无';
  const category = categories.find(c => c.id === parentId);
  return category ? category.name : '未知分类';
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '格式错误';
  }
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '未知时间';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  } catch (error) {
    return '时间格式错误';
  }
};

// 获取日志图标
const getLogIcon = (type) => {
  const icons = {
    'system': 'fas fa-cog',
    'database': 'fas fa-database',
    'auth': 'fas fa-user-shield',
    'sync': 'fas fa-sync',
    'error': 'fas fa-exclamation-triangle',
    'warning': 'fas fa-exclamation-circle',
    'info': 'fas fa-info-circle',
    'success': 'fas fa-check-circle'
  };
  return icons[type] || 'fas fa-file-alt';
};

// 获取日志级别文本
const getLogLevelText = (level) => {
  const levels = {
    'error': '错误',
    'warning': '警告',
    'info': '信息',
    'success': '成功',
    'debug': '调试'
  };
  return levels[level] || level;
};

// 格式化日志详情
const formatLogDetails = (details) => {
  if (!details) return '无详细信息';
  
  try {
    if (typeof details === 'string') {
      // 尝试解析JSON字符串
      const parsed = JSON.parse(details);
      return JSON.stringify(parsed, null, 2);
    } else if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    return details.toString();
  } catch (error) {
    return details.toString();
  }
};

// 获取等级样式类
const getGradeClass = (percentage) => {
  if (percentage >= 90) return 'grade-excellent';
  if (percentage >= 80) return 'grade-good';
  if (percentage >= 60) return 'grade-fair';
  return 'grade-poor';
};

// 复制API URL
const copyApiUrl = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    alert('API URL 已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('API URL 已复制到剪贴板');
  }
};

// 测试API连接
const testApiConnection = async (apiBaseUrl, apiTesting, apiTestResult) => {
  try {
    apiTesting.value = true;
    apiTestResult.value = null;

    const response = await fetch(`${apiBaseUrl.value}/api/system/stats`);
    const data = await response.json();

    if (data.success) {
      apiTestResult.value = {
        success: true,
        message: 'API 连接成功',
        data: data
      };
    } else {
      apiTestResult.value = {
        success: false,
        message: 'API 返回错误: ' + data.message
      };
    }
  } catch (error) {
    apiTestResult.value = {
      success: false,
      message: 'API 连接失败: ' + error.message
    };
  } finally {
    apiTesting.value = false;
  }
};

// 测试特定端点
const testEndpoint = async (endpoint, apiBaseUrl) => {
  try {
    const response = await fetch(`${apiBaseUrl.value}${endpoint}`);
    const data = await response.json();
    
    alert(`端点测试结果:\n\n状态: ${response.status}\n成功: ${data.success}\n消息: ${data.message || '无消息'}`);
  } catch (error) {
    alert(`端点测试失败:\n\n错误: ${error.message}`);
  }
};

// 分页相关函数
const prevAdminPage = (adminCurrentPage, loadAdminBookmarks) => {
  if (adminCurrentPage.value > 1) {
    adminCurrentPage.value--;
    loadAdminBookmarks();
  }
};

const nextAdminPage = (adminCurrentPage, adminTotalPages, loadAdminBookmarks) => {
  if (adminCurrentPage.value < adminTotalPages.value) {
    adminCurrentPage.value++;
    loadAdminBookmarks();
  }
};

const prevLogPage = (logCurrentPage, loadLogs) => {
  if (logCurrentPage.value > 1) {
    logCurrentPage.value--;
    loadLogs();
  }
};

const nextLogPage = (logCurrentPage, logTotalPages, loadLogs) => {
  if (logCurrentPage.value < logTotalPages.value) {
    logCurrentPage.value++;
    loadLogs();
  }
};

// 导出所有工具函数
window.AdminUtils = {
  getIconUrl,
  handleIconError,
  getCategoryName,
  getParentCategoryName,
  formatDate,
  formatDateTime,
  getLogIcon,
  getLogLevelText,
  formatLogDetails,
  getGradeClass,
  copyApiUrl,
  testApiConnection,
  testEndpoint,
  prevAdminPage,
  nextAdminPage,
  prevLogPage,
  nextLogPage
};
