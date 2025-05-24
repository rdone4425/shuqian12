/**
 * Placeholder Tab Component
 * 占位符标签页组件 - 用于未完成的功能
 */

window.PlaceholderTab = {
  template: `
    <div class="tab-placeholder">
      <i class="fas fa-cog fa-spin placeholder-icon"></i>
      <h3 class="placeholder-title">{{ tabName }}</h3>
      <p class="placeholder-description">{{ description || '功能正在开发中，敬请期待...' }}</p>
      <button @click="$emit('switch-tab', 'dashboard')" class="btn btn-primary" type="button">
        <i class="fas fa-arrow-left"></i>
        返回监控面板
      </button>
    </div>
  `,
  props: {
    tabName: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  emits: ['switch-tab']
};
