/**
 * Magic Pixel - 图片导出模块
 */

const ImageExporter = {
    // 状态
    _pieces: [],
    _format: 'png',
    _prefix: CONFIG.DEFAULT_PREFIX,
    _padding: CONFIG.DEFAULT_PADDING,

    /**
     * 设置切割块
     */
    setPieces(pieces) {
        this._pieces = pieces;
    },

    /**
     * 设置导出格式
     */
    setFormat(format) {
        this._format = (format === 'jpg' || format === 'png') ? format : 'png';
    },

    /**
     * 设置命名规则
     */
    setNamingRule(prefix, padding) {
        this._prefix = prefix || CONFIG.DEFAULT_PREFIX;
        this._padding = padding || CONFIG.DEFAULT_PADDING;
    },

    /**
     * 生成文件名
     */
    generateFileName(index) {
        return FileUtils.generateFileName(index, this._padding, this._prefix, this._format);
    },

    /**
     * 下载单个图片
     */
    async downloadSingle(index) {
        const piece = this._pieces[index];
        if (!piece || !piece.canvas) {
            throw new Error('切割块不存在');
        }

        try {
            const blob = await CanvasUtils.canvasToBlob(piece.canvas, this._format);
            const filename = this.generateFileName(index);
            FileUtils.downloadBlob(blob, filename);
            return true;
        } catch (error) {
            throw new Error('导出失败: ' + error.message);
        }
    },

    /**
     * 打包为 ZIP 下载
     */
    async downloadAllAsZip(progressCallback) {
        if (this._pieces.length === 0) {
            throw new Error('没有可导出的切割块');
        }

        try {
            const zip = new JSZip();
            const total = this._pieces.length;

            for (let i = 0; i < total; i++) {
                const piece = this._pieces[i];
                if (!piece.canvas) continue;

                // 获取 Blob
                const blob = await CanvasUtils.canvasToBlob(piece.canvas, this._format);

                // 生成文件名
                const filename = this.generateFileName(i);

                // 添加到 ZIP
                zip.file(filename, blob);

                // 更新进度
                if (progressCallback) {
                    progressCallback(Math.round((i + 1) / total * 100));
                }
            }

            // 生成 ZIP
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // 触发下载
            const timestamp = new Date().toISOString().slice(0, 10);
            FileUtils.downloadBlob(zipBlob, `magic-pixel_${timestamp}.zip`);

            return true;
        } catch (error) {
            throw new Error('ZIP 打包失败: ' + error.message);
        }
    },

    /**
     * 获取当前配置
     */
    getConfig() {
        return {
            format: this._format,
            prefix: this._prefix,
            padding: this._padding
        };
    },

    /**
     * 清除
     */
    clear() {
        this._pieces = [];
    }
};
