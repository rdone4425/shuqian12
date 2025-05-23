/**
 * 性能监控 API
 * 监控API响应时间和数据库性能
 */

import { CORS_HEADERS } from '../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const startTime = Date.now();

  try {
    const performance = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {}
    };

    // 测试1: 数据库连接
    const dbConnectStart = Date.now();
    let dbConnected = false;
    let dbError = null;
    
    if (env.DB) {
      try {
        await env.DB.prepare('SELECT 1').first();
        dbConnected = true;
      } catch (error) {
        dbError = error.message;
      }
    }
    
    performance.tests.database_connection = {
      time_ms: Date.now() - dbConnectStart,
      success: dbConnected,
      error: dbError
    };

    // 测试2: 简单查询性能
    if (dbConnected) {
      const queryStart = Date.now();
      try {
        const result = await env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
        performance.tests.simple_query = {
          time_ms: Date.now() - queryStart,
          success: true,
          bookmark_count: result.count
        };
      } catch (error) {
        performance.tests.simple_query = {
          time_ms: Date.now() - queryStart,
          success: false,
          error: error.message
        };
      }

      // 测试3: 复杂查询性能
      const complexQueryStart = Date.now();
      try {
        const result = await env.DB.prepare(`
          SELECT domain, COUNT(*) as count 
          FROM bookmarks 
          GROUP BY domain 
          ORDER BY count DESC 
          LIMIT 10
        `).all();
        
        performance.tests.complex_query = {
          time_ms: Date.now() - complexQueryStart,
          success: true,
          top_domains: (result.results || result).length
        };
      } catch (error) {
        performance.tests.complex_query = {
          time_ms: Date.now() - complexQueryStart,
          success: false,
          error: error.message
        };
      }

      // 测试4: 批量查询性能
      const batchQueryStart = Date.now();
      try {
        const result = await env.DB.prepare(`
          SELECT id, title, url, domain 
          FROM bookmarks 
          ORDER BY created_at DESC 
          LIMIT 100
        `).all();
        
        performance.tests.batch_query = {
          time_ms: Date.now() - batchQueryStart,
          success: true,
          records_fetched: (result.results || result).length
        };
      } catch (error) {
        performance.tests.batch_query = {
          time_ms: Date.now() - batchQueryStart,
          success: false,
          error: error.message
        };
      }

      // 测试5: 写入性能（测试插入）
      const writeTestStart = Date.now();
      try {
        const testUrl = `https://performance-test-${Date.now()}.example.com`;
        const insertResult = await env.DB.prepare(`
          INSERT INTO bookmarks (title, url, domain, path)
          VALUES (?, ?, ?, ?)
        `).bind(
          'Performance Test Bookmark',
          testUrl,
          'performance-test.example.com',
          '/test'
        ).run();

        // 立即删除测试数据
        await env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(insertResult.meta.last_row_id).run();

        performance.tests.write_performance = {
          time_ms: Date.now() - writeTestStart,
          success: true,
          inserted_id: insertResult.meta.last_row_id
        };
      } catch (error) {
        performance.tests.write_performance = {
          time_ms: Date.now() - writeTestStart,
          success: false,
          error: error.message
        };
      }
    }

    // 测试6: API响应时间
    const totalTime = Date.now() - startTime;
    performance.tests.api_response = {
      time_ms: totalTime,
      success: true
    };

    // 生成性能摘要
    const successfulTests = Object.values(performance.tests).filter(test => test.success).length;
    const totalTests = Object.keys(performance.tests).length;
    const avgResponseTime = Object.values(performance.tests)
      .filter(test => test.success)
      .reduce((sum, test) => sum + test.time_ms, 0) / successfulTests;

    performance.summary = {
      total_time_ms: totalTime,
      successful_tests: successfulTests,
      total_tests: totalTests,
      success_rate: `${Math.round((successfulTests / totalTests) * 100)}%`,
      average_response_time_ms: Math.round(avgResponseTime),
      database_available: dbConnected,
      performance_grade: getPerformanceGrade(avgResponseTime, dbConnected)
    };

    // 性能建议
    const suggestions = generatePerformanceSuggestions(performance);

    return new Response(JSON.stringify({
      success: true,
      message: 'Performance monitoring completed',
      performance: performance,
      suggestions: suggestions
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Performance monitoring failed: ' + error.message,
      error: error.toString(),
      total_time_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 性能评级
function getPerformanceGrade(avgTime, dbConnected) {
  if (!dbConnected) return 'F - Database not available';
  if (avgTime < 50) return 'A - Excellent';
  if (avgTime < 100) return 'B - Good';
  if (avgTime < 200) return 'C - Average';
  if (avgTime < 500) return 'D - Poor';
  return 'F - Very Poor';
}

// 生成性能建议
function generatePerformanceSuggestions(performance) {
  const suggestions = [];

  if (!performance.summary.database_available) {
    suggestions.push('数据库连接失败，请检查D1数据库绑定');
  }

  if (performance.summary.average_response_time_ms > 200) {
    suggestions.push('平均响应时间较慢，可能是冷启动或数据库性能问题');
  }

  if (performance.tests.complex_query && performance.tests.complex_query.time_ms > 100) {
    suggestions.push('复杂查询较慢，考虑添加数据库索引');
  }

  if (performance.tests.write_performance && performance.tests.write_performance.time_ms > 100) {
    suggestions.push('写入性能较慢，批量操作时考虑使用事务');
  }

  if (performance.summary.success_rate !== '100%') {
    suggestions.push('部分测试失败，请检查数据库表结构和权限');
  }

  if (suggestions.length === 0) {
    suggestions.push('性能表现良好，无需优化');
  }

  return suggestions;
}
