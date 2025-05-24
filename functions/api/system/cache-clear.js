/**
 * 缓存清除 API - 手动清除 KV 缓存
 */

import { CORS_HEADERS } from '../../utils/cors.js';
import { createCacheInstance } from '../../utils/cache.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 检查 KV 绑定
    if (!env.CACHE) {
      return new Response(JSON.stringify({
        success: false,
        message: 'KV 缓存未绑定，请检查 CACHE 环境变量配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const cache = createCacheInstance(env.CACHE);
    const clearType = url.searchParams.get('type') || 'all';
    
    let clearedKeys = [];

    switch (clearType) {
      case 'bookmarks':
        clearedKeys = await clearBookmarksCache(cache);
        break;
      case 'categories':
        clearedKeys = await clearCategoriesCache(cache);
        break;
      case 'stats':
        clearedKeys = await clearStatsCache(cache);
        break;
      case 'all':
      default:
        const bookmarkKeys = await clearBookmarksCache(cache);
        const categoryKeys = await clearCategoriesCache(cache);
        const statsKeys = await clearStatsCache(cache);
        clearedKeys = [...bookmarkKeys, ...categoryKeys, ...statsKeys];
        break;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `缓存清除完成`,
      clear_type: clearType,
      cleared_keys: clearedKeys,
      cleared_count: clearedKeys.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('缓存清除失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '缓存清除失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

async function clearBookmarksCache(cache) {
  const clearedKeys = [];
  
  try {
    // 清除书签列表缓存（前几页）
    for (let page = 1; page <= 5; page++) {
      const key = cache.generateKey('bookmarks_list', { page, limit: 20 });
      await cache.delete('bookmarks_list', { page, limit: 20 });
      clearedKeys.push(key);
    }

    // 清除不同 limit 的缓存
    for (const limit of [10, 20, 50]) {
      const key = cache.generateKey('bookmarks_list', { page: 1, limit });
      await cache.delete('bookmarks_list', { page: 1, limit });
      clearedKeys.push(key);
    }

    console.log(`清除书签缓存: ${clearedKeys.length} 个键`);
  } catch (error) {
    console.error('清除书签缓存失败:', error);
  }

  return clearedKeys;
}

async function clearCategoriesCache(cache) {
  const clearedKeys = [];
  
  try {
    const key = cache.generateKey('categories');
    await cache.delete('categories');
    clearedKeys.push(key);

    console.log(`清除分类缓存: ${clearedKeys.length} 个键`);
  } catch (error) {
    console.error('清除分类缓存失败:', error);
  }

  return clearedKeys;
}

async function clearStatsCache(cache) {
  const clearedKeys = [];
  
  try {
    // 清除统计数据缓存
    const statsKey = cache.generateKey('stats');
    await cache.delete('stats');
    clearedKeys.push(statsKey);

    // 清除域名统计缓存
    const domainsKey = cache.generateKey('domains');
    await cache.delete('domains');
    clearedKeys.push(domainsKey);

    console.log(`清除统计缓存: ${clearedKeys.length} 个键`);
  } catch (error) {
    console.error('清除统计缓存失败:', error);
  }

  return clearedKeys;
}
