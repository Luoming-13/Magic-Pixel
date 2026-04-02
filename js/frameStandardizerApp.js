/**
 * Magic Pixel - Magic Cutting 功能入口
 *
 * 从单张精灵表图片中检测提取独立块，生成均匀网格精灵序列图
 * 核心流程：导入源图 → 自动/手动框选检测 → 计算统一网格 → 对齐生成精灵表
 */

const FrameStandardizerApp = {
    // 应用状态: idle -> loaded -> blocks_created -> aligned -> generated
    _state: 'idle',

    // 当前工作模式: 'auto' | 'manual'
    _mode: 'auto',

    // 当前源图
    _currentSource: null,

    // 提取的块列表
    _blocks: [],

    // DOM 元素引用
    _elements: {},

    /**
     * 初始化应用
     */
    init() {
        console.log('Magic Cutting - 初始化中...');

        this._cacheElements();
        this._bindEvents();
        this._initModules();

        console.log('Magic Cutting - 初始化完成');
    },

    /**
     * 缓存 DOM 元素
     */
    _cacheElements() {
        this._elements = {
            // 模式导航
            modeNav: DOM.$('.mode-nav'),
            modeBtns: DOM.$$('.mode-nav__btn'),

            // 上传
            uploadZone: DOM.$('#uploadZone'),
            fileInput: DOM.$('#fileInput'),
            sourceInfo: DOM.$('#sourceInfo'),
            sourceName: DOM.$('#sourceName'),
            clearSourceBtn: DOM.$('#clearSourceBtn'),

            // 检测设置
            autoSettings: DOM.$('#autoSettings'),
            detectByTransparency: DOM.$('#detectByTransparency'),
            detectByBackground: DOM.$('#detectByBackground'),
            detectPadding: DOM.$('#detectPadding'),

            // 手动工具
            manualTools: DOM.$('#manualTools'),
            undoBlockBtn: DOM.$('#undoBlockBtn'),
            clearAllBlocksBtn: DOM.$('#clearAllBlocksBtn'),

            // 块列表
            blockListSection: DOM.$('#blockListSection'),
            blockCount: DOM.$('#blockCount'),
            blockList: DOM.$('#blockList'),

            // 对齐设置
            alignSettings: DOM.$('#alignSettings'),
            pivotBtns: DOM.$$('.pivot-btn'),
            standardSize: DOM.$('#standardSize'),

            // 精灵表设置
            sheetSettings: DOM.$('#sheetSettings'),
            sheetColsInput: DOM.$('#sheetColsInput'),
            sheetColsSlider: DOM.$('#sheetColsSlider'),
            sheetSpacing: DOM.$('#sheetSpacing'),
            sheetSizeInfo: DOM.$('#sheetSizeInfo'),

            // 导出
            exportSection: DOM.$('#exportSection'),
            formatRadios: DOM.$$('input[name="format"]'),
            fileNamePrefix: DOM.$('#fileNamePrefix'),
            previewSheetBtn: DOM.$('#previewSheetBtn'),
            exportSheetBtn: DOM.$('#exportSheetBtn'),

            // 预览区域
            slicePreviewSection: DOM.$('#slicePreviewSection'),
            sliceInfo: DOM.$('#sliceInfo'),
            sliceZoomSlider: DOM.$('#sliceZoomSlider'),
            sliceZoomValue: DOM.$('#sliceZoomValue'),
            slicePreviewContainer: DOM.$('#slicePreviewContainer'),
            slicePreviewWrapper: DOM.$('#slicePreviewWrapper'),
            sliceCanvas: DOM.$('#sliceCanvas'),
            alignPreviewSection: DOM.$('#alignPreviewSection'),
            pivotTag: DOM.$('#pivotTag'),
            sizeTag: DOM.$('#sizeTag'),
            alignGrid: DOM.$('#alignGrid'),
            sheetPreviewSection: DOM.$('#sheetPreviewSection'),
            sheetZoomSlider: DOM.$('#sheetZoomSlider'),
            sheetZoomValue: DOM.$('#sheetZoomValue'),
            sheetPreviewContainer: DOM.$('#sheetPreviewContainer'),
            sheetPreviewCanvas: DOM.$('#sheetPreviewCanvas'),

            // 加载和进度
            loadingOverlay: DOM.$('#loadingOverlay'),
            loadingText: DOM.$('#loadingText'),
            progressBar: DOM.$('#progressBar'),
            progressFill: DOM.$('#progressFill'),
            progressText: DOM.$('#progressText'),

            // Toast
            toastContainer: DOM.$('#toastContainer'),

            // 可折叠区块
            collapsibleSections: DOM.$$('.card-section--collapsible')
        };
    },

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 模式切换
        this._elements.modeBtns.forEach(btn => {
            DOM.on(btn, 'click', () => this._switchMode(btn.dataset.mode));
        });

        // 上传区域
        DOM.on(this._elements.uploadZone, 'click', () => this._elements.fileInput.click());
        DOM.on(this._elements.fileInput, 'change', (e) => this._handleFileSelect(e.target.files));

        // 拖拽上传
        DOM.on(this._elements.uploadZone, 'dragover', (e) => {
            e.preventDefault();
            this._elements.uploadZone.classList.add('upload-zone--dragover');
        });
        DOM.on(this._elements.uploadZone, 'dragleave', () => {
            this._elements.uploadZone.classList.remove('upload-zone--dragover');
        });
        DOM.on(this._elements.uploadZone, 'drop', (e) => {
            e.preventDefault();
            this._elements.uploadZone.classList.remove('upload-zone--dragover');
            this._handleFileSelect(e.dataTransfer.files);
        });

        // 清空源图
        DOM.on(this._elements.clearSourceBtn, 'click', () => this._clearSource());

        // 手动工具
        DOM.on(this._elements.undoBlockBtn, 'click', () => this._undoLastBlock());
        DOM.on(this._elements.clearAllBlocksBtn, 'click', () => this._clearAllBlocks());

        // 锚点选择
        this._elements.pivotBtns.forEach(btn => {
            DOM.on(btn, 'click', () => this._selectPivot(btn.dataset.pivot));
        });

        // 精灵表设置
        DOM.on(this._elements.sheetColsInput, 'input', () => this._onSheetColsChange());
        DOM.on(this._elements.sheetColsSlider, 'input', (e) => {
            this._elements.sheetColsInput.value = e.target.value;
            this._onSheetColsChange();
        });
        DOM.on(this._elements.sheetSpacing, 'input', () => this._onSheetSpacingChange());

        // 导出
        DOM.on(this._elements.previewSheetBtn, 'click', () => this._previewSpriteSheet());
        DOM.on(this._elements.exportSheetBtn, 'click', () => this._exportSpriteSheet());

        // 缩放控制
        DOM.on(this._elements.sliceZoomSlider, 'input', (e) => {
            this._elements.sliceZoomValue.textContent = `${e.target.value}%`;
            ManualSelector.setZoom(e.target.value / 100);
        });
        DOM.on(this._elements.sheetZoomSlider, 'input', (e) => {
            this._elements.sheetZoomValue.textContent = `${e.target.value}%`;
            this._updateSheetPreviewZoom(e.target.value / 100);
        });

        // 初始化可折叠区块
        this._initCollapsibleSections();
    },

    /**
     * 初始化模块
     */
    _initModules() {
        SourceLoader.init(this._elements.uploadZone, this._elements.fileInput);
        ManualSelector.init(this._elements.sliceCanvas);
        BlockManager.init();

        // 监听模块事件
        SourceLoader.on('loaded', (source) => this._onSourceLoaded(source));
        SourceLoader.on('error', (msg) => this.showToast(msg, 'error'));

        ManualSelector.on('selectionChange', (region) => this._onSelectionChange(region));
        ManualSelector.on('regionSelected', (data) => this._onRegionSelected(data));
    },

    /**
     * 初始化可折叠区块
     */
    _initCollapsibleSections() {
        this._elements.collapsibleSections.forEach(section => {
            const title = section.querySelector('.card-section__title--collapsible');
            if (!title) return;

            const sectionId = section.id;
            const isCollapsed = localStorage.getItem(`collapse_${sectionId}`) === 'true';
            if (isCollapsed) {
                section.classList.add('card-section--collapsed');
            }

            DOM.on(title, 'click', (e) => {
                if (e.target.closest('input, button, label')) return;
                this._toggleSection(section);
            });
        });
    },

    /**
     * 切换区块折叠状态
     */
    _toggleSection(section) {
        const isCollapsed = section.classList.toggle('card-section--collapsed');
        const sectionId = section.id;

        if (sectionId) {
            localStorage.setItem(`collapse_${sectionId}`, String(isCollapsed));
        }
    },

    /**
     * 切换工作模式
     */
    _switchMode(mode) {
        this._mode = mode;

        // 更新按钮状态
        this._elements.modeBtns.forEach(btn => {
            btn.classList.toggle('mode-nav__btn--active', btn.dataset.mode === mode);
        });

        // 切换面板显示
        if (mode === 'auto') {
            DOM.show(this._elements.autoSettings);
            DOM.hide(this._elements.manualTools);
            DOM.hide(this._elements.slicePreviewSection);

            // 如果已加载源图，自动运行检测
            if (this._currentSource) {
                this._runAutoDetect();
            }
        } else {
            DOM.hide(this._elements.autoSettings);
            DOM.show(this._elements.manualTools);

            // 切换到手动模式时显示框选预览
            if (this._currentSource) {
                this._showSlicePreview();
            }
        }
    },

    /**
     * 处理文件选择
     */
    async _handleFileSelect(files) {
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        this.showLoading('正在加载图片...');

        try {
            await SourceLoader.handleFiles([file]);
        } catch (error) {
            this.hideLoading();
            this.showToast('图片加载失败: ' + error.message, 'error');
        }
    },

    /**
     * 源图加载完成回调
     */
    _onSourceLoaded(source) {
        this.hideLoading();
        this._currentSource = source;
        this._state = 'loaded';
        this._blocks = [];

        // 更新源图信息显示
        this._elements.sourceName.textContent = source.name;
        DOM.show(this._elements.sourceInfo);

        // 根据模式处理
        if (this._mode === 'auto') {
            this._runAutoDetect();
        } else {
            ManualSelector.setSource(source);
            this._showSlicePreview();
        }

        this.showToast('源图加载完成', 'success');
    },

    /**
     * 显示框选预览
     */
    _showSlicePreview() {
        if (!this._currentSource) return;

        DOM.show(this._elements.slicePreviewSection);
        DOM.hide(this._elements.slicePreviewContainer.querySelector('.preview-placeholder'));
        DOM.show(this._elements.slicePreviewWrapper);

        // 设置 Canvas
        ManualSelector.setSource(this._currentSource);
        ManualSelector.setBlocks(this._blocks);
    },

    /**
     * 运行自动检测
     */
    async _runAutoDetect() {
        if (!this._currentSource) return;

        this.showLoading('正在检测独立块...');

        const config = this._getDetectConfig();

        try {
            const blocks = await AutoSlicer.analyzeSource(this._currentSource, config);

            this._blocks = blocks;
            this._state = blocks.length > 0 ? 'blocks_created' : 'loaded';

            this.hideLoading();

            if (blocks.length > 0) {
                // 渲染块列表
                this._renderBlockList();

                // 计算对齐
                this._calculateAlignment();

                this.showToast(`检测完成，提取 ${blocks.length} 个块`, 'success');
            } else {
                this.showToast('未检测到有效块，请尝试调整检测设置或使用手动模式', 'warning');
            }

        } catch (error) {
            this.hideLoading();
            this.showToast('检测失败: ' + error.message, 'error');
        }
    },

    /**
     * 框选变化回调
     */
    _onSelectionChange(region) {
        if (region) {
            this._elements.sliceInfo.textContent = `区域: ${Math.round(region.width)} × ${Math.round(region.height)}`;
        } else {
            this._elements.sliceInfo.textContent = '拖拽绘制框选区域';
        }
    },

    /**
     * 框选区域完成 - 在框选区域内检测块
     */
    async _onRegionSelected(data) {
        if (!data || !data.source || !data.bounds) return;

        this.showLoading('正在检测框选区域内的块...');

        const config = this._getDetectConfig();

        try {
            const newBlocks = await AutoSlicer.analyzeRegion(data.source, data.bounds, config);

            if (newBlocks.length > 0) {
                // 累积添加块
                this._blocks.push(...newBlocks);

                // 更新索引
                this._blocks.forEach((block, index) => {
                    block.index = index;
                });

                this._state = 'blocks_created';

                // 更新框选预览
                ManualSelector.setBlocks(this._blocks);

                // 更新块列表
                this._renderBlockList();

                // 计算对齐
                this._calculateAlignment();

                this.hideLoading();
                this.showToast(`在框选区域内检测到 ${newBlocks.length} 个块`, 'success');
            } else {
                this.hideLoading();
                this.showToast('框选区域内未检测到有效块', 'warning');
            }

        } catch (error) {
            this.hideLoading();
            this.showToast('检测失败: ' + error.message, 'error');
        }
    },

    /**
     * 获取检测配置
     */
    _getDetectConfig() {
        return {
            useTransparency: this._elements.detectByTransparency.checked,
            useBackground: this._elements.detectByBackground.checked,
            padding: parseInt(this._elements.detectPadding.value) || 0
        };
    },

    /**
     * 撤销最后一个块
     */
    _undoLastBlock() {
        if (this._blocks.length === 0) return;

        this._blocks.pop();

        // 更新索引
        this._blocks.forEach((block, index) => {
            block.index = index;
        });

        // 更新UI
        ManualSelector.setBlocks(this._blocks);
        this._renderBlockList();

        if (this._blocks.length > 0) {
            this._calculateAlignment();
        } else {
            this._state = 'loaded';
            DOM.hide(this._elements.blockListSection);
            DOM.hide(this._elements.alignSettings);
            DOM.hide(this._elements.sheetSettings);
            DOM.hide(this._elements.exportSection);
        }

        this.showToast('已撤销', 'info');
    },

    /**
     * 清除所有块
     */
    _clearAllBlocks() {
        if (this._blocks.length === 0) return;

        this._blocks = [];
        this._state = 'loaded';

        // 更新UI
        ManualSelector.setBlocks([]);
        DOM.hide(this._elements.blockListSection);
        DOM.hide(this._elements.alignSettings);
        DOM.hide(this._elements.sheetSettings);
        DOM.hide(this._elements.exportSection);

        this.showToast('已清除所有块', 'info');
    },

    /**
     * 清除源图
     */
    _clearSource() {
        SourceLoader.clear();
        ManualSelector.clear();
        BlockManager.clear();
        FrameAligner.clear();
        SpriteSheetGenerator.clear();

        this._currentSource = null;
        this._blocks = [];
        this._state = 'idle';

        // 隐藏控制区域
        DOM.hide(this._elements.sourceInfo);
        DOM.hide(this._elements.slicePreviewSection);
        DOM.hide(this._elements.blockListSection);
        DOM.hide(this._elements.alignSettings);
        DOM.hide(this._elements.sheetSettings);
        DOM.hide(this._elements.exportSection);

        // 清空文件输入
        this._elements.fileInput.value = '';

        this.showToast('已清空', 'info');
    },

    /**
     * 渲染块列表
     */
    _renderBlockList() {
        const container = this._elements.blockList;
        DOM.empty(container);

        // 更新块计数
        this._elements.blockCount.textContent = `${this._blocks.length} 个`;

        // 显示块列表区域
        DOM.show(this._elements.blockListSection);

        this._blocks.forEach((block, index) => {
            const item = DOM.createElement('div', 'block-item', {
                data: { index: index },
                draggable: true
            });

            // 拖拽手柄
            const handle = DOM.createElement('div', 'block-item__handle');
            handle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            `;
            item.appendChild(handle);

            // 缩略图
            const thumb = DOM.createElement('div', 'block-item__thumb');
            const thumbCanvas = this._createBlockThumbnail(block);
            thumb.appendChild(thumbCanvas);
            item.appendChild(thumb);

            // 信息
            const info = DOM.createElement('div', 'block-item__info');
            const name = DOM.createElement('div', 'block-item__name', {
                textContent: block.name
            });
            info.appendChild(name);

            const size = DOM.createElement('div', 'block-item__size', {
                textContent: `${block.region.width} × ${block.region.height}`
            });
            info.appendChild(size);
            item.appendChild(info);

            // 删除按钮
            const deleteBtn = DOM.createElement('button', 'block-item__delete');
            deleteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            `;
            DOM.on(deleteBtn, 'click', (e) => {
                e.stopPropagation();
                this._deleteBlock(block.id);
            });
            item.appendChild(deleteBtn);

            // 拖拽事件
            DOM.on(item, 'dragstart', (e) => this._onBlockDragStart(e, index));
            DOM.on(item, 'dragover', (e) => this._onBlockDragOver(e, index));
            DOM.on(item, 'drop', (e) => this._onBlockDrop(e, index));
            DOM.on(item, 'dragend', () => this._onBlockDragEnd());

            container.appendChild(item);
        });
    },

    /**
     * 创建块缩略图
     */
    _createBlockThumbnail(block) {
        const canvas = document.createElement('canvas');
        const maxSize = 48;
        const scale = Math.min(maxSize / block.region.width, maxSize / block.region.height);
        canvas.width = block.region.width * scale;
        canvas.height = block.region.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            block.sourceImage,
            block.region.x, block.region.y, block.region.width, block.region.height,
            0, 0, canvas.width, canvas.height
        );

        return canvas;
    },

    /**
     * 删除块
     */
    _deleteBlock(blockId) {
        const index = this._blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;

        this._blocks.splice(index, 1);

        // 更新索引
        this._blocks.forEach((block, i) => {
            block.index = i;
        });

        // 更新UI
        ManualSelector.setBlocks(this._blocks);
        this._renderBlockList();

        if (this._blocks.length > 0) {
            this._calculateAlignment();
        } else {
            this._state = 'loaded';
            DOM.hide(this._elements.alignSettings);
            DOM.hide(this._elements.sheetSettings);
            DOM.hide(this._elements.exportSection);
        }
    },

    // 拖拽状态
    _dragState: {
        fromIndex: -1
    },

    _onBlockDragStart(e, index) {
        this._dragState.fromIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('block-item--dragging');
    },

    _onBlockDragOver(e, index) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    _onBlockDrop(e, toIndex) {
        e.preventDefault();
        const fromIndex = this._dragState.fromIndex;

        if (fromIndex !== -1 && fromIndex !== toIndex) {
            // 重新排序
            const [moved] = this._blocks.splice(fromIndex, 1);
            this._blocks.splice(toIndex, 0, moved);

            // 更新索引
            this._blocks.forEach((block, i) => {
                block.index = i;
            });

            // 重新渲染
            this._renderBlockList();
            this._previewSpriteSheet();
        }
    },

    _onBlockDragEnd() {
        this._dragState.fromIndex = -1;
        const items = this._elements.blockList.querySelectorAll('.block-item');
        items.forEach(item => item.classList.remove('block-item--dragging'));
    },

    /**
     * 选择锚点类型
     */
    _selectPivot(pivotType) {
        this._elements.pivotBtns.forEach(btn => {
            btn.classList.toggle('pivot-btn--active', btn.dataset.pivot === pivotType);
        });

        const pivotNames = {
            'bottom-center': '底部居中',
            'center-center': '正中心',
            'top-left': '左上角'
        };
        this._elements.pivotTag.textContent = pivotNames[pivotType] || pivotType;

        FrameAligner.setPivotType(pivotType);

        if (this._state === 'blocks_created' || this._state === 'aligned') {
            this._calculateAlignment();
        }
    },

    /**
     * 计算对齐
     */
    _calculateAlignment() {
        if (this._blocks.length === 0) {
            this.showToast('没有有效的块', 'warning');
            return;
        }

        const result = FrameAligner.calculate(this._blocks);

        if (!result) return;

        this._state = 'aligned';

        // 更新标准化尺寸显示
        this._elements.standardSize.innerHTML = `<span>宽: ${result.maxSize.width} | 高: ${result.maxSize.height}</span>`;
        this._elements.sizeTag.textContent = `${result.maxSize.width} × ${result.maxSize.height}`;

        // 渲染对齐预览
        this._renderAlignPreview(this._blocks, result.maxSize);

        // 显示设置区域
        DOM.show(this._elements.alignSettings);
        DOM.show(this._elements.sheetSettings);
        DOM.show(this._elements.exportSection);

        // 更新精灵表预览信息
        this._updateSheetSizeInfo();

        // 自动生成精灵表预览
        this._previewSpriteSheet();
    },

    /**
     * 渲染对齐预览
     */
    _renderAlignPreview(blocks, maxSize) {
        const container = this._elements.alignGrid;
        DOM.empty(container);

        // 显示前 8 个块预览
        const previewBlocks = blocks.slice(0, 8);

        previewBlocks.forEach((block, index) => {
            const item = DOM.createElement('div', 'align-grid__item');

            const canvas = FrameAligner.renderPreview(block, maxSize);
            if (canvas) {
                item.appendChild(canvas);
            }

            const num = DOM.createElement('span', 'align-grid__num', {
                textContent: String(index + 1).padStart(2, '0')
            });
            item.appendChild(num);

            container.appendChild(item);
        });
    },

    /**
     * 精灵表列数变化
     */
    _onSheetColsChange() {
        const cols = parseInt(this._elements.sheetColsInput.value) || 4;
        this._elements.sheetColsSlider.value = Math.min(cols, 16);
        SpriteSheetGenerator.setCols(cols);
        this._updateSheetSizeInfo();

        if (this._state === 'aligned' || this._state === 'generated') {
            this._previewSpriteSheet();
        }
    },

    /**
     * 精灵表间距变化
     */
    _onSheetSpacingChange() {
        const spacing = parseInt(this._elements.sheetSpacing.value) || 0;
        SpriteSheetGenerator.setSpacing(spacing);
        this._updateSheetSizeInfo();

        if (this._state === 'aligned' || this._state === 'generated') {
            this._previewSpriteSheet();
        }
    },

    /**
     * 更新精灵表尺寸信息
     */
    _updateSheetSizeInfo() {
        if (this._blocks.length === 0) return;

        const result = FrameAligner.getResult();
        if (!result) return;

        const cols = parseInt(this._elements.sheetColsInput.value) || 4;
        const spacing = parseInt(this._elements.sheetSpacing.value) || 0;
        const rows = Math.ceil(this._blocks.length / cols);

        const outputWidth = cols * (result.maxSize.width + spacing) - spacing;
        const outputHeight = rows * (result.maxSize.height + spacing) - spacing;

        this._elements.sheetSizeInfo.innerHTML = `<span>输出尺寸: ${outputWidth} × ${outputHeight} (${cols}列 × ${rows}行)</span>`;
    },

    /**
     * 预览精灵表
     */
    _previewSpriteSheet() {
        if (this._blocks.length === 0) return;

        const result = FrameAligner.getResult();
        if (!result) return;

        SpriteSheetGenerator.prepare(this._blocks, result.maxSize);

        const sheet = SpriteSheetGenerator.generate();
        if (!sheet) return;

        this._state = 'generated';

        const canvas = this._elements.sheetPreviewCanvas;
        canvas.width = sheet.width;
        canvas.height = sheet.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(sheet.canvas, 0, 0);

        DOM.hide(this._elements.sheetPreviewContainer.querySelector('.preview-placeholder'));
        DOM.show(canvas);

        // 自适应缩放
        PreviewUtils.autoFitPreview({
            container: this._elements.sheetPreviewContainer,
            canvas: canvas,
            slider: this._elements.sheetZoomSlider,
            valueDisplay: this._elements.sheetZoomValue,
            type: 'original'
        });

        this._updateButtonStates();
    },

    /**
     * 更新精灵表预览缩放
     */
    _updateSheetPreviewZoom(scale) {
        const canvas = this._elements.sheetPreviewCanvas;
        if (canvas) {
            canvas.style.transform = `scale(${scale})`;
            canvas.style.transformOrigin = 'center center';
        }
    },

    /**
     * 导出精灵表
     */
    async _exportSpriteSheet() {
        const sheet = SpriteSheetGenerator.getSheet();
        if (!sheet) {
            this.showToast('请先生成精灵表', 'warning');
            return;
        }

        const format = this._getSelectedFormat();
        const prefix = this._elements.fileNamePrefix.value || 'sprite_sheet';

        this.showLoading('正在导出...');

        try {
            const blob = await CanvasUtils.canvasToBlob(sheet.canvas, format);
            FileUtils.downloadBlob(blob, `${prefix}.${format}`);

            this.hideLoading();
            this.showToast('导出成功', 'success');

        } catch (error) {
            this.hideLoading();
            this.showToast('导出失败: ' + error.message, 'error');
        }
    },

    /**
     * 获取选中的导出格式
     */
    _getSelectedFormat() {
        const selected = Array.from(this._elements.formatRadios).find(r => r.checked);
        return selected ? selected.value : 'png';
    },

    /**
     * 更新按钮状态
     */
    _updateButtonStates() {
        const hasSource = this._state !== 'idle';
        const hasBlocks = this._state === 'blocks_created' || this._state === 'aligned' || this._state === 'generated';
        const hasAligned = this._state === 'aligned' || this._state === 'generated';
        const hasGenerated = this._state === 'generated';

        this._elements.undoBlockBtn.disabled = !hasBlocks;
        this._elements.clearAllBlocksBtn.disabled = !hasBlocks;
        this._elements.previewSheetBtn.disabled = !hasAligned;
        this._elements.exportSheetBtn.disabled = !hasGenerated;
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

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }
};

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    if (typeof APP_CONFIG !== 'undefined') {
        document.querySelectorAll('[data-i18n="appName"]').forEach(el => {
            el.textContent = APP_CONFIG.name;
        });
    }
    FrameStandardizerApp.init();
});
