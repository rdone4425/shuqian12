/**
 * API诊断工具
 * 用于检测和诊断API端点问题
 */

class APIDiagnostics {
  constructor() {
    this.baseURL = window.location.origin;
    this.endpoints = [
      '/api/check-database',
      '/api/init-database',
      '/api/status',
      '/api/stats',
      '/api/bookmarks',
      '/api/categories',
      '/api/domains'
    ];
  }

  // 诊断单个API端点
  async diagnoseEndpoint(endpoint, method = 'GET') {
    const fullURL = this.baseURL + endpoint;
    const result = {
      endpoint,
      method,
      url: fullURL,
      timestamp: new Date().toISOString(),
      success: false,
      error: null,
      response: null,
      suggestions: []
    };

    try {
      console.log(`🔍 诊断API端点: ${endpoint}`);
      
      const response = await fetch(fullURL, { method });
      
      result.response = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      };

      // 检查响应状态
      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 404) {
          result.suggestions.push('API端点不存在，请检查Functions配置');
          result.suggestions.push('确保_routes.json文件正确配置');
          result.suggestions.push('检查functions目录结构是否正确');
        } else if (response.status === 500) {
          result.suggestions.push('服务器内部错误，请检查函数代码');
          result.suggestions.push('查看Cloudflare Pages的函数日志');
        } else if (response.status === 403) {
          result.suggestions.push('权限错误，请检查D1数据库绑定');
        }
        
        return result;
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        result.error = 'API返回了HTML页面而不是JSON数据';
        result.response.contentType = contentType;
        result.response.bodyPreview = text.substring(0, 200);
        
        result.suggestions.push('API端点返回HTML而不是JSON，可能是路由配置问题');
        result.suggestions.push('检查_routes.json文件是否正确配置');
        result.suggestions.push('确保Functions正确部署');
        
        return result;
      }

      // 尝试解析JSON
      try {
        const data = await response.json();
        result.response.data = data;
        result.success = true;
        
        // 检查API响应格式
        if (typeof data === 'object' && data !== null) {
          if (data.success === false) {
            result.suggestions.push('API返回了错误响应，请检查具体错误信息');
          } else if (data.success === true) {
            result.suggestions.push('✅ API端点工作正常');
          }
        }
        
      } catch (jsonError) {
        result.error = `JSON解析失败: ${jsonError.message}`;
        result.suggestions.push('响应不是有效的JSON格式');
        result.suggestions.push('检查API函数的返回格式');
      }

    } catch (fetchError) {
      result.error = `网络请求失败: ${fetchError.message}`;
      
      if (fetchError.message.includes('Failed to fetch')) {
        result.suggestions.push('网络连接失败，请检查网络连接');
        result.suggestions.push('可能是CORS问题或服务器不可达');
      }
    }

    return result;
  }

  // 诊断所有API端点
  async diagnoseAll() {
    console.log('🚀 开始API诊断...');
    
    const results = [];
    
    for (const endpoint of this.endpoints) {
      const method = endpoint === '/api/init-database' ? 'POST' : 'GET';
      const result = await this.diagnoseEndpoint(endpoint, method);
      results.push(result);
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  // 生成诊断报告
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      results: results,
      recommendations: []
    };

    // 生成建议
    const failedResults = results.filter(r => !r.success);
    
    if (failedResults.length === 0) {
      report.recommendations.push('✅ 所有API端点都工作正常');
    } else {
      report.recommendations.push(`❌ ${failedResults.length} 个API端点存在问题`);
      
      // 检查是否所有端点都返回404
      if (failedResults.every(r => r.response?.status === 404)) {
        report.recommendations.push('🔧 所有API都返回404，可能是Functions配置问题');
        report.recommendations.push('1. 检查_routes.json文件是否存在且配置正确');
        report.recommendations.push('2. 确保functions目录结构正确');
        report.recommendations.push('3. 重新部署Cloudflare Pages项目');
      }
      
      // 检查是否所有端点都返回HTML
      if (failedResults.some(r => r.error?.includes('HTML页面'))) {
        report.recommendations.push('🔧 API返回HTML而不是JSON，路由配置可能有问题');
        report.recommendations.push('1. 检查_routes.json文件配置');
        report.recommendations.push('2. 确保API路径正确');
      }
    }

    return report;
  }

  // 在控制台输出诊断报告
  async runDiagnostics() {
    console.log('🔍 API诊断工具启动');
    console.log('📍 基础URL:', this.baseURL);
    
    const results = await this.diagnoseAll();
    const report = this.generateReport(results);
    
    console.log('📊 诊断报告:');
    console.log(`✅ 成功: ${report.summary.success}/${report.summary.total}`);
    console.log(`❌ 失败: ${report.summary.failed}/${report.summary.total}`);
    
    console.log('\n📋 详细结果:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.endpoint} - ${result.success ? '正常' : result.error}`);
      
      if (result.suggestions.length > 0) {
        result.suggestions.forEach(suggestion => {
          console.log(`   💡 ${suggestion}`);
        });
      }
    });
    
    console.log('\n🔧 建议:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    return report;
  }
}

// 全局暴露诊断工具
window.APIDiagnostics = APIDiagnostics;

// 提供快捷方法
window.diagnoseAPI = async function() {
  const diagnostics = new APIDiagnostics();
  return await diagnostics.runDiagnostics();
};

console.log('🔧 API诊断工具已加载');
console.log('💡 使用 diagnoseAPI() 来运行完整诊断');
console.log('💡 或访问 /api-test.html 进行可视化测试');
