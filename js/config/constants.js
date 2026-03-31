/**
 * Magic Pixel - 配置常量
 */

// 应用基本信息
const APP_CONFIG = {
    name: 'Magic Pixel',
    version: 'V1'
};

const CONFIG = {
    // 支持的图片格式
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],

    // 文件扩展名映射
    FORMAT_EXTENSIONS: {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/bmp': 'bmp'
    },

    // 导出格式扩展名
    EXPORT_EXTENSIONS: {
        'png': 'png',
        'jpg': 'jpg'
    },

    // 最大文件大小 (50MB)
    MAX_FILE_SIZE: 50 * 1024 * 1024,

    // JPEG 导出质量 (0-1)
    JPEG_QUALITY: 0.92,

    // 默认命名规则
    DEFAULT_PREFIX: 'piece',
    DEFAULT_PADDING: 3,

    // 最大切割数
    MAX_GRID_SIZE: 50,

    // 网格预览样式
    GRID_LINE_COLOR: 'rgba(255, 255, 255, 0.8)',
    GRID_LINE_WIDTH: 2,
    GRID_SHADOW: '0 0 2px rgba(0, 0, 0, 0.5)',

    // UI 配置
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300
};

// 冻结配置对象
Object.freeze(CONFIG);
