/**
 * Magic Pixel - 源图加载模块（原 FrameLoader）
 *
 * 负责单图导入和管理源图数据
 * 改造：从多帧导入改为单图导入
 */

const SourceLoader = {
    // 当前源图数据
    _source: null,

    // DOM 元素
    _dropZone: null,
    _fileInput: null,

    // 回调函数
    _callbacks: {
        loaded: [],
        error: []
    },

    /**
     * 初始化
     * @param {string|HTMLElement} dropZone - 拖拽区域元素或选择器
     * @param {string|HTMLElement} fileInput - 文件输入元素或选择器
     */
    init(dropZone, fileInput) {
        this._dropZone = typeof dropZone === 'string' ? DOM.$(dropZone) : dropZone;
        this._fileInput = typeof fileInput === 'string' ? DOM.$(fileInput) : fileInput;

        // 禁用多选（单图模式）
        if (this._fileInput) {
            this._fileInput.multiple = false;
        }

        console.log('SourceLoader - 初始化完成（单图模式）');
    },

    /**
     * 处理文件
     * @param {FileList|File[]} files - 文件列表
     */
    async handleFiles(files) {
        const validFiles = this._validateFiles(files);

        if (validFiles.length === 0) {
            this._emit('error', ['请选择有效的图片文件']);
            return;
        }

        // 只取第一个文件（单图模式）
        const file = validFiles[0];

        try {
            this._source = await this._loadSource(file);
            this._emit('loaded', [this._source]);
        } catch (error) {
            this._emit('error', [error.message]);
        }
    },

    /**
     * 验证文件
     * @param {FileList|File[]} files - 文件列表
     * @returns {File[]} 有效文件数组
     */
    _validateFiles(files) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

        return Array.from(files).filter(file => {
            return validTypes.includes(file.type);
        });
    },

    /**
     * 加载源图
     * @param {File} file - 文件对象
     * @returns {Promise<Object>} 源图数据对象
     */
    async _loadSource(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    resolve({
                        id: `source_${Date.now()}`,
                        name: file.name,
                        file: file,
                        image: img,
                        width: img.width,
                        height: img.height
                    });
                };

                img.onerror = () => {
                    reject(new Error('图片加载失败'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };

            reader.readAsDataURL(file);
        });
    },

    /**
     * 获取当前源图
     * @returns {Object|null} 源图数据对象
     */
    getSource() {
        return this._source;
    },

    /**
     * 检查是否已加载源图
     * @returns {boolean}
     */
    hasSource() {
        return this._source !== null;
    },

    /**
     * 清除源图
     */
    clear() {
        this._source = null;
    },

    /**
     * 注册事件回调
     * @param {string} event - 事件名称 ('loaded' | 'error')
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (this._callbacks[event]) {
            this._callbacks[event].push(callback);
        }
    },

    /**
     * 移除事件回调
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this._callbacks[event]) {
            const index = this._callbacks[event].indexOf(callback);
            if (index > -1) {
                this._callbacks[event].splice(index, 1);
            }
        }
    },

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {Array} args - 参数数组
     */
    _emit(event, args) {
        if (this._callbacks[event]) {
            this._callbacks[event].forEach(callback => {
                try {
                    callback.apply(null, args);
                } catch (error) {
                    console.error(`SourceLoader callback error [${event}]:`, error);
                }
            });
        }
    }
};

// 兼容性别名（保持向后兼容）
const FrameLoader = SourceLoader;

// 导出
if (typeof window !== 'undefined') {
    window.SourceLoader = SourceLoader;
    window.FrameLoader = FrameLoader;
}
