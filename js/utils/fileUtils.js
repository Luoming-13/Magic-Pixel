/**
 * Magic Pixel - 文件处理工具函数
 */

const FileUtils = {
    /**
     * 下载 Blob 文件
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 下载 DataURL
     */
    downloadDataUrl(dataUrl, filename) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    /**
     * 生成序列文件名
     * @param {number} index - 序号 (0-based)
     * @param {number} padding - 填充位数
     * @param {string} prefix - 文件名前缀
     * @param {string} format - 文件格式 (png/jpg)
     */
    generateFileName(index, padding = 3, prefix = 'piece', format = 'png') {
        const num = String(index + 1).padStart(padding, '0');
        const ext = CONFIG.EXPORT_EXTENSIONS[format] || format;
        return `${prefix}_${num}.${ext}`;
    },

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    },

    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
    },

    /**
     * 验证图片类型
     */
    isValidImageType(type) {
        return CONFIG.SUPPORTED_FORMATS.includes(type);
    },

    /**
     * 验证文件大小
     */
    isValidFileSize(size) {
        return size <= CONFIG.MAX_FILE_SIZE;
    },

    /**
     * 读取文件为 DataURL
     */
    readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * 加载图片
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    }
};
