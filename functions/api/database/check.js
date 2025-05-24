/**
 * 数据库检查 API
 * 检查数据库连接状态和表结构完整性
 */

import { CORS_HEADERS } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
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
    const d1Binding = {
      connected: !!env.DB,
      type: env.DB ? typeof env.DB : 'undefined'
    };

    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'D1 数据库未绑定',
        d1_binding: d1Binding,
        instructions: [
          '1. 登录 Cloudflare Dashboard',
          '2. 进入 Pages 项目设置',
          '3. 在 Functions 标签页中找到 Bindings',
          '4. 添加 D1 数据库绑定，变量名设为 "DB"',
          '5. 保存设置并重新部署'
        ]
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // 检查数据库连接
    let connectionTest = {};
    try {
      const testResult = await db.prepare('SELECT 1 as test').first();
      connectionTest = {
        connected: true,
        test_query: testResult
      };
    } catch (error) {
      connectionTest = {
        connected: false,
        error: error.message
      };
    }

    // 检查表是否存在
    const requiredTables = ['bookmarks', 'categories', 'domains', 'settings', 'sync_logs'];
    const existingTables = [];
    const missingTables = [];

    for (const tableName of requiredTables) {
      try {
        const tableInfo = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name=?
        `).bind(tableName).first();

        if (tableInfo) {
          existingTables.push(tableName);
        } else {
          missingTables.push(tableName);
        }
      } catch (error) {
        missingTables.push(tableName);
      }
    }

    // 检查索引
    const indexChecks = {};
    const requiredIndexes = [
      { table: 'bookmarks', column: 'domain', name: 'idx_bookmarks_domain' },
      { table: 'bookmarks', column: 'category_id', name: 'idx_bookmarks_category' },
      { table: 'bookmarks', column: 'created_at', name: 'idx_bookmarks_created' },
      { table: 'categories', column: 'parent_id', name: 'idx_categories_parent' },
      { table: 'sync_logs', column: 'created_at', name: 'idx_sync_logs_created' },
      { table: 'sync_logs', column: 'type', name: 'idx_sync_logs_type' },
      { table: 'sync_logs', column: 'level', name: 'idx_sync_logs_level' },
      { table: 'domains', column: 'domain', name: 'idx_domains_domain' }
    ];

    for (const index of requiredIndexes) {
      try {
        const indexInfo = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index' AND name=?
        `).bind(index.name).first();

        indexChecks[index.name] = {
          exists: !!indexInfo,
          table: index.table,
          column: index.column
        };
      } catch (error) {
        indexChecks[index.name] = {
          exists: false,
          table: index.table,
          column: index.column,
          error: error.message
        };
      }
    }

    // 数据库健康状态评估
    const healthScore = calculateHealthScore(existingTables, missingTables, indexChecks);

    // 生成建议
    const recommendations = generateRecommendations(missingTables, indexChecks);

    return new Response(JSON.stringify({
      success: true,
      message: '数据库检查完成',
      d1_binding: d1Binding,
      connection_test: connectionTest,
      tables: {
        existing: existingTables,
        missing: missingTables,
        total_required: requiredTables.length
      },
      indexes: indexChecks,
      database_health: healthScore,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('数据库检查失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '数据库检查失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// 计算数据库健康分数
function calculateHealthScore(existingTables, missingTables, indexChecks) {
  const totalTables = existingTables.length + missingTables.length;
  const tableScore = totalTables > 0 ? (existingTables.length / totalTables) * 70 : 0;

  const totalIndexes = Object.keys(indexChecks).length;
  const existingIndexes = Object.values(indexChecks).filter(index => index.exists).length;
  const indexScore = totalIndexes > 0 ? (existingIndexes / totalIndexes) * 30 : 0;

  const totalScore = Math.round(tableScore + indexScore);

  let status = 'critical';
  let message = '数据库需要初始化';

  if (totalScore >= 90) {
    status = 'healthy';
    message = '数据库状态良好';
  } else if (totalScore >= 70) {
    status = 'warning';
    message = '数据库基本正常，建议优化';
  } else if (totalScore >= 30) {
    status = 'poor';
    message = '数据库不完整，需要修复';
  }

  return {
    status: status,
    percentage: totalScore,
    message: message
  };
}

// 生成建议
function generateRecommendations(missingTables, indexChecks) {
  const recommendations = [];

  if (missingTables.length > 0) {
    recommendations.push(`缺少 ${missingTables.length} 个表: ${missingTables.join(', ')}`);
    recommendations.push('建议: 运行数据库初始化');
  }

  const missingIndexes = Object.entries(indexChecks)
    .filter(([name, info]) => !info.exists)
    .map(([name]) => name);

  if (missingIndexes.length > 0) {
    recommendations.push(`缺少 ${missingIndexes.length} 个索引: ${missingIndexes.join(', ')}`);
    recommendations.push('建议: 运行数据库升级');
  }

  if (recommendations.length === 0) {
    recommendations.push('数据库结构完整，无需额外操作');
  }

  return recommendations;
}
