/**
 * Loading Screen Component
 * 加载屏幕组件
 */

window.LoadingScreen = {
  template: `
    <div class="loading-container">
      <i class="fas fa-spinner fa-spin loading-icon"></i>
      <p class="loading-text">{{ message }}</p>
    </div>
  `,
  props: {
    message: {
      type: String,
      default: '正在加载...'
    }
  }
};
