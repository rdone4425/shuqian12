/**
 * Tab Navigation Component
 * 标签页导航组件
 */

window.TabNav = {
  template: `
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="switchTab(tab.id)"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        type="button"
      >
        <i :class="tab.icon"></i>
        {{ tab.name }}
      </button>
    </div>
  `,
  props: {
    tabs: {
      type: Array,
      required: true
    },
    activeTab: {
      type: String,
      required: true
    }
  },
  emits: ['switch-tab'],
  methods: {
    switchTab(tabId) {
      this.$emit('switch-tab', tabId);
    }
  }
};
