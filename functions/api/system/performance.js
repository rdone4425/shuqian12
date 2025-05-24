/**
 * 性能测试 API - 对比 D1 直接查询和 KV 缓存的性能
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

  if (method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 GET 请求'
    }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 检查数据库绑定
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const testType = url.searchParams.get('test') || 'all';
    const iterations = parseInt(url.searchParams.get('iterations')) || 5;

    const results = await runPerformanceTests(env.DB, env.CACHE, testType, iterations);

    return new Response(JSON.stringify({
      success: true,
      test_type: testType,
      iterations: iterations,
      timestamp: new Date().toISOString(),
      results: results,
      summary: generateSummary(results)
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('性能测试失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '性能测试失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

async function runPerformanceTests(db, kvNamespace, testType, iterations) {
  const cache = createCacheInstance(kvNamespace);
  const results = {};

  if (testType === 'all' || testType === 'bookmarks') {
    results.bookmarks = await testBookmarksPerformance(db, cache, iterations);
  }

  if (testType === 'all' || testType === 'stats') {
    results.stats = await testStatsPerformance(db, cache, iterations);
  }

  if (testType === 'all' || testType === 'categories') {
    results.categories = await testCategoriesPerformance(db, cache, iterations);
  }

  return results;
}

async function testBookmarksPerformance(db, cache, iterations) {
  const results = {
    test_name: '书签列表查询',
    d1_direct: [],
    kv_cached: [],
    kv_miss: []
  };

  // 清除缓存确保测试准确性
  if (cache) {
    await cache.delete('bookmarks_list', { page: 1, limit: 20 });
  }

  // 测试 D1 直接查询
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const query = `
        SELECT id, title, url, domain, created_at
        FROM bookmarks
        ORDER BY created_at DESC
        LIMIT 20
      `;
      await db.prepare(query).all();
      
      const endTime = performance.now();
      results.d1_direct.push(endTime - startTime);
    } catch (error) {
      console.error('D1 查询失败:', error);
      results.d1_direct.push(-1);
    }
  }

  if (cache) {
    // 测试 KV 缓存未命中（第一次查询）
    const startTime1 = performance.now();
    const cached1 = await cache.get('bookmarks_list', { page: 1, limit: 20 });
    const endTime1 = performance.now();
    results.kv_miss.push(endTime1 - startTime1);

    // 设置缓存
    const mockData = {
      bookmarks: [],
      total: 0,
      page: 1,
      limit: 20
    };
    await cache.set('bookmarks_list', mockData, { page: 1, limit: 20 });

    // 测试 KV 缓存命中
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await cache.get('bookmarks_list', { page: 1, limit: 20 });
        
        const endTime = performance.now();
        results.kv_cached.push(endTime - startTime);
      } catch (error) {
        console.error('KV 查询失败:', error);
        results.kv_cached.push(-1);
      }
    }
  }

  return results;
}

async function testStatsPerformance(db, cache, iterations) {
  const results = {
    test_name: '统计数据查询',
    d1_direct: [],
    kv_cached: [],
    kv_miss: []
  };

  // 清除缓存
  if (cache) {
    await cache.delete('stats');
  }

  // 测试 D1 直接查询
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM bookmarks) as total_bookmarks,
          (SELECT COUNT(*) FROM categories) as total_categories,
          (SELECT COUNT(DISTINCT domain) FROM bookmarks) as total_domains
      `;
      await db.prepare(query).first();
      
      const endTime = performance.now();
      results.d1_direct.push(endTime - startTime);
    } catch (error) {
      console.error('D1 统计查询失败:', error);
      results.d1_direct.push(-1);
    }
  }

  if (cache) {
    // 测试 KV 缓存未命中
    const startTime1 = performance.now();
    await cache.get('stats');
    const endTime1 = performance.now();
    results.kv_miss.push(endTime1 - startTime1);

    // 设置缓存
    const mockStats = {
      total_bookmarks: 100,
      total_categories: 10,
      total_domains: 50
    };
    await cache.set('stats', mockStats);

    // 测试 KV 缓存命中
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await cache.get('stats');
        
        const endTime = performance.now();
        results.kv_cached.push(endTime - startTime);
      } catch (error) {
        console.error('KV 统计查询失败:', error);
        results.kv_cached.push(-1);
      }
    }
  }

  return results;
}

async function testCategoriesPerformance(db, cache, iterations) {
  const results = {
    test_name: '分类列表查询',
    d1_direct: [],
    kv_cached: [],
    kv_miss: []
  };

  // 清除缓存
  if (cache) {
    await cache.delete('categories');
  }

  // 测试 D1 直接查询
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const query = `SELECT * FROM categories ORDER BY name`;
      await db.prepare(query).all();
      
      const endTime = performance.now();
      results.d1_direct.push(endTime - startTime);
    } catch (error) {
      console.error('D1 分类查询失败:', error);
      results.d1_direct.push(-1);
    }
  }

  if (cache) {
    // 测试 KV 缓存未命中
    const startTime1 = performance.now();
    await cache.get('categories');
    const endTime1 = performance.now();
    results.kv_miss.push(endTime1 - startTime1);

    // 设置缓存
    const mockCategories = {
      categories: []
    };
    await cache.set('categories', mockCategories);

    // 测试 KV 缓存命中
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await cache.get('categories');
        
        const endTime = performance.now();
        results.kv_cached.push(endTime - startTime);
      } catch (error) {
        console.error('KV 分类查询失败:', error);
        results.kv_cached.push(-1);
      }
    }
  }

  return results;
}

function generateSummary(results) {
  const summary = {};

  for (const [testName, testResults] of Object.entries(results)) {
    const d1Times = testResults.d1_direct.filter(t => t > 0);
    const kvTimes = testResults.kv_cached.filter(t => t > 0);

    if (d1Times.length > 0 && kvTimes.length > 0) {
      const d1Avg = d1Times.reduce((a, b) => a + b, 0) / d1Times.length;
      const kvAvg = kvTimes.reduce((a, b) => a + b, 0) / kvTimes.length;
      const improvement = ((d1Avg - kvAvg) / d1Avg * 100);

      summary[testName] = {
        d1_average_ms: Math.round(d1Avg * 100) / 100,
        kv_average_ms: Math.round(kvAvg * 100) / 100,
        improvement_percent: Math.round(improvement * 100) / 100,
        speed_multiplier: Math.round((d1Avg / kvAvg) * 100) / 100
      };
    }
  }

  return summary;
}
