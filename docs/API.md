# 📡 API 接口文档

书签管理系统提供了完整的 RESTful API 接口，支持书签管理、用户认证、系统管理等功能。

## 🌐 基础信息

### API 基础 URL
```
https://你的域名.pages.dev/api
```

### 认证方式
- **Session Cookie** - Web 界面使用
- **Bearer Token** - API 调用使用

### 响应格式
所有 API 响应都采用 JSON 格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息",
  "code": "ERROR_CODE"
}
```

## 📚 书签管理 API

### 获取书签列表
```http
GET /api/bookmarks
```

**查询参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `page` | number | 否 | 页码，默认 1 |
| `limit` | number | 否 | 每页数量，默认 20 |
| `search` | string | 否 | 搜索关键词 |
| `category` | number | 否 | 分类 ID |
| `domain` | string | 否 | 域名筛选 |

**响应示例：**
```json
{
  "success": true,
  "书签": [
    {
      "id": 1,
      "title": "Google",
      "url": "https://www.google.com",
      "domain": "google.com",
      "path": "/",
      "category_id": 1,
      "category_name": "搜索引擎",
      "icon_url": "https://www.google.com/favicon.ico",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "分页": {
    "当前页": 1,
    "每页数量": 20,
    "总数": 100,
    "总页数": 5
  }
}
```

### 创建书签
```http
POST /api/bookmarks
```

**请求体：**
```json
{
  "title": "网站标题",
  "url": "https://example.com",
  "category_id": 1,
  "description": "网站描述"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "书签创建成功",
  "bookmark": {
    "id": 123,
    "title": "网站标题",
    "url": "https://example.com",
    "domain": "example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 批量创建书签
```http
POST /api/bookmarks
```

**请求体：**
```json
{
  "action": "fullSync",
  "data": [
    {
      "title": "Google",
      "url": "https://www.google.com",
      "category_id": 1
    },
    {
      "title": "GitHub",
      "url": "https://github.com",
      "category_id": 2
    }
  ]
}
```

### 更新书签
```http
PUT /api/bookmarks
```

**请求体：**
```json
{
  "id": 123,
  "title": "新标题",
  "category_id": 2,
  "description": "新描述"
}
```

### 删除书签
```http
DELETE /api/bookmarks?id=123
```

## 👥 用户认证 API

### 用户登录
```http
POST /api/auth/login
```

**请求体：**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  "session": {
    "id": "session_id_here",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### 用户登出
```http
POST /api/auth/logout
```

### 获取用户列表
```http
GET /api/auth/users
```

**响应示例：**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "last_login": "2024-01-01T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 创建用户
```http
POST /api/auth/users
```

**请求体：**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "role": "admin"
}
```

## 📂 分类管理 API

### 获取分类列表
```http
GET /api/categories
```

**响应示例：**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "工作",
      "description": "工作相关的书签",
      "parent_id": null,
      "bookmark_count": 25,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 创建分类
```http
POST /api/categories
```

**请求体：**
```json
{
  "name": "新分类",
  "description": "分类描述",
  "parent_id": null
}
```

### 更新分类
```http
PUT /api/categories
```

**请求体：**
```json
{
  "id": 1,
  "name": "更新的分类名",
  "description": "更新的描述"
}
```

### 删除分类
```http
DELETE /api/categories?id=1
```

## 🛠️ 系统管理 API

### 获取系统统计
```http
GET /api/system/stats
```

**响应示例：**
```json
{
  "success": true,
  "stats": {
    "bookmarks": {
      "total": 1250,
      "today": 15,
      "this_week": 89,
      "this_month": 234
    },
    "categories": {
      "total": 12,
      "used": 8
    },
    "domains": {
      "total": 156,
      "top_domains": [
        { "domain": "github.com", "count": 45 },
        { "domain": "stackoverflow.com", "count": 32 }
      ]
    }
  }
}
```

### 数据库初始化
```http
POST /api/database/init
```

**响应示例：**
```json
{
  "success": true,
  "message": "数据库初始化完成",
  "results": [
    "✅ 分类表创建成功",
    "✅ 书签表创建成功",
    "✅ 用户表创建成功"
  ]
}
```

### 获取域名统计
```http
GET /api/domains/stats
```

**响应示例：**
```json
{
  "success": true,
  "domains": [
    {
      "domain": "github.com",
      "bookmark_count": 45,
      "percentage": 15.2
    }
  ],
  "total_domains": 156,
  "total_bookmarks": 1250
}
```

## ⚙️ 设置管理 API

### 获取安全设置
```http
GET /api/settings/security
```

**响应示例：**
```json
{
  "success": true,
  "settings": {
    "admin_path": {
      "value": "secret123",
      "description": "管理后台访问路径"
    },
    "require_login": {
      "value": "true",
      "description": "是否需要登录访问管理后台"
    },
    "session_timeout": {
      "value": "86400",
      "description": "会话超时时间（秒）"
    }
  },
  "stats": {
    "users": {
      "total_users": 2,
      "active_users": 1,
      "locked_users": 0
    },
    "sessions": {
      "active_sessions": 3,
      "expired_sessions": 15
    }
  }
}
```

### 更新安全设置
```http
PUT /api/settings/security
```

**请求体：**
```json
{
  "settings": {
    "admin_path": "newsecret",
    "require_login": "true",
    "session_timeout": "7200"
  }
}
```

## 📊 监控和日志 API

### 获取同步日志
```http
GET /api/system/logs
```

**查询参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `type` | string | 否 | 日志类型 |
| `level` | string | 否 | 日志级别 |
| `limit` | number | 否 | 返回数量 |

**响应示例：**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "type": "sync",
      "level": "info",
      "message": "书签同步成功",
      "details": "{\"count\": 15}",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 🔒 认证和权限

### 认证方式

#### 1. Session Cookie（推荐）
```javascript
// 登录后自动设置 Cookie
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password' })
});
```

#### 2. Bearer Token
```javascript
// 在请求头中包含 Token
fetch('/api/bookmarks', {
  headers: {
    'Authorization': 'Bearer your_session_token_here'
  }
});
```

### 权限级别

| 级别 | 描述 | 可访问的 API |
|------|------|-------------|
| **公开** | 无需认证 | `/api/database/init` |
| **用户** | 需要登录 | 大部分 API |
| **管理员** | 需要管理员权限 | 用户管理、系统设置 |

## 🚨 错误代码

| 状态码 | 错误代码 | 描述 |
|--------|----------|------|
| 400 | `INVALID_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未授权访问 |
| 403 | `FORBIDDEN` | 权限不足 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突 |
| 423 | `LOCKED` | 账户被锁定 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

## 📝 使用示例

### JavaScript 示例

```javascript
// 获取书签列表
async function getBookmarks(page = 1, search = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20'
  });
  
  if (search) {
    params.append('search', search);
  }
  
  const response = await fetch(`/api/bookmarks?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.书签;
  } else {
    throw new Error(data.message);
  }
}

