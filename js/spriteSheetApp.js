/**
 * Sprite Sheet App - 应用入口
 *
 * 精灵图合成工具主入口文件
 */

const SpriteSheetApp = {
    /**
     * 初始化应用
     */
    init() {
        console.log('Sprite Sheet - 初始化中...');

        // 初始化 UI 控制器
        SpriteSheetUI.init();

        console.log('Sprite Sheet - 初始化完成');
    }
};

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 更新主标题
    if (typeof APP_CONFIG !== 'undefined') {
        document.querySelectorAll('[data-i18n="appName"]').forEach(el => {
            el.textContent = APP_CONFIG.name;
        });
    }
    SpriteSheetApp.init();
});
