/**
 * Magic Pixel - UI 控制模块
 */

const UIController = {
    // DOM 元素引用
    _elements: {},

    // 状态
    _state: 'idle', // idle, imageLoaded, processing, readyExport

    // 缩放级别
    _zoomLevels: {
        preview: 100,
        pieces: 100
    },

    /**
     * 初始化
     */
    init() {
        this._cacheElements();
        this._bindEvents();
        this._bindZoomControls();
    },

    /**
     * 绑定缩放控制
     */
    _bindZoomControls() {
        const previewSlider = DOM.$('#previewZoomSlider');
        const previewValue = DOM.$('#previewZoomValue');
        const piecesSlider = DOM.$('#piecesZoomSlider');
        const piecesValue = DOM.$('#piecesZoomValue');

        if (previewSlider) {
            DOM.on(previewSlider, 'input', () => {
                const zoom = parseInt(previewSlider.value);
                this._zoomLevels.preview = zoom;
                previewValue.textContent = `${zoom}%`;
                this._elements.previewCanvas.style.transform = `scale(${zoom / 100})`;
            });
        }

        if (piecesSlider) {
            DOM.on(piecesSlider, 'input', () => {
                const zoom = parseInt(piecesSlider.value);
                this._zoomLevels.pieces = zoom;
                piecesValue.textContent = `${zoom}%`;
                this._updatePieceGridZoom(zoom);
            });
        }
    },

    /**
     * 更新切割块网格缩放
     */
    _updatePieceGridZoom(zoom) {
        const items = this._elements.pieceGrid.querySelectorAll('.piece-grid__item');
        items.forEach(item => {
            item.style.minWidth = `${120 * zoom / 100}px`;
            item.style.minHeight = `${120 * zoom / 100}px`;
        });
    },

    /**
     * 缓存 DOM 元素
     */
    _cacheElements() {
        this._elements = {
            // 上传区域
            uploadZone: DOM.$('#uploadZone'),
            fileInput: DOM.$('#fileInput'),
            imageInfo: DOM.$('#imageInfo'),
            imageName: DOM.$('#imageName'),
            imageSize: DOM.$('#imageSize'),

            // 切割设置
            colsInput: DOM.$('#colsInput'),
            rowsInput: DOM.$('#rowsInput'),
            colsSlider: DOM.$('#colsSlider'),
            rowsSlider: DOM.$('#rowsSlider'),
            sliderMaxInput: DOM.$('#sliderMaxInput'),
            pieceSizeInfo: DOM.$('#pieceSizeInfo'),
            previewBtn: DOM.$('#previewBtn'),
            cutBtn: DOM.$('#cutBtn'),

            // 导出选项
            formatRadios: DOM.$$('input[name="format"]'),
            prefixInput: DOM.$('#prefixInput'),
            downloadSingleBtn: DOM.$('#downloadSingleBtn'),
            downloadZipBtn: DOM.$('#downloadZipBtn'),

            // 预览区域
            previewContainer: DOM.$('#previewContainer'),
            previewCanvas: DOM.$('#previewCanvas'),
            gridOverlay: DOM.$('#gridOverlay'),
            piecesSection: DOM.$('#piecesSection'),
            piecesCount: DOM.$('#piecesCount'),
            pieceGrid: DOM.$('#pieceGrid'),

            // 加载和进度
            loadingOverlay: DOM.$('#loadingOverlay'),
            loadingText: DOM.$('#loadingText'),
            progressBar: DOM.$('#progressBar'),
            progressFill: DOM.$('#progressFill'),
            progressText: DOM.$('#progressText'),

            // Toast
            toastContainer: DOM.$('#toastContainer')
        };
    },

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 切割设置输入 - 实时更新预览
        DOM.on(this._elements.colsInput, 'input', () => this._onGridInputChange());
        DOM.on(this._elements.rowsInput, 'input', () => this._onGridInputChange());

        // 滑块变化
        DOM.on(this._elements.colsSlider, 'input', (e) => this._onSliderChange('cols', e.target.value));
        DOM.on(this._elements.rowsSlider, 'input', (e) => this._onSliderChange('rows', e.target.value));

        // 滑块上限变化
        DOM.on(this._elements.sliderMaxInput, 'input', (e) => this._onSliderMaxChange(e.target.value));

        // 预览按钮
        DOM.on(this._elements.previewBtn, 'click', () => this._onPreviewClick());

        // 切割按钮
        DOM.on(this._elements.cutBtn, 'click', () => this._onCutClick());

        // 格式选择
        this._elements.formatRadios.forEach(radio => {
            DOM.on(radio, 'change', (e) => {
                ImageExporter.setFormat(e.target.value);
            });
        });

        // 前缀输入
        DOM.on(this._elements.prefixInput, 'input', (e) => {
            ImageExporter.setNamingRule(e.target.value, CONFIG.DEFAULT_PADDING);
        });

        // 下载按钮
        DOM.on(this._elements.downloadSingleBtn, 'click', () => this._onDownloadSingleClick());
        DOM.on(this._elements.downloadZipBtn, 'click', () => this._onDownloadZipClick());
    },

    /**
     * 更新状态
     */
    setState(state) {
        this._state = state;
        this._updateButtonStates();
    },

    /**
     * 更新按钮状态
     */
    _updateButtonStates() {
        const hasImage = this._state !== 'idle';
        const hasPieces = this._state === 'readyExport';

        this._elements.previewBtn.disabled = !hasImage;
        this._elements.cutBtn.disabled = !hasImage;
        this._elements.downloadSingleBtn.disabled = !hasPieces;
        this._elements.downloadZipBtn.disabled = !hasPieces;
    },

    /**
     * 显示图片信息
     */
    showImageInfo(info) {
        this._elements.imageName.textContent = info.name;
        this._elements.imageSize.textContent = `${info.width} × ${info.height} | ${FileUtils.formatFileSize(info.size)}`;
        DOM.show(this._elements.imageInfo);
    },

    /**
     * 更新切割块尺寸信息
     */
    _updatePieceSizeInfo() {
        const pieceSize = ImageProcessor.getPieceSizeInfo();
        if (pieceSize) {
            this._elements.pieceSizeInfo.innerHTML = `<span>切割块尺寸: ${pieceSize.formatted}</span>`;
        }
    },

    /**
     * 切割网格输入变化 - 实时更新预览
     */
    _onGridInputChange() {
        const cols = parseInt(this._elements.colsInput.value) || 1;
        const rows = parseInt(this._elements.rowsInput.value) || 1;

        // 同步更新滑块位置
        this._syncSliderWithValue('cols', cols);
        this._syncSliderWithValue('rows', rows);

        // 更新切割块尺寸信息
        ImageProcessor.setGrid(cols, rows);
        this._updatePieceSizeInfo();

        // 如果图片已加载，实时显示网格线
        if (this._state !== 'idle') {
            this.showGridOverlay();
        }
    },

    /**
     * 滑块变化
     */
    _onSliderChange(type, value) {
        const numValue = parseInt(value) || 1;

        // 更新对应的输入框
        if (type === 'cols') {
            this._elements.colsInput.value = numValue;
        } else {
            this._elements.rowsInput.value = numValue;
        }

        // 触发网格更新
        this._onGridInputChange();
    },

    /**
     * 同步滑块位置与输入框值
     */
    _syncSliderWithValue(type, value) {
        const slider = type === 'cols' ? this._elements.colsSlider : this._elements.rowsSlider;
        const max = parseInt(slider.max) || 10;

        // 如果值超过滑块上限，滑块保持在最大值
        slider.value = Math.min(value, max);
    },

    /**
     * 滑块上限变化
     */
    _onSliderMaxChange(value) {
        const maxValue = Math.max(1, Math.min(50, parseInt(value) || 10));

        // 更新滑块上限
        this._elements.colsSlider.max = maxValue;
        this._elements.rowsSlider.max = maxValue;

        // 检查当前值是否超过新上限，如果超过则调整滑块位置
        const colsValue = parseInt(this._elements.colsInput.value) || 1;
        const rowsValue = parseInt(this._elements.rowsInput.value) || 1;

        this._syncSliderWithValue('cols', colsValue);
        this._syncSliderWithValue('rows', rowsValue);
    },

    /**
     * 显示原图预览
     */
    showPreview(image) {
        const canvas = this._elements.previewCanvas;
        const container = this._elements.previewContainer;

        // 计算合适的显示尺寸，限制最大尺寸
        const maxWidth = Math.min(container.clientWidth - 20, 800);
        const maxHeight = 400;

        let displayWidth = image.width;
        let displayHeight = image.height;

        // 限制最大显示尺寸
        if (displayWidth > maxWidth) {
            const ratio = maxWidth / displayWidth;
            displayHeight = displayHeight * ratio;
            displayWidth = maxWidth;
        }

        if (displayHeight > maxHeight) {
            const ratio = maxHeight / displayHeight;
            displayWidth = displayWidth * ratio;
            displayHeight = maxHeight;
        }

        canvas.width = displayWidth;
        canvas.height = displayHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

        // 应用当前缩放
        const zoom = this._zoomLevels.preview;
        canvas.style.transform = `scale(${zoom / 100})`;

        // 隐藏占位符，显示 Canvas
        DOM.hide(DOM.$('.preview-placeholder', container));
        DOM.show(canvas);

        // 更新切割块尺寸信息并显示网格线
        const cols = parseInt(this._elements.colsInput.value) || 1;
        const rows = parseInt(this._elements.rowsInput.value) || 1;
        ImageProcessor.setGrid(cols, rows);
        this._updatePieceSizeInfo();
        this.showGridOverlay();
    },

    /**
     * 显示切割网格
     */
    showGridOverlay() {
        const canvas = this._elements.previewCanvas;
        const container = this._elements.previewContainer;
        const overlay = this._elements.gridOverlay;

        // 清除现有网格线
        DOM.empty(overlay);

        // 获取容器尺寸（用于计算 Canvas 居中位置）
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 获取预览数据，传入容器尺寸和 Canvas 尺寸
        const previewData = ImageProcessor.getPreviewData(containerWidth, containerHeight, canvas.width, canvas.height);
        if (!previewData) return;

        // 创建网格线容器样式
        DOM.setStyles(overlay, {
            left: previewData.offsetX + 'px',
            top: previewData.offsetY + 'px',
            width: previewData.displayWidth + 'px',
            height: previewData.displayHeight + 'px'
        });

        // 添加水平线
        previewData.horizontalLines.forEach(y => {
            const line = DOM.createElement('div', 'grid-line-h');
            const relativeY = y - previewData.offsetY;
            DOM.setStyles(line, {
                top: relativeY + 'px'
            });
            overlay.appendChild(line);
        });

        // 添加垂直线
        previewData.verticalLines.forEach(x => {
            const line = DOM.createElement('div', 'grid-line-v');
            const relativeX = x - previewData.offsetX;
            DOM.setStyles(line, {
                left: relativeX + 'px'
            });
            overlay.appendChild(line);
        });
    },

    /**
     * 隐藏网格
     */
    hideGridOverlay() {
        DOM.empty(this._elements.gridOverlay);
    },

    /**
     * 显示切割结果
     */
    showPieces(pieces) {
        const grid = this._elements.pieceGrid;

        // 清除现有内容
        DOM.empty(grid);

        // 更新数量显示
        this._elements.piecesCount.textContent = `共 ${pieces.length} 块`;

        const zoom = this._zoomLevels.pieces;

        // 创建每个切割块的预览
        pieces.forEach((piece, index) => {
            const item = DOM.createElement('div', 'piece-grid__item', {
                data: { index: index }
            });
            item.style.minWidth = `${120 * zoom / 100}px`;
            item.style.minHeight = `${120 * zoom / 100}px`;

            // Canvas
            item.appendChild(piece.canvas);

            // 标签
            const label = DOM.createElement('span', 'piece-grid__label', {
                textContent: String(index + 1).padStart(3, '0')
            });
            item.appendChild(label);

            // 下载按钮
            const downloadBtn = DOM.createElement('button', 'piece-grid__download', {
                textContent: '↓',
                title: '下载此图'
            });
            DOM.on(downloadBtn, 'click', (e) => {
                e.stopPropagation();
                this._downloadPiece(index);
            });
            item.appendChild(downloadBtn);

            // 点击下载
            DOM.on(item, 'click', () => this._downloadPiece(index));

            grid.appendChild(item);
        });

        // 显示切割结果区域
        DOM.show(this._elements.piecesSection);
    },

    /**
     * 下载单个切割块
     */
    async _downloadPiece(index) {
        try {
            await ImageExporter.downloadSingle(index);
            this.showToast(`已下载 ${index + 1}. ${ImageExporter.generateFileName(index)}`, 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 预览按钮点击
     */
    _onPreviewClick() {
        const cols = parseInt(this._elements.colsInput.value) || 1;
        const rows = parseInt(this._elements.rowsInput.value) || 1;

        ImageProcessor.setGrid(cols, rows);
        this.showGridOverlay();
    },

    /**
     * 切割按钮点击
     */
    async _onCutClick() {
        const cols = parseInt(this._elements.colsInput.value) || 1;
        const rows = parseInt(this._elements.rowsInput.value) || 1;

        ImageProcessor.setGrid(cols, rows);

        this.showLoading('正在切割...');

        // 使用 setTimeout 让 UI 有时间更新
        setTimeout(() => {
            try {
                const pieces = ImageProcessor.renderAllPieces();

                // 设置导出模块
                ImageExporter.setPieces(pieces);
                ImageExporter.setFormat(this._getSelectedFormat());
                ImageExporter.setNamingRule(this._elements.prefixInput.value, CONFIG.DEFAULT_PADDING);

                // 显示切割结果
                this.showPieces(pieces);

                // 更新状态
                this.setState('readyExport');

                this.hideLoading();
                this.showToast(`切割完成，共 ${pieces.length} 块`, 'success');

            } catch (error) {
                this.hideLoading();
                this.showToast('切割失败: ' + error.message, 'error');
            }
        }, 50);
    },

    /**
     * 获取选中的格式
     */
    _getSelectedFormat() {
        const selected = this._elements.formatRadios.find(r => r.checked);
        return selected ? selected.value : 'png';
    },

    /**
     * 下载单个按钮点击
     */
    async _onDownloadSingleClick() {
        if (ImageProcessor.getPieces().length > 0) {
            await this._downloadPiece(0);
        }
    },

    /**
     * ZIP 下载按钮点击
     */
    async _onDownloadZipClick() {
        this.showProgress('正在打包...');

        try {
            await ImageExporter.downloadAllAsZip((percent) => {
                this.updateProgress(percent);
            });

            this.hideProgress();
            this.showToast('ZIP 打包下载完成', 'success');

        } catch (error) {
            this.hideProgress();
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 显示加载状态
     */
    showLoading(text = '处理中...') {
        this._elements.loadingText.textContent = text;
        DOM.show(this._elements.loadingOverlay);
    },

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        DOM.hide(this._elements.loadingOverlay);
    },

    /**
     * 显示进度条
     */
    showProgress(text = '处理中...') {
        this._elements.progressText.textContent = text;
        this._elements.progressFill.style.width = '0%';
        DOM.show(this._elements.progressBar);
    },

    /**
     * 更新进度
     */
    updateProgress(percent) {
        this._elements.progressFill.style.width = percent + '%';
        this._elements.progressText.textContent = percent + '%';
    },

    /**
     * 隐藏进度条
     */
    hideProgress() {
        DOM.hide(this._elements.progressBar);
    },

    /**
     * 显示 Toast 提示
     */
    showToast(message, type = 'info') {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = DOM.createElement('div', `toast toast--${type}`, {
            innerHTML: `
                <span class="toast__icon">${icons[type] || icons.info}</span>
                <span class="toast__message">${message}</span>
            `
        });

        this._elements.toastContainer.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    },

    /**
     * 重置 UI
     */
    reset() {
        this.setState('idle');
        this.hideGridOverlay();
        DOM.hide(this._elements.imageInfo);
        DOM.hide(this._elements.piecesSection);
        DOM.show(DOM.$('.preview-placeholder', this._elements.previewContainer));
        DOM.hide(this._elements.previewCanvas);
        this._elements.colsInput.value = '3';
        this._elements.rowsInput.value = '3';
        this._elements.pieceSizeInfo.innerHTML = '<span>切割块尺寸: --</span>';

        // 重置缩放
        this._zoomLevels.preview = 100;
        this._zoomLevels.pieces = 100;
        this._elements.previewCanvas.style.transform = 'scale(1)';

        const previewSlider = DOM.$('#previewZoomSlider');
        const previewValue = DOM.$('#previewZoomValue');
        const piecesSlider = DOM.$('#piecesZoomSlider');
        const piecesValue = DOM.$('#piecesZoomValue');

        if (previewSlider) previewSlider.value = 100;
        if (previewValue) previewValue.textContent = '100%';
        if (piecesSlider) piecesSlider.value = 100;
        if (piecesValue) piecesValue.textContent = '100%';
    }
};