// 创建书签
async function createBookmark(bookmark) {
  const response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookmark)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.bookmark;
}
```

### Python 示例

```python
import requests

class BookmarkAPI:
    def __init__(self, base_url, session_token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if session_token:
            self.session.headers.update({
                'Authorization': f'Bearer {session_token}'
            })
    
    def get_bookmarks(self, page=1, search=''):
        params = {'page': page, 'limit': 20}
        if search:
            params['search'] = search
            
        response = self.session.get(
            f'{self.base_url}/api/bookmarks',
            params=params
        )
        
        data = response.json()
        if data['success']:
            return data['书签']
        else:
            raise Exception(data['message'])
    
    def create_bookmark(self, title, url, category_id=None):
        bookmark_data = {
            'title': title,
            'url': url
        }
        if category_id:
            bookmark_data['category_id'] = category_id
            
        response = self.session.post(
            f'{self.base_url}/api/bookmarks',
            json=bookmark_data
        )
        
        data = response.json()
        if not data['success']:
            raise Exception(data['message'])
            
        return data['bookmark']
```

## 🔄 版本更新

当前 API 版本：**v1.0**

### 版本兼容性
- 向后兼容所有 v1.x 版本
- 新功能通过新的端点添加
- 废弃的功能会提前通知

### 更新通知
- 关注 GitHub Releases 获取更新信息
- 重大变更会在文档中标注
- 建议定期检查 API 文档更新

---

更多详细信息请参考项目的 [GitHub 仓库](https://github.com/你的用户名/bookmark-manager) 或在管理后台的 **API 文档** 标签页中查看交互式文档。
