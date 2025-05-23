/**
 * 数据导入API端点
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  
  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持POST请求'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
  
  try {
    const importData = await request.json();
    
    // 验证导入数据格式
    if (!importData.data || !importData.data.bookmarks) {
      return new Response(JSON.stringify({
        success: false,
        message: '导入数据格式不正确'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    
    const { bookmarks, categories, settings } = importData.data;
    let importedBookmarks = 0;
    let importedCategories = 0;
    let importedSettings = 0;
    
    // 导入分类（如果存在）
    if (categories && Array.isArray(categories)) {
      for (const category of categories) {
        try {
          // 检查分类是否已存在
          const existing = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND parent_id = ?')
            .bind(category.name, category.parent_id || null).first();
          
          if (!existing) {
            await env.DB.prepare(`
              INSERT INTO categories (name, parent_id, created_at)
              VALUES (?, ?, ?)
            `).bind(category.name, category.parent_id || null, category.created_at || new Date().toISOString()).run();
            importedCategories++;
          }
        } catch (error) {
          console.error('导入分类失败:', error);
        }
      }
    }
    
    // 导入书签
    if (bookmarks && Array.isArray(bookmarks)) {
      for (const bookmark of bookmarks) {
        try {
          // 检查书签是否已存在（基于URL）
          const existing = await env.DB.prepare('SELECT id FROM bookmarks WHERE url = ?')
            .bind(bookmark.url).first();
          
          if (!existing) {
            // 提取域名
            const domain = extractDomain(bookmark.url);
            
            await env.DB.prepare(`
              INSERT INTO bookmarks (title, url, domain, category_id, icon_url, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              bookmark.title,
              bookmark.url,
              domain,
              bookmark.category_id || null,
              bookmark.icon_url || null,
              bookmark.created_at || new Date().toISOString(),
              bookmark.updated_at || new Date().toISOString()
            ).run();
            importedBookmarks++;
          }
        } catch (error) {
          console.error('导入书签失败:', error);
        }
      }
    }
    
    // 导入设置（如果存在）
    if (settings && Array.isArray(settings)) {
      for (const setting of settings) {
        try {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
          `).bind(setting.key, setting.value, setting.updated_at || new Date().toISOString()).run();
          importedSettings++;
        } catch (error) {
          console.error('导入设置失败:', error);
        }
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '数据导入成功',
      imported: {
        bookmarks: importedBookmarks,
        categories: importedCategories,
        settings: importedSettings
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '导入数据失败',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

// 提取域名的辅助函数
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // 如果URL格式不正确，尝试简单的字符串处理
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  }
}
