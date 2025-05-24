/**
 * Top Navigation Component
 * 顶部导航组件
 */

window.TopNav = {
  template: `
    <nav class="top-nav">
      <div class="nav-brand">
        <i class="fas fa-cog"></i>
        <span>书签管理后台</span>
      </div>
      <div class="nav-actions">
        <span v-if="currentUser" class="nav-btn user-info">
          <i class="fas fa-user"></i>
          {{ currentUser.username }}
        </span>
        <button v-if="currentUser" @click="logout" class="nav-btn logout-btn" type="button">
          <i class="fas fa-sign-out-alt"></i>
          登出
        </button>
        <a href="index.html" class="nav-btn" title="返回前台">
          <i class="fas fa-home"></i>
          返回前台
        </a>
        <button class="nav-btn" @click="toggleTheme" title="切换主题" type="button">
          <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>
      </div>
    </nav>
  `,
  props: {
    currentUser: Object,
    isDark: Boolean
  },
  emits: ['logout', 'toggle-theme'],
  methods: {
    logout() {
      this.$emit('logout');
    },
    toggleTheme() {
      this.$emit('toggle-theme');
    }
  }
};
