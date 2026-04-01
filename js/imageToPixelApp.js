/**
 * Magic Pixel - 图片转像素功能入口
 *
 * 整合所有模块，实现完整的交互逻辑
 */

const ImageToPixelApp = {
    // 状态
    _state: {
        sourceImage: null,
        imageInfo: null,
        gridInfo: null,
        pixelCanvas: null,
        exportScale: 1,
        exportFormat: 'png',
        colorCount: 16
    },

    // DOM 元素引用
    _elements: {},

    /**
     * 初始化应用
     */
    init() {
        this._cacheElements();
        this._bindEvents();
        this._initImageLoader();
        console.log('Image to Pixel App initialized');
    },

    /**
     * 缓存 DOM 元素引用
     */
    _cacheElements() {
        this._elements = {
            // 上传相关
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            imageInfo: document.getElementById('imageInfo'),
            imageName: document.getElementById('imageName'),
            imageSize: document.getElementById('imageSize'),

            // 网格检测
            autoDetectGrid: document.getElementById('autoDetectGrid'),
            cellWidthInput: document.getElementById('cellWidthInput'),
            cellHeightInput: document.getElementById('cellHeightInput'),
            gridDetectionResult: document.getElementById('gridDetectionResult'),
            detectedCellSize: document.getElementById('detectedCellSize'),
            detectionConfidence: document.getElementById('detectionConfidence'),
            removeGridLines: document.getElementById('removeGridLines'),

            // 输出设置
            outputWidthInput: document.getElementById('outputWidthInput'),
            outputHeightInput: document.getElementById('outputHeightInput'),
            keepAspectRatio: document.getElementById('keepAspectRatio'),
            outputSizeInfo: document.getElementById('outputSizeInfo'),

            // 像素化设置
            paletteSelect: document.getElementById('paletteSelect'),
            colorCountLabel: document.getElementById('colorCountLabel'),
            colorCountBtns: document.querySelectorAll('.color-count-btn'),
            samplingSelect: document.getElementById('samplingSelect'),
            ditheringSelect: document.getElementById('ditheringSelect'),
            convertBtn: document.getElementById('convertBtn'),

            // 导出
            exportFormat: document.querySelectorAll('input[name="exportFormat"]'),
            scaleBtns: document.querySelectorAll('.scale-btn'),
            downloadBtn: document.getElementById('downloadBtn'),

            // 预览
            previewContainer: document.getElementById('previewContainer'),
            previewWrapper: document.getElementById('previewWrapper'),
            previewCanvas: document.getElementById('previewCanvas'),
            gridOverlay: document.getElementById('gridOverlay'),
            previewZoomSlider: document.getElementById('previewZoomSlider'),
            previewZoomValue: document.getElementById('previewZoomValue'),

            // 像素化结果
            pixelSection: document.getElementById('pixelSection'),
            pixelPreviewContainer: document.getElementById('pixelPreviewContainer'),
            pixelPlaceholder: document.getElementById('pixelPlaceholder'),
            pixelPreviewWrapper: document.getElementById('pixelPreviewWrapper'),
            pixelCanvas: document.getElementById('pixelCanvas'),
            pixelZoomSlider: document.getElementById('pixelZoomSlider'),
            pixelZoomValue: document.getElementById('pixelZoomValue'),

            // 视图切换
            viewPixelBtn: document.getElementById('viewPixelBtn'),
            viewCompareBtn: document.getElementById('viewCompareBtn'),
            compareView: document.getElementById('compareView'),
            compareOriginalCanvas: document.getElementById('compareOriginalCanvas'),
            comparePixelCanvas: document.getElementById('comparePixelCanvas'),

            // 加载状态
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText'),

            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
    },

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 网格检测设置
        this._elements.autoDetectGrid.addEventListener('change', () => {
            const auto = this._elements.autoDetectGrid.checked;
            this._elements.cellWidthInput.disabled = auto;
            this._elements.cellHeightInput.disabled = auto;

            if (auto && this._state.sourceImage) {
                this._detectGrid();
            }
        });

        this._elements.cellWidthInput.addEventListener('input', () => this._updateGridPreview());
        this._elements.cellHeightInput.addEventListener('input', () => this._updateGridPreview());

        // 输出尺寸设置
        this._elements.outputWidthInput.addEventListener('input', () => this._handleOutputSizeChange('width'));
        this._elements.outputHeightInput.addEventListener('input', () => this._handleOutputSizeChange('height'));

        // 颜色数量选择
        this._elements.colorCountBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._elements.colorCountBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._state.colorCount = parseInt(btn.dataset.count);
            });
        });

        // 调色板选择
        this._elements.paletteSelect.addEventListener('change', () => {
            const type = this._elements.paletteSelect.value;
            if (type === 'auto') {
                this._elements.colorCountLabel.style.display = 'flex';
            } else {
                this._elements.colorCountLabel.style.display = 'none';
            }
        });

        // 转换按钮
        this._elements.convertBtn.addEventListener('click', () => this._convert());

        // 缩放按钮
        this._elements.scaleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this._elements.scaleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._state.exportScale = parseInt(btn.dataset.scale);
            });
        });

        // 导出格式
        this._elements.exportFormat.forEach(radio => {
            radio.addEventListener('change', () => {
                this._state.exportFormat = radio.value;
            });
        });

        // 下载按钮
        this._elements.downloadBtn.addEventListener('click', () => this._download());

        // 预览缩放
        this._elements.previewZoomSlider.addEventListener('input', (e) => {
            const scale = e.target.value / 100;
            this._elements.previewZoomValue.textContent = `${e.target.value}%`;
            if (this._elements.previewCanvas) {
                this._elements.previewCanvas.style.transform = `scale(${scale})`;
            }
        });

        this._elements.pixelZoomSlider.addEventListener('input', (e) => {
            const scale = e.target.value / 100;
            this._elements.pixelZoomValue.textContent = `${e.target.value}%`;
            if (this._elements.pixelCanvas) {
                this._elements.pixelCanvas.style.transform = `scale(${scale})`;
            }
        });

        // 视图切换
        this._elements.viewPixelBtn.addEventListener('click', () => {
            this._elements.viewPixelBtn.classList.add('active');
            this._elements.viewCompareBtn.classList.remove('active');
            this._elements.pixelPreviewContainer.style.display = 'flex';
            this._elements.compareView.classList.remove('active');
        });

        this._elements.viewCompareBtn.addEventListener('click', () => {
            this._elements.viewCompareBtn.classList.add('active');
            this._elements.viewPixelBtn.classList.remove('active');
            this._elements.pixelPreviewContainer.style.display = 'none';
            this._elements.compareView.classList.add('active');
            this._updateCompareView();
        });
    },

    /**
     * 初始化图片加载器
     */
    _initImageLoader() {
        ImageLoader.init('uploadZone', 'fileInput');

        ImageLoader.on('loaded', (image, info) => {
            this._state.sourceImage = image;
            this._state.imageInfo = info;

            // 更新 UI
            this._elements.imageInfo.style.display = 'flex';
            this._elements.imageName.textContent = info.name;
            this._elements.imageSize.textContent = `${info.width} × ${info.height}`;

            // 启用转换按钮
            this._elements.convertBtn.disabled = false;

            // 显示原图预览
            this._showOriginalPreview(image);

            // 自动检测网格
            if (this._elements.autoDetectGrid.checked) {
                this._detectGrid();
            }

            // 自动设置输出尺寸建议
            this._suggestOutputSize(info.width, info.height);

            this._showToast('图片加载成功', 'success');
        });

        ImageLoader.on('error', (message) => {
            this._showToast(message, 'error');
        });
    },

    /**
     * 显示原图预览
     */
    _showOriginalPreview(image) {
        const canvas = this._elements.previewCanvas;
        const ctx = canvas.getContext('2d');

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        ctx.drawImage(image, 0, 0);

        this._elements.previewWrapper.style.display = 'block';

        // 自适应显示
        this._autoFitPreview('original');
    },

    /**
     * 自适应预览缩放
     * @param {string} type - 'original' 或 'pixel'
     */
    _autoFitPreview(type) {
        const container = type === 'original'
            ? this._elements.previewContainer
            : this._elements.pixelPreviewContainer;

        const canvas = type === 'original'
            ? this._elements.previewCanvas
            : this._elements.pixelCanvas;

        const zoomSlider = type === 'original'
            ? this._elements.previewZoomSlider
            : this._elements.pixelZoomSlider;

        const zoomValue = type === 'original'
            ? this._elements.previewZoomValue
            : this._elements.pixelZoomValue;

        if (!canvas || !container) return;

        // 使用统一的预览工具
        PreviewUtils.autoFitPreview({
            container,
            canvas,
            slider: zoomSlider,
            valueDisplay: zoomValue,
            type
        });
    },

    /**
     * 检测网格
     */
    _detectGrid() {
        if (!this._state.sourceImage) return;

        this._showLoading('检测网格线...');

        setTimeout(() => {
            const result = GridLineDetector.detect(this._state.sourceImage);
            this._state.gridInfo = result;

            if (result.detected) {
                this._elements.gridDetectionResult.style.display = 'flex';
                this._elements.detectedCellSize.textContent = `${result.cellWidth} × ${result.cellHeight}`;
                this._elements.detectionConfidence.textContent = `置信度: ${Math.round(result.confidence * 100)}%`;

                // 更新输入框
                this._elements.cellWidthInput.value = result.cellWidth;
                this._elements.cellHeightInput.value = result.cellHeight;

                // 更新网格预览
                this._updateGridPreview();
            } else {
                this._elements.gridDetectionResult.style.display = 'none';
            }

            this._hideLoading();
        }, 50);
    },

    /**
     * 更新网格预览
     */
    _updateGridPreview() {
        const cellW = parseInt(this._elements.cellWidthInput.value) || 16;
        const cellH = parseInt(this._elements.cellHeightInput.value) || 16;

        // 清除现有网格线
        this._elements.gridOverlay.innerHTML = '';

        if (!this._state.sourceImage) return;

        const imgW = this._state.sourceImage.naturalWidth || this._state.sourceImage.width;
        const imgH = this._state.sourceImage.naturalHeight || this._state.sourceImage.height;

        // 计算缩放比例
        const displayW = this._elements.previewCanvas.offsetWidth;
        const displayH = this._elements.previewCanvas.offsetHeight;
        const scaleX = displayW / imgW;
        const scaleY = displayH / imgH;

        // 绘制网格线
        const cols = Math.floor(imgW / cellW);
        const rows = Math.floor(imgH / cellH);

        // 垂直线
        for (let i = 1; i <= cols; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-v';
            line.style.left = `${i * cellW * scaleX}px`;
            this._elements.gridOverlay.appendChild(line);
        }

        // 水平线
        for (let i = 1; i <= rows; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-h';
            line.style.top = `${i * cellH * scaleY}px`;
            this._elements.gridOverlay.appendChild(line);
        }
    },

    /**
     * 建议输出尺寸
     */
    _suggestOutputSize(srcWidth, srcHeight) {
        // 根据源图尺寸建议输出尺寸
        const minDim = Math.min(srcWidth, srcHeight);
        let suggested;

        if (minDim <= 32) {
            suggested = minDim;
        } else if (minDim <= 64) {
            suggested = 32;
        } else if (minDim <= 128) {
            suggested = 48;
        } else if (minDim <= 256) {
            suggested = 64;
        } else {
            suggested = 64;
        }

        // 保持宽高比
        const aspectRatio = srcWidth / srcHeight;
        if (aspectRatio > 1) {
            this._elements.outputWidthInput.value = Math.round(suggested * aspectRatio);
            this._elements.outputHeightInput.value = suggested;
        } else {
            this._elements.outputWidthInput.value = suggested;
            this._elements.outputHeightInput.value = Math.round(suggested / aspectRatio);
        }

        this._updateOutputSizeInfo();
    },

    /**
     * 处理输出尺寸变化
     */
    _handleOutputSizeChange(dim) {
        if (this._elements.keepAspectRatio.checked && this._state.sourceImage) {
            const srcW = this._state.sourceImage.naturalWidth || this._state.sourceImage.width;
            const srcH = this._state.sourceImage.naturalHeight || this._state.sourceImage.height;
            const aspectRatio = srcW / srcH;

            if (dim === 'width') {
                const w = parseInt(this._elements.outputWidthInput.value) || 32;
                this._elements.outputHeightInput.value = Math.round(w / aspectRatio);
            } else {
                const h = parseInt(this._elements.outputHeightInput.value) || 32;
                this._elements.outputWidthInput.value = Math.round(h * aspectRatio);
            }
        }

        this._updateOutputSizeInfo();
    },

    /**
     * 更新输出尺寸信息
     */
    _updateOutputSizeInfo() {
        const w = parseInt(this._elements.outputWidthInput.value) || 32;
        const h = parseInt(this._elements.outputHeightInput.value) || 32;
        this._elements.outputSizeInfo.innerHTML = `<span>输出尺寸: ${w} × ${h} 像素</span>`;
    },

    /**
     * 执行像素化转换
     */
    _convert() {
        if (!this._state.sourceImage) {
            this._showToast('请先上传图片', 'warning');
            return;
        }

        this._showLoading('转换中...');

        setTimeout(() => {
            try {
                // 准备源图
                let sourceImage = this._state.sourceImage;

                // 如果启用了网格线移除
                if (this._elements.removeGridLines.checked && this._state.gridInfo && this._state.gridInfo.detected) {
                    const cleanedCanvas = GridLineDetector.removeGridLines(this._state.sourceImage, this._state.gridInfo);
                    if (cleanedCanvas) {
                        sourceImage = cleanedCanvas;
                    }
                }

                // 配置转换器
                PixelConverter.setSourceImage(sourceImage);
                PixelConverter.setOutputSize(
                    parseInt(this._elements.outputWidthInput.value) || 32,
                    parseInt(this._elements.outputHeightInput.value) || 32
                );
                PixelConverter.setPalette(this._elements.paletteSelect.value);
                PixelConverter.setColorCount(this._state.colorCount);
                PixelConverter.setDithering(this._elements.ditheringSelect.value);
                PixelConverter.setSamplingMethod(this._elements.samplingSelect.value);
                PixelConverter.setKeepAspectRatio(this._elements.keepAspectRatio.checked);

                // 执行转换
                this._state.pixelCanvas = PixelConverter.convert();

                // 显示结果
                this._showPixelResult();

                // 启用下载按钮
                this._elements.downloadBtn.disabled = false;

                this._hideLoading();
                this._showToast('转换成功', 'success');

            } catch (error) {
                console.error('转换失败:', error);
                this._hideLoading();
                this._showToast('转换失败: ' + error.message, 'error');
            }
        }, 50);
    },

    /**
     * 显示像素化结果
     */
    _showPixelResult() {
        if (!this._state.pixelCanvas) return;

        // 更新预览画布
        const displayCanvas = this._elements.pixelCanvas;
        const ctx = displayCanvas.getContext('2d');

        displayCanvas.width = this._state.pixelCanvas.width;
        displayCanvas.height = this._state.pixelCanvas.height;
        ctx.drawImage(this._state.pixelCanvas, 0, 0);

        // 隐藏占位符，显示结果
        this._elements.pixelPlaceholder.style.display = 'none';
        this._elements.pixelPreviewWrapper.style.display = 'block';

        // 自适应显示
        this._autoFitPreview('pixel');

        // 滚动到结果区域
        this._elements.pixelSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * 更新对比视图
     */
    _updateCompareView() {
        if (!this._state.sourceImage || !this._state.pixelCanvas) return;

        // 原图
        const origCanvas = this._elements.compareOriginalCanvas;
        const origCtx = origCanvas.getContext('2d');
        origCanvas.width = this._state.pixelCanvas.width;
        origCanvas.height = this._state.pixelCanvas.height;
        origCtx.imageSmoothingEnabled = false;
        origCtx.drawImage(
            this._state.sourceImage,
            0, 0,
            this._state.sourceImage.naturalWidth || this._state.sourceImage.width,
            this._state.sourceImage.naturalHeight || this._state.sourceImage.height,
            0, 0,
            origCanvas.width, origCanvas.height
        );

        // 像素图
        const pixelCanvas = this._elements.comparePixelCanvas;
        const pixelCtx = pixelCanvas.getContext('2d');
        pixelCanvas.width = this._state.pixelCanvas.width;
        pixelCanvas.height = this._state.pixelCanvas.height;
        pixelCtx.drawImage(this._state.pixelCanvas, 0, 0);
    },

    /**
     * 下载像素图
     */
    async _download() {
        if (!this._state.pixelCanvas) {
            this._showToast('没有可下载的内容', 'warning');
            return;
        }

        try {
            const filename = 'pixel-art';
            await PixelConverter.download(
                this._state.pixelCanvas,
                filename,
                this._state.exportFormat,
                this._state.exportScale
            );
            this._showToast('下载成功', 'success');
        } catch (error) {
            console.error('下载失败:', error);
            this._showToast('下载失败', 'error');
        }
    },

    /**
     * 显示加载状态
     */
    _showLoading(text = '处理中...') {
        this._elements.loadingText.textContent = text;
        this._elements.loadingOverlay.style.display = 'flex';
    },

    /**
     * 隐藏加载状态
     */
    _hideLoading() {
        this._elements.loadingOverlay.style.display = 'none';
    },

    /**
     * 显示 Toast 提示
     */
    _showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <span class="toast__icon">${icons[type] || icons.info}</span>
            <span class="toast__message">${message}</span>
        `;

        this._elements.toastContainer.appendChild(toast);

        // 3秒后移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    ImageToPixelApp.init();
});
