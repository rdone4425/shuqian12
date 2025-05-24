/**
 * 缓存工具类 - 使用 KV 存储减少 D1 延迟
 */

export class BookmarkCache {
  constructor(kvNamespace) {
    this.kv = kvNamespace;
    this.TTL = {
      BOOKMARKS_LIST: 300,      // 5分钟
      CATEGORIES: 1800,         // 30分钟
      STATS: 600,               // 10分钟
      DOMAINS: 900,             // 15分钟
      SEARCH_RESULTS: 180       // 3分钟
    };
  }

  // 生成缓存键
  generateKey(type, params = {}) {
    const baseKey = `bookmark_cache:${type}`;
    
    if (Object.keys(params).length === 0) {
      return baseKey;
    }
    
    // 对参数排序确保一致性
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${baseKey}:${sortedParams}`;
  }

  // 获取缓存数据
  async get(type, params = {}) {
    if (!this.kv) return null;
    
    try {
      const key = this.generateKey(type, params);
      const cached = await this.kv.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`缓存命中: ${key}`);
        return {
          ...data,
          cached: true,
          cache_key: key
        };
      }
      
      console.log(`缓存未命中: ${key}`);
      return null;
    } catch (error) {
      console.error('缓存读取失败:', error);
      return null;
    }
  }

  // 设置缓存数据
  async set(type, data, params = {}, customTTL = null) {
    if (!this.kv) return false;
    
    try {
      const key = this.generateKey(type, params);
      const ttl = customTTL || this.TTL[type.toUpperCase()] || 300;
      
      const cacheData = {
        ...data,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString()
      };
      
      await this.kv.put(key, JSON.stringify(cacheData), {
        expirationTtl: ttl
      });
      
      console.log(`缓存设置成功: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      console.error('缓存设置失败:', error);
      return false;
    }
  }

  // 删除缓存
  async delete(type, params = {}) {
    if (!this.kv) return false;
    
    try {
      const key = this.generateKey(type, params);
      await this.kv.delete(key);
      console.log(`缓存删除: ${key}`);
      return true;
    } catch (error) {
      console.error('缓存删除失败:', error);
      return false;
    }
  }

  // 批量删除相关缓存
  async invalidateRelated(types) {
    if (!this.kv) return false;
    
    try {
      // 由于 KV 不支持模式匹配删除，我们需要维护一个键列表
      // 这里简化处理，删除常见的缓存键
      const keysToDelete = [];
      
      for (const type of types) {
        switch (type) {
          case 'bookmarks':
            keysToDelete.push(
              this.generateKey('bookmarks_list'),
              this.generateKey('bookmarks_list', { page: 1 }),
              this.generateKey('stats'),
              this.generateKey('domains')
            );
            break;
          case 'categories':
            keysToDelete.push(
              this.generateKey('categories'),
              this.generateKey('bookmarks_list')
            );
            break;
          case 'stats':
            keysToDelete.push(
              this.generateKey('stats'),
              this.generateKey('domains')
            );
            break;
        }
      }
      
      // 批量删除
      await Promise.all(keysToDelete.map(key => this.kv.delete(key)));
      console.log(`批量删除缓存: ${keysToDelete.length} 个键`);
      return true;
    } catch (error) {
      console.error('批量删除缓存失败:', error);
      return false;
    }
  }

  // 预热缓存 - 在后台更新常用数据
  async warmup(db) {
    if (!this.kv || !db) return false;
    
    try {
      console.log('开始缓存预热...');
      
      // 预热书签列表（第一页）
      const bookmarksQuery = `
        SELECT id, title, url, domain, path, category_id, subcategory, icon_url, description, created_at, updated_at
        FROM bookmarks
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const bookmarks = await db.prepare(bookmarksQuery).all();
      
      await this.set('bookmarks_list', {
        bookmarks: bookmarks.results || [],
        total: bookmarks.results?.length || 0,
        page: 1,
        limit: 20
      }, { page: 1 });
      
      // 预热分类列表
      const categoriesQuery = `SELECT * FROM categories ORDER BY name`;
      const categories = await db.prepare(categoriesQuery).all();
      
      await this.set('categories', {
        categories: categories.results || []
      });
      
      // 预热统计数据
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM bookmarks) as total_bookmarks,
          (SELECT COUNT(*) FROM categories) as total_categories,
          (SELECT COUNT(DISTINCT domain) FROM bookmarks) as total_domains
      `;
      const stats = await db.prepare(statsQuery).first();
      
      await this.set('stats', stats || {});
      
      console.log('缓存预热完成');
      return true;
    } catch (error) {
      console.error('缓存预热失败:', error);
      return false;
    }
  }
}

// 缓存策略配置
export const CACHE_STRATEGIES = {
  // 书签列表 - 根据参数决定缓存策略
  BOOKMARKS_LIST: {
    shouldCache: (params) => {
      // 只缓存简单查询（无搜索、无过滤）
      return !params.search && !params.category && !params.domain && params.page <= 3;
    },
    ttl: 300
  },
  
  // 分类列表 - 变化较少，长时间缓存
  CATEGORIES: {
    shouldCache: () => true,
    ttl: 1800
  },
  
  // 统计数据 - 中等缓存时间
  STATS: {
    shouldCache: () => true,
    ttl: 600
  },
  
  // 域名统计 - 中等缓存时间
  DOMAINS: {
    shouldCache: () => true,
    ttl: 900
  }
};

// 导出工具函数
export function createCacheInstance(kvNamespace) {
  return new BookmarkCache(kvNamespace);
}
