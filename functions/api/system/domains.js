/**
 * 域名管理 API
 * 获取域名列表和统计信息
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
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: '数据库未绑定，请检查 D1 数据库配置'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // 获取域名列表和统计信息
    const domainsQuery = `
      SELECT 
        domain,
        COUNT(*) as bookmark_count,
        MIN(created_at) as first_bookmark,
        MAX(created_at) as latest_bookmark
      FROM bookmarks
      GROUP BY domain
      ORDER BY bookmark_count DESC, domain ASC
    `;

    const result = await db.prepare(domainsQuery).all();
    const domainsData = result.results || [];

    // 简化的域名列表（用于筛选器）
    const domains = domainsData.map(item => item.domain);

    // 详细的域名统计
    const domainStats = domainsData.map(item => ({
      domain: item.domain,
      bookmark_count: item.bookmark_count,
      first_bookmark: item.first_bookmark,
      latest_bookmark: item.latest_bookmark
    }));

    return new Response(JSON.stringify({
      success: true,
      domains: domains,
      domain_stats: domainStats,
      total_domains: domains.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取域名信息失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '获取域名信息失败: ' + error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
