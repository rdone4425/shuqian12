/**
 * 为插件创建新的数据库表
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: '只支持 POST 请求'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = env.DB;
    
    // 检查是否绑定了D1数据库
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: '未绑定D1数据库',
        error_type: 'no_database_binding'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 测试数据库连接
    try {
      await db.prepare('SELECT 1').first();
    } catch (connectionError) {
      return new Response(JSON.stringify({
        success: false,
        message: 'D1数据库连接失败',
        error_type: 'connection_failed',
        error_details: connectionError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    
    // 验证请求数据
    if (!data.table_name || !data.columns) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必需的参数：table_name 和 columns'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { table_name, columns, indexes = [], description = '' } = data;

    // 验证表名
    if (!isValidTableName(table_name)) {
      return new Response(JSON.stringify({
        success: false,
        message: '无效的表名。表名只能包含字母、数字和下划线，且必须以字母开头'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查表是否已存在
    try {
      const existingTable = await db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).bind(table_name).first();

      if (existingTable) {
        return new Response(JSON.stringify({
          success: false,
          message: `表 "${table_name}" 已存在`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('检查表存在性失败:', error);
    }

    const results = [];

    try {
      // 构建CREATE TABLE语句
      const columnDefinitions = columns.map(col => {
        if (!col.name || !col.type) {
          throw new Error('每个列必须包含 name 和 type 属性');
        }
        
        let definition = `${col.name} ${col.type.toUpperCase()}`;
        
        if (col.primary_key) {
          definition += ' PRIMARY KEY';
          if (col.auto_increment) {
            definition += ' AUTOINCREMENT';
          }
        }
        
        if (col.not_null) {
          definition += ' NOT NULL';
        }
        
        if (col.unique) {
          definition += ' UNIQUE';
        }
        
        if (col.default !== undefined) {
          if (typeof col.default === 'string') {
            definition += ` DEFAULT '${col.default}'`;
          } else {
            definition += ` DEFAULT ${col.default}`;
          }
        }
        
        return definition;
      }).join(', ');

      const createTableSQL = `CREATE TABLE ${table_name} (${columnDefinitions})`;
      
      console.log('创建表SQL:', createTableSQL);
      
      // 创建表
      await db.exec(createTableSQL);
      results.push(`✅ 表 "${table_name}" 创建成功`);

      // 创建索引
      if (indexes && indexes.length > 0) {
        for (const index of indexes) {
          try {
            const indexName = index.name || `idx_${table_name}_${index.columns.join('_')}`;
            const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
            const indexSQL = `CREATE ${indexType} ${indexName} ON ${table_name}(${index.columns.join(', ')})`;
            
            await db.exec(indexSQL);
            results.push(`✅ 索引 "${indexName}" 创建成功`);
          } catch (indexError) {
            console.error(`创建索引失败:`, indexError);
            results.push(`❌ 索引 "${index.name || 'unnamed'}" 创建失败: ${indexError.message}`);
          }
        }
      }

      // 记录表创建日志
      try {
        await db.prepare(`
          INSERT INTO plugin_logs (action, details, status, created_at) 
          VALUES (?, ?, ?, datetime('now'))
        `).bind(
          'create_plugin_table',
          JSON.stringify({
            table_name,
            columns,
            indexes,
            description,
            results
          }),
          'success'
        ).run();
      } catch (logError) {
        console.error('记录日志失败:', logError);
        // 不影响主要操作
      }

      return new Response(JSON.stringify({
        success: true,
        message: `插件表 "${table_name}" 创建完成`,
        table_name: table_name,
        results: results,
        created_columns: columns.length,
        created_indexes: indexes.length,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('创建插件表失败:', error);
      
      // 记录错误日志
      try {
        await db.prepare(`
          INSERT INTO plugin_logs (action, details, status, error_message, created_at) 
          VALUES (?, ?, ?, ?, datetime('now'))
        `).bind(
          'create_plugin_table_failed',
          JSON.stringify({ table_name, columns, indexes }),
          'error',
          error.message
        ).run();
      } catch (logError) {
        console.error('记录错误日志失败:', logError);
      }

      return new Response(JSON.stringify({
        success: false,
        message: '创建插件表失败: ' + error.message,
        table_name: table_name,
        results: results,
        error: error.toString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('插件表创建请求处理失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '请求处理失败: ' + error.message,
      error: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 验证表名
function isValidTableName(tableName) {
  // 表名只能包含字母、数字和下划线，且必须以字母开头
  const tableNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return tableNameRegex.test(tableName) && tableName.length <= 64;
}
