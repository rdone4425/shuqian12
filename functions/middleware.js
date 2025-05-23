/**
 * 路径保护中间件
 * 处理自定义路径访问控制
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API 请求直接通过
  if (pathname.startsWith('/api/')) {
    return next();
  }

  // 静态资源直接通过
  if (pathname.startsWith('/js/') ||
      pathname.startsWith('/img/') ||
      pathname.startsWith('/css/') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.txt') ||
      pathname.endsWith('.json')) {
    return next();
  }

  // setup页面和login页面始终可访问
  if (pathname === '/setup.html' || pathname === '/login.html') {
    return next();
  }

  try {
    const db = env.DB;
    if (!db) {
      return next(); // 数据库未配置，直接通过
    }

    // 检查数据库是否已初始化
    let dbInitialized = false;
    try {
      await db.prepare('SELECT 1 FROM settings LIMIT 1').first();
      dbInitialized = true;
    } catch (error) {
      // 数据库未初始化，重定向到setup页面
      if (pathname !== '/setup.html') {
        return Response.redirect(new URL('/setup.html', request.url).href, 302);
      }
      return next();
    }

    // 获取路径保护设置
    const settings = {};
    try {
      const settingsResult = await db.prepare(`
        SELECT key, value FROM settings
        WHERE key IN ('home_path', 'enable_home_path', 'admin_path')
      `).all();

      for (const setting of settingsResult.results || settingsResult) {
        settings[setting.key] = setting.value;
      }
    } catch (error) {
      console.error('获取设置失败:', error);
      return next();
    }

    // 检查是否访问受保护的路径
    const isProtectedHomePath = settings.enable_home_path === 'true' &&
                               settings.home_path &&
                               (pathname === `/${settings.home_path}/` || pathname === `/${settings.home_path}`);

    const isProtectedAdminPath = settings.admin_path &&
                                pathname === `/${settings.admin_path}/admin.html`;

    // 如果访问受保护的首页路径，重写URL为首页
    if (isProtectedHomePath) {
      const newRequest = new Request(new URL('/index.html', request.url).href, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      return fetch(newRequest);
    }

    // 如果访问受保护的管理路径，重写URL为管理页面
    if (isProtectedAdminPath) {
      const newRequest = new Request(new URL('/admin.html', request.url).href, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      return fetch(newRequest);
    }

    // 检查是否应该阻止访问默认路径
    const shouldBlockHomePage = settings.enable_home_path === 'true' &&
                               settings.home_path &&
                               (pathname === '/' || pathname === '/index.html');

    const shouldBlockAdminPage = settings.admin_path &&
                                pathname === '/admin.html';

    if (shouldBlockHomePage || shouldBlockAdminPage) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>404 - 页面未找到</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #f5f5f5;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #e74c3c; }
            p { color: #666; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>页面未找到</p>
            <p>您访问的页面不存在或已被移动。</p>
          </div>
        </body>
        </html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 其他请求正常处理
    return next();

  } catch (error) {
    console.error('路径保护中间件错误:', error);
    return next();
  }
}
