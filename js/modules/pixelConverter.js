/**
 * Magic Pixel - 像素化转换模块
 *
 * 将高分辨率图片转换为低分辨率像素艺术风格
 */

const PixelConverter = {
    // 状态
    _sourceImage: null,
    _outputWidth: 32,
    _outputHeight: 32,
    _palette: null,
    _paletteType: 'auto',
    _colorCount: 16,
    _ditheringAlgorithm: 'none',
    _samplingMethod: 'average',
    _keepAspectRatio: true,

    // Bayer 矩阵 (用于有序抖动)
    _bayerMatrix: [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ],

    /**
     * 设置源图片
     * @param {HTMLImageElement} image - 图片元素
     */
    setSourceImage(image) {
        this._sourceImage = image;
    },

    /**
     * 设置输出尺寸
     * @param {number} width - 输出宽度
     * @param {number} height - 输出高度
     */
    setOutputSize(width, height) {
        this._outputWidth = Math.max(1, Math.min(256, width));
        this._outputHeight = Math.max(1, Math.min(256, height));
    },

    /**
     * 设置调色板
     * @param {string} type - 调色板类型: 'auto' | 'nes' | 'gameboy' | 'pico8' | 'ega' | 'custom'
     * @param {Array} customColors - 自定义颜色数组 (可选)
     */
    setPalette(type, customColors = null) {
        this._paletteType = type;

        if (type === 'custom' && customColors) {
            this._palette = customColors;
        } else if (type !== 'auto') {
            this._palette = PaletteQuantizer.getPreset(type);
        } else {
            this._palette = null; // 自动提取
        }
    },

    /**
     * 设置颜色数量 (用于自动提取调色板)
     * @param {number} count - 颜色数量
     */
    setColorCount(count) {
        this._colorCount = Math.max(2, Math.min(256, count));
    },

    /**
     * 设置抖动算法
     * @param {string} algorithm - 'none' | 'floydSteinberg' | 'atkinson' | 'ordered'
     */
    setDithering(algorithm) {
        this._ditheringAlgorithm = algorithm;
    },

    /**
     * 设置采样方法
     * @param {string} method - 'center' | 'average' | 'dominant' | 'median'
     */
    setSamplingMethod(method) {
        this._samplingMethod = method;
    },

    /**
     * 设置是否保持宽高比
     * @param {boolean} keep - 是否保持
     */
    setKeepAspectRatio(keep) {
        this._keepAspectRatio = keep;
    },

    /**
     * 执行像素化转换
     * @param {Object} options - 可选配置
     * @returns {HTMLCanvasElement} 像素化后的 Canvas
     */
    convert(options = {}) {
        if (!this._sourceImage) {
            console.error('未设置源图片');
            return null;
        }

        // 合并选项
        const config = {
            outputWidth: options.outputWidth || this._outputWidth,
            outputHeight: options.outputHeight || this._outputHeight,
            palette: options.palette || this._palette,
            paletteType: options.paletteType || this._paletteType,
            colorCount: options.colorCount || this._colorCount,
            dithering: options.dithering || this._ditheringAlgorithm,
            sampling: options.sampling || this._samplingMethod,
            keepAspectRatio: options.keepAspectRatio !== undefined ? options.keepAspectRatio : this._keepAspectRatio
        };

        // 计算实际输出尺寸
        let outputW = config.outputWidth;
        let outputH = config.outputHeight;

        if (config.keepAspectRatio && this._sourceImage) {
            const srcW = this._sourceImage.naturalWidth || this._sourceImage.width;
            const srcH = this._sourceImage.naturalHeight || this._sourceImage.height;
            const aspectRatio = srcW / srcH;

            if (outputW / outputH > aspectRatio) {
                outputW = Math.round(outputH * aspectRatio);
            } else {
                outputH = Math.round(outputW / aspectRatio);
            }
        }

        // 创建源图画布
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = this._sourceImage.naturalWidth || this._sourceImage.width;
        srcCanvas.height = this._sourceImage.naturalHeight || this._sourceImage.height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this._sourceImage, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

        // 创建输出画布
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputW;
        outputCanvas.height = outputH;
        const outputCtx = outputCanvas.getContext('2d');
        const outputData = outputCtx.createImageData(outputW, outputH);

        // 获取或提取调色板
        let palette = config.palette;
        if (config.paletteType === 'auto' || !palette) {
            palette = PaletteQuantizer.extractPalette(srcData, config.colorCount);
        }

        // 执行像素化
        this._pixelate(srcData, outputData, palette, config);

        // 应用抖动
        if (config.dithering !== 'none') {
            this._applyDithering(outputData, palette, config.dithering);
        }

        // 绘制结果
        outputCtx.putImageData(outputData, 0, 0);

        return outputCanvas;
    },

    /**
     * 像素化核心算法
     */
    _pixelate(srcData, outputData, palette, config) {
        const srcWidth = srcData.width;
        const srcHeight = srcData.height;
        const outWidth = outputData.width;
        const outHeight = outputData.height;

        // 计算每个输出像素对应的源图区域大小
        const cellWidth = srcWidth / outWidth;
        const cellHeight = srcHeight / outHeight;

        for (let outY = 0; outY < outHeight; outY++) {
            for (let outX = 0; outX < outWidth; outX++) {
                // 计算源图区域
                const srcX = Math.floor(outX * cellWidth);
                const srcY = Math.floor(outY * cellHeight);
                const cellW = Math.ceil(cellWidth);
                const cellH = Math.ceil(cellHeight);

                // 采样颜色
                const color = this._sampleColor(
                    srcData.data,
                    srcWidth, srcHeight,
                    srcX, srcY, cellW, cellH,
                    config.sampling
                );

                // 量化到调色板
                const quantizedColor = PaletteQuantizer.quantizeColor(color, palette);

                // 写入输出
                const outIdx = (outY * outWidth + outX) * 4;
                outputData.data[outIdx] = quantizedColor.r;
                outputData.data[outIdx + 1] = quantizedColor.g;
                outputData.data[outIdx + 2] = quantizedColor.b;
                outputData.data[outIdx + 3] = 255;
            }
        }
    },

    /**
     * 采样算法 - 从区域采样代表颜色
     */
    _sampleColor(data, imgWidth, imgHeight, x, y, cellW, cellH, method) {
        const colors = [];

        // 收集区域内的所有颜色
        for (let dy = 0; dy < cellH; dy++) {
            for (let dx = 0; dx < cellW; dx++) {
                const px = x + dx;
                const py = y + dy;

                if (px >= imgWidth || py >= imgHeight) continue;

                const idx = (py * imgWidth + px) * 4;
                colors.push({
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2],
                    a: data[idx + 3]
                });
            }
        }

        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        // 过滤透明像素
        const opaqueColors = colors.filter(c => c.a > 128);
        const targetColors = opaqueColors.length > 0 ? opaqueColors : colors;

        switch (method) {
            case 'center':
                // 中心点采样
                return this._centerSampling(targetColors, cellW, cellH);

            case 'average':
                // 平均采样
                return ColorUtils.getAverageColor(targetColors);

            case 'dominant':
                // 主导色采样
                return ColorUtils.getDominantColor(targetColors);

            case 'median':
                // 中值采样
                return ColorUtils.getMedianColor(targetColors);

            default:
                return ColorUtils.getAverageColor(targetColors);
        }
    },

    /**
     * 中心点采样
     */
    _centerSampling(colors, cellW, cellH) {
        // 计算中心点索引
        const centerIdx = Math.floor(cellH / 2) * Math.floor(cellW) + Math.floor(cellW / 2);
        if (colors[centerIdx]) {
            return colors[centerIdx];
        }
        // 如果中心点无效，返回中间位置的颜色
        return colors[Math.floor(colors.length / 2)] || colors[0];
    },

    /**
     * 应用抖动算法
     */
    _applyDithering(imageData, palette, algorithm) {
        switch (algorithm) {
            case 'floydSteinberg':
                this._floydSteinbergDithering(imageData, palette);
                break;
            case 'atkinson':
                this._atkinsonDithering(imageData, palette);
                break;
            case 'ordered':
                this._orderedDithering(imageData, palette);
                break;
        }
    },

    /**
     * Floyd-Steinberg 抖动
     */
    _floydSteinbergDithering(imageData, palette) {
        const { width, height, data } = imageData;

        // 创建浮点数缓冲区
        const buffer = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            buffer[i] = data[i];
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                const oldR = buffer[idx];
                const oldG = buffer[idx + 1];
                const oldB = buffer[idx + 2];

                // 量化
                const oldColor = { r: oldR, g: oldG, b: oldB };
                const newColor = PaletteQuantizer.quantizeColor(oldColor, palette);

                buffer[idx] = newColor.r;
                buffer[idx + 1] = newColor.g;
                buffer[idx + 2] = newColor.b;

                // 计算误差
                const errR = oldR - newColor.r;
                const errG = oldG - newColor.g;
                const errB = oldB - newColor.b;

                // 扩散误差
                this._distributeError(buffer, width, height, x + 1, y, errR, errG, errB, 7 / 16);
                this._distributeError(buffer, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
                this._distributeError(buffer, width, height, x, y + 1, errR, errG, errB, 5 / 16);
                this._distributeError(buffer, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
            }
        }

        // 复制回原始数据
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.max(0, Math.min(255, Math.round(buffer[i])));
        }
    },

    /**
     * Atkinson 抖动
     */
    _atkinsonDithering(imageData, palette) {
        const { width, height, data } = imageData;

        const buffer = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            buffer[i] = data[i];
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                const oldR = buffer[idx];
                const oldG = buffer[idx + 1];
                const oldB = buffer[idx + 2];

                const oldColor = { r: oldR, g: oldG, b: oldB };
                const newColor = PaletteQuantizer.quantizeColor(oldColor, palette);

                buffer[idx] = newColor.r;
                buffer[idx + 1] = newColor.g;
                buffer[idx + 2] = newColor.b;

                // Atkinson 只扩散 75% 的误差
                const errR = (oldR - newColor.r) * 0.75;
                const errG = (oldG - newColor.g) * 0.75;
                const errB = (oldB - newColor.b) * 0.75;

                // Atkinson 误差分布模式
                this._distributeError(buffer, width, height, x + 1, y, errR, errG, errB, 1 / 8);
                this._distributeError(buffer, width, height, x + 2, y, errR, errG, errB, 1 / 8);
                this._distributeError(buffer, width, height, x - 1, y + 1, errR, errG, errB, 1 / 8);
                this._distributeError(buffer, width, height, x, y + 1, errR, errG, errB, 1 / 8);
                this._distributeError(buffer, width, height, x + 1, y + 1, errR, errG, errB, 1 / 8);
                this._distributeError(buffer, width, height, x, y + 2, errR, errG, errB, 1 / 8);
            }
        }

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.max(0, Math.min(255, Math.round(buffer[i])));
        }
    },

    /**
     * 有序抖动 (Bayer 矩阵)
     */
    _orderedDithering(imageData, palette) {
        const { width, height, data } = imageData;
        const matrixSize = 4;
        const matrixScale = 255 / 17; // 17 = 16 + 1

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // 获取 Bayer 矩阵阈值
                const threshold = this._bayerMatrix[y % matrixSize][x % matrixSize] * matrixScale;

                // 添加阈值偏移
                const r = data[idx] + threshold - 127.5;
                const g = data[idx + 1] + threshold - 127.5;
                const b = data[idx + 2] + threshold - 127.5;

                const color = {
                    r: Math.max(0, Math.min(255, Math.round(r))),
                    g: Math.max(0, Math.min(255, Math.round(g))),
                    b: Math.max(0, Math.min(255, Math.round(b)))
                };

                const quantizedColor = PaletteQuantizer.quantizeColor(color, palette);

                data[idx] = quantizedColor.r;
                data[idx + 1] = quantizedColor.g;
                data[idx + 2] = quantizedColor.b;
            }
        }
    },

    /**
     * 分发误差到指定像素
     */
    _distributeError(buffer, width, height, x, y, errR, errG, errB, factor) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;

        const idx = (y * width + x) * 4;
        buffer[idx] += errR * factor;
        buffer[idx + 1] += errG * factor;
        buffer[idx + 2] += errB * factor;
    },

    /**
     * 导出为 Blob
     * @param {HTMLCanvasElement} canvas - 画布
     * @param {string} format - 格式: 'png' | 'jpg'
     * @param {number} scale - 缩放倍数
     * @param {number} quality - JPG 质量 (0-1)
     * @returns {Promise<Blob>}
     */
    async exportAsBlob(canvas, format = 'png', scale = 1, quality = 0.92) {
        // 创建缩放后的画布
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = canvas.width * scale;
        scaledCanvas.height = canvas.height * scale;
        const ctx = scaledCanvas.getContext('2d');

        // 使用最近邻插值保持像素锐利
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

        return new Promise((resolve) => {
            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
            scaledCanvas.toBlob(resolve, mimeType, quality);
        });
    },

    /**
     * 下载像素图
     * @param {HTMLCanvasElement} canvas - 画布
     * @param {string} filename - 文件名
     * @param {string} format - 格式
     * @param {number} scale - 缩放倍数
     */
    async download(canvas, filename = 'pixel-art', format = 'png', scale = 1) {
        const blob = await this.exportAsBlob(canvas, format, scale);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * 获取当前配置
     */
    getConfig() {
        return {
            outputWidth: this._outputWidth,
            outputHeight: this._outputHeight,
            paletteType: this._paletteType,
            colorCount: this._colorCount,
            dithering: this._ditheringAlgorithm,
            sampling: this._samplingMethod,
            keepAspectRatio: this._keepAspectRatio
        };
    },

    /**
     * 重置配置
     */
    reset() {
        this._sourceImage = null;
        this._outputWidth = 32;
        this._outputHeight = 32;
        this._palette = null;
        this._paletteType = 'auto';
        this._colorCount = 16;
        this._ditheringAlgorithm = 'none';
        this._samplingMethod = 'average';
        this._keepAspectRatio = true;
    }
};
