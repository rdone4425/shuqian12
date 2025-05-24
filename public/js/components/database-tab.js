/**
 * Database Tab Component
 * 数据库管理标签页组件
 */

window.DatabaseTab = {
  template: `
    <div class="tab-panel">
      <div class="panel-header">
        <h2>数据库管理</h2>
      </div>

      <div class="database-cards">
        <div class="db-card">
          <h3><i class="fas fa-search"></i> 数据库检查</h3>
          <p class="card-description">检查D1数据库绑定状态和表结构完整性</p>
          <button @click="checkDatabase" class="btn btn-primary" :disabled="dbLoading" type="button">
            <i class="fas fa-search"></i>
            检查数据库
          </button>
        </div>

        <div class="db-card">
          <h3><i class="fas fa-magic"></i> 数据库初始化</h3>
          <p class="card-description">创建书签系统所需的所有数据表和索引</p>
          <button @click="initDatabase" class="btn btn-success" :disabled="dbLoading" type="button">
            <i class="fas fa-play"></i>
            初始化数据库
          </button>
        </div>

        <div class="db-card">
          <h3><i class="fas fa-download"></i> 数据导出</h3>
          <p class="card-description">导出所有书签数据为JSON格式</p>
          <button @click="exportData" class="btn btn-info" :disabled="dbLoading" type="button">
            <i class="fas fa-download"></i>
            导出数据
          </button>
        </div>

        <div class="db-card">
          <h3><i class="fas fa-upload"></i> 数据导入</h3>
          <p class="card-description">从JSON文件导入书签数据</p>
          <input type="file" ref="fileInput" @change="importData" accept=".json" style="display: none">
          <button @click="$refs.fileInput?.click()" class="btn btn-warning" :disabled="dbLoading" type="button">
            <i class="fas fa-upload"></i>
            导入数据
          </button>
        </div>
      </div>

      <!-- 数据库状态 -->
      <div class="db-status">
        <h3>数据库状态</h3>
        <div class="status-info">
          <div class="status-item">
            <span class="label">连接状态:</span>
            <span :class="['status', dbConnected ? 'success' : 'error']">
              {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">表结构:</span>
            <span :class="['status', tablesExist ? 'success' : 'warning']">
              {{ tablesExist ? '✅ 正常' : '⚠️ 需要初始化' }}
            </span>
          </div>
        </div>

        <!-- 操作结果 -->
        <div v-if="dbMessage" class="db-message" :class="dbMessageType">
          {{ dbMessage }}
        </div>

        <!-- 快速操作按钮 -->
        <div class="db-quick-actions">
          <button @click="checkDatabase" class="btn btn-info btn-sm" :disabled="dbLoading" type="button">
            <i class="fas fa-sync" :class="{ 'fa-spin': dbLoading }"></i>
            {{ dbLoading ? '检查中...' : '重新检查' }}
          </button>

          <button v-if="!tablesExist" @click="initDatabase" class="btn btn-success btn-sm" :disabled="dbLoading" type="button">
            <i class="fas fa-magic"></i>
            快速初始化
          </button>
        </div>
      </div>
    </div>
  `,
  props: {
    dbConnected: Boolean,
    tablesExist: Boolean,
    dbLoading: Boolean,
    dbMessage: String,
    dbMessageType: String
  },
  emits: ['check-database', 'init-database', 'export-data', 'import-data'],
  methods: {
    checkDatabase() {
      this.$emit('check-database');
    },
    initDatabase() {
      this.$emit('init-database');
    },
    exportData() {
      this.$emit('export-data');
    },
    importData(event) {
      this.$emit('import-data', event);
    }
  }
};
