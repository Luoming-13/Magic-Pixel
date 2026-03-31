/**
 * Sprite Sheet UI Controller
 *
 * 负责界面交互和状态管理
 */

const SpriteSheetUI = {
    currentMode: 'multi',  // 'multi' | 'split'
    draggedItem: null,
    draggedIndex: null,
    zoomLevels: {
        multi: 100,
        split: 100,
        result: 100
    },

    /**
     * 初始化
     */
    init() {
        this.bindModeSwitch();
        this.bindMultiUpload();
        this.bindSplitUpload();
        this.bindSettings();
        this.bindExport();
        this.bindZoomControls();
        this.bindRearrange();
    },

    /**
     * 绑定重新排列按钮
     */
    bindRearrange() {
        const rearrangeBtn = document.getElementById('rearrangeBtn');
        if (!rearrangeBtn) return;

        rearrangeBtn.addEventListener('click', () => {
            if (!SpriteSheet.sourceImage) return;

            // 重新拆分并排列
            const splits = SpriteSheet.reSplitAndArrange();
            this.saveOriginalSplitSettings();
            this.hideRearrangeButton();
            this.renderSplitGrid(splits);
            this.renderSplitPreview();
            this.showToast('已重新排列', 'success');
        });
    },

    /**
     * 显示重新排列按钮
     */
    showRearrangeButton() {
        const btn = document.getElementById('rearrangeBtn');
        if (btn) btn.style.display = 'inline-flex';
    },

    /**
     * 隐藏重新排列按钮
     */
    hideRearrangeButton() {
        const btn = document.getElementById('rearrangeBtn');
        if (btn) btn.style.display = 'none';
    },

    /**
     * 绑定缩放控制
     */
    bindZoomControls() {
        const sliders = [
            { slider: 'multiZoomSlider', value: 'multiZoomValue', key: 'multi', canvas: 'multiPreviewCanvas' },
            { slider: 'splitZoomSlider', value: 'splitZoomValue', key: 'split', rerender: 'splitGrid' },
            { slider: 'resultZoomSlider', value: 'resultZoomValue', key: 'result', canvas: 'splitPreviewCanvas' }
        ];

        sliders.forEach(({ slider, value, key, canvas, rerender }) => {
            const sliderEl = document.getElementById(slider);
            const valueEl = document.getElementById(value);

            if (!sliderEl) return;

            sliderEl.addEventListener('input', () => {
                const zoom = parseInt(sliderEl.value);
                this.zoomLevels[key] = zoom;
                valueEl.textContent = `${zoom}%`;

                if (canvas) {
                    const canvasEl = document.getElementById(canvas);
                    if (canvasEl) {
                        canvasEl.style.transform = `scale(${zoom / 100})`;
                    }
                }

                if (rerender === 'splitGrid' && SpriteSheet.splitImages.length > 0) {
                    // 重新渲染拆分网格以应用新缩放
                    this.renderSplitGrid(SpriteSheet.splitImages);
                }
            });
        });
    },

    /**
     * 绑定模式切换
     */
    bindModeSwitch() {
        const modeBtns = document.querySelectorAll('.mode-nav__btn');

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === this.currentMode) return;

                // 更新按钮状态
                modeBtns.forEach(b => b.classList.remove('mode-nav__btn--active'));
                btn.classList.add('mode-nav__btn--active');

                // 切换面板
                this.currentMode = mode;
                document.getElementById('multiModePanel').style.display = mode === 'multi' ? 'block' : 'none';
                document.getElementById('splitModePanel').style.display = mode === 'split' ? 'block' : 'none';
                document.getElementById('multiPreviewArea').style.display = mode === 'multi' ? 'flex' : 'none';
                document.getElementById('splitPreviewArea').style.display = mode === 'split' ? 'flex' : 'none';

                // 更新导出按钮状态
                this.updateExportButton();
            });
        });
    },

    /**
     * 绑定多图上传
     */
    bindMultiUpload() {
        const uploadZone = document.getElementById('multiUploadZone');
        const fileInput = document.getElementById('multiFileInput');
        const clearBtn = document.getElementById('clearMultiBtn');

        // 点击上传
        uploadZone.addEventListener('click', () => fileInput.click());

        // 文件选择
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await this.handleMultiFiles(e.target.files);
            }
        });

        // 拖拽上传
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('upload-zone--dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('upload-zone--dragover');
        });

        uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadZone.classList.remove('upload-zone--dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                await this.handleMultiFiles(files);
            }
        });

        // 清空按钮
        clearBtn.addEventListener('click', () => {
            SpriteSheet.resetMultiMode();
            this.renderImageList();
            this.updateImageCount();
            this.updateExportButton();
            this.renderMultiPreview();
        });
    },

    /**
     * 处理多图文件
     */
    async handleMultiFiles(files) {
        this.showLoading('正在加载图片...');
        try {
            await SpriteSheet.addImages(files);
            this.renderImageList();
            this.updateImageCount();
            this.updateExportButton();

            // 自动计算单元格尺寸
            const size = SpriteSheet.autoCalculateCellSize();
            document.getElementById('cellWidth').value = size.width || '';
            document.getElementById('cellHeight').value = size.height || '';

            this.renderMultiPreview();
        } finally {
            this.hideLoading();
        }
    },

    /**
     * 渲染图片列表
     */
    renderImageList() {
        const container = document.getElementById('imageList');

        if (SpriteSheet.images.length === 0) {
            container.innerHTML = `
                <div class="image-list-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p>请先上传图片</p>
                </div>
            `;
            return;
        }

        container.innerHTML = SpriteSheet.images.map((item, index) => `
            <div class="image-list-item" draggable="true" data-index="${index}">
                <img src="${item.img.src}" alt="${item.name}">
                <span class="image-list-item__index">${index + 1}</span>
                <button class="image-list-item__remove" data-index="${index}">×</button>
            </div>
        `).join('');

        // 绑定拖拽排序
        this.bindDragSort(container, '.image-list-item', (from, to) => {
            SpriteSheet.reorderImages(from, to);
            this.renderImageList();
            this.renderMultiPreview();
        });

        // 绑定删除按钮
        container.querySelectorAll('.image-list-item__remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                SpriteSheet.removeImage(index);
                this.renderImageList();
                this.updateImageCount();
                this.updateExportButton();
                this.renderMultiPreview();
            });
        });
    },

    /**
     * 绑定拖拽排序
     */
    bindDragSort(container, selector, onReorder) {
        const items = container.querySelectorAll(selector);

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                this.draggedIndex = parseInt(item.dataset.newIndex ?? item.dataset.index);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll(selector).forEach(i => i.classList.remove('drag-over'));
                this.draggedItem = null;
                this.draggedIndex = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggedItem && this.draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const toIndex = parseInt(item.dataset.newIndex ?? item.dataset.index);
                if (this.draggedIndex !== null && this.draggedIndex !== toIndex) {
                    onReorder(this.draggedIndex, toIndex);
                }
            });
        });
    },

    /**
     * 更新图片计数
     */
    updateImageCount() {
        const countEl = document.getElementById('imageCount');
        const numEl = document.getElementById('imageCountNum');

        if (SpriteSheet.images.length > 0) {
            countEl.style.display = 'flex';
            numEl.textContent = SpriteSheet.images.length;
        } else {
            countEl.style.display = 'none';
        }
    },

    /**
     * 渲染多图预览
     */
    renderMultiPreview() {
        const container = document.getElementById('multiPreviewContainer');
        const canvas = document.getElementById('multiPreviewCanvas');

        if (SpriteSheet.images.length === 0) {
            canvas.style.display = 'none';
            container.querySelector('.preview-placeholder').style.display = 'flex';
            return;
        }

        container.querySelector('.preview-placeholder').style.display = 'none';
        canvas.style.display = 'block';

        const result = SpriteSheet.composeMultiImages();
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(result, 0, 0);

        // 应用当前缩放
        const zoom = this.zoomLevels.multi;
        canvas.style.transform = `scale(${zoom / 100})`;

        this.updateOutputSize();
    },

    /**
     * 绑定单图上传
     */
    bindSplitUpload() {
        const uploadZone = document.getElementById('splitUploadZone');
        const fileInput = document.getElementById('splitFileInput');

        uploadZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await this.handleSplitFile(e.target.files[0]);
            }
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('upload-zone--dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('upload-zone--dragover');
        });

        uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadZone.classList.remove('upload-zone--dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                await this.handleSplitFile(files[0]);
            }
        });
    },

    /**
     * 处理单图文件
     */
    async handleSplitFile(file) {
        this.showLoading('正在加载图片...');
        try {
            const result = await SpriteSheet.setSourceImage(file);

            // 显示图片信息
            document.getElementById('splitImageInfo').style.display = 'flex';
            document.getElementById('splitImageName').textContent = result.name;
            document.getElementById('splitImageSize').textContent = `${result.width} × ${result.height}`;

            // 显示源图
            this.renderSplitSource();

            // 自动计算单元格尺寸
            const size = SpriteSheet.autoCalculateCellSize();
            document.getElementById('cellWidth').value = size.width || '';
            document.getElementById('cellHeight').value = size.height || '';

            // 拆分图片
            this.performSplit();

            this.updateExportButton();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * 渲染源图
     */
    renderSplitSource() {
        const container = document.getElementById('splitPreviewContainer');
        const canvas = document.getElementById('splitSourceCanvas');

        if (!SpriteSheet.sourceImage) {
            canvas.style.display = 'none';
            container.querySelector('.preview-placeholder').style.display = 'flex';
            return;
        }

        container.querySelector('.preview-placeholder').style.display = 'none';
        canvas.style.display = 'block';

        const { img } = SpriteSheet.sourceImage;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
    },

    /**
     * 执行拆分
     */
    performSplit() {
        if (!SpriteSheet.sourceImage) return;

        const splits = SpriteSheet.splitSourceImage();
        this.saveOriginalSplitSettings();
        this.hideRearrangeButton();
        this.renderSplitGrid(splits);
        this.renderSplitPreview();
    },

    /**
     * 删除拆分帧
     */
    removeSplitFrame(newIndex) {
        // 从splitOrder中移除指定索引
        SpriteSheet.splitOrder.splice(newIndex, 1);
        // 重新渲染
        this.renderSplitGrid(SpriteSheet.splitImages);
        this.renderSplitPreview();
        this.updateExportButton();
    },

    /**
     * 渲染拆分网格
     */
    renderSplitGrid(splits) {
        const container = document.getElementById('splitGrid');

        if (!splits || splits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const zoom = this.zoomLevels.split;
        const itemSize = Math.max(60, 80 * zoom / 100);

        container.style.gridTemplateColumns = `repeat(${SpriteSheet.cols}, ${itemSize}px)`;

        container.innerHTML = SpriteSheet.splitOrder.map((originalIndex, newIndex) => {
            const item = splits[originalIndex];
            if (!item) return '';
            return `
                <div class="split-grid-item" data-new-index="${newIndex}" data-original-index="${originalIndex}" style="min-width: ${itemSize}px; min-height: ${itemSize}px;">
                    <canvas width="${item.canvas.width}" height="${item.canvas.height}"></canvas>
                    <span class="split-grid-item__index">${newIndex + 1}</span>
                    <div class="split-grid-item__actions">
                        <button class="split-grid-item__action split-grid-item__action--delete" data-new-index="${newIndex}" title="删除此帧">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                        <button class="split-grid-item__action split-grid-item__action--move" data-new-index="${newIndex}" title="拖拽移动顺序">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="5" r="1"/>
                                <circle cx="9" cy="12" r="1"/>
                                <circle cx="9" cy="19" r="1"/>
                                <circle cx="15" cy="5" r="1"/>
                                <circle cx="15" cy="12" r="1"/>
                                <circle cx="15" cy="19" r="1"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 绘制canvas内容
        container.querySelectorAll('.split-grid-item').forEach(el => {
            const originalIndex = parseInt(el.dataset.originalIndex);
            const canvas = el.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(splits[originalIndex].canvas, 0, 0);
        });

        // 绑定删除按钮
        container.querySelectorAll('.split-grid-item__action--delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = parseInt(btn.dataset.newIndex);
                this.removeSplitFrame(newIndex);
            });
        });

        // 绑定移动按钮的拖拽
        this.bindMoveButtonDrag(container, splits);
    },

    /**
     * 绑定移动按钮的拖拽功能
     */
    bindMoveButtonDrag(container, splits) {
        const moveButtons = container.querySelectorAll('.split-grid-item__action--move');
        const items = container.querySelectorAll('.split-grid-item');

        moveButtons.forEach(btn => {
            btn.setAttribute('draggable', 'true');

            btn.addEventListener('dragstart', (e) => {
                const item = btn.closest('.split-grid-item');
                this.draggedItem = item;
                this.draggedIndex = parseInt(item.dataset.newIndex);
                item.classList.add('dragging');
                btn.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            btn.addEventListener('dragend', () => {
                const item = btn.closest('.split-grid-item');
                item.classList.remove('dragging');
                btn.classList.remove('dragging');
                items.forEach(i => i.classList.remove('drag-over'));
                this.draggedItem = null;
                this.draggedIndex = null;
            });
        });

        items.forEach(item => {
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggedItem && this.draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const toIndex = parseInt(item.dataset.newIndex);
                if (this.draggedIndex !== null && this.draggedIndex !== toIndex) {
                    SpriteSheet.reorderSplitImages(this.draggedIndex, toIndex);
                    this.renderSplitGrid(SpriteSheet.splitImages);
                    this.renderSplitPreview();
                }
            });
        });
    },

    /**
     * 渲染拆分后的预览
     */
    renderSplitPreview() {
        const container = document.getElementById('splitResultContainer');
        const canvas = document.getElementById('splitPreviewCanvas');

        if (SpriteSheet.splitImages.length === 0 || SpriteSheet.splitOrder.length === 0) {
            canvas.style.display = 'none';
            container.querySelector('.preview-placeholder').style.display = 'flex';
            return;
        }

        container.querySelector('.preview-placeholder').style.display = 'none';
        canvas.style.display = 'block';

        const result = SpriteSheet.composeSplitImages();
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(result, 0, 0);

        // 应用当前缩放
        const zoom = this.zoomLevels.result;
        canvas.style.transform = `scale(${zoom / 100})`;

        this.updateOutputSize();
    },

    /**
     * 绑定设置
     */
    bindSettings() {
        const colsInput = document.getElementById('colsInput');
        const colsSlider = document.getElementById('colsSlider');
        const rowsInput = document.getElementById('rowsInput');
        const rowsSlider = document.getElementById('rowsSlider');
        const cellWidth = document.getElementById('cellWidth');
        const cellHeight = document.getElementById('cellHeight');
        const paddingInput = document.getElementById('paddingInput');

        // 记录原始拆分设置
        this._originalSplitCols = 0;
        this._originalSplitRows = 0;

        const updateSettings = () => {
            const newCols = parseInt(colsInput.value) || 1;
            const newRows = parseInt(rowsInput.value) || 1;

            SpriteSheet.setParams({
                cols: newCols,
                rows: newRows,
                cellWidth: parseInt(cellWidth.value) || 0,
                cellHeight: parseInt(cellHeight.value) || 0,
                padding: parseInt(paddingInput.value) || 0
            });

            this.updateOutputSize();

            if (this.currentMode === 'multi') {
                this.renderMultiPreview();
            } else if (SpriteSheet.sourceImage) {
                // 检查设置是否改变
                const totalCells = newCols * newRows;
                const hasChanged = (newCols !== this._originalSplitCols || newRows !== this._originalSplitRows);

                if (hasChanged && SpriteSheet.splitImages.length > 0) {
                    // 设置改变，显示重新排列按钮
                    this.showRearrangeButton();
                    // 更新网格显示（可能有多余空位或不足）
                    this.renderSplitGridWithPlaceholders();
                    this.renderSplitPreview();
                } else {
                    this.renderSplitGrid(SpriteSheet.splitImages);
                    this.renderSplitPreview();
                }
            }
        };

        // 同步滑块和输入框
        const syncSliderInput = (input, slider) => {
            input.addEventListener('input', () => {
                slider.value = Math.min(input.value, slider.max);
                updateSettings();
            });
            slider.addEventListener('input', () => {
                input.value = slider.value;
                updateSettings();
            });
        };

        syncSliderInput(colsInput, colsSlider);
        syncSliderInput(rowsInput, rowsSlider);

        cellWidth.addEventListener('input', updateSettings);
        cellHeight.addEventListener('input', updateSettings);
        paddingInput.addEventListener('input', updateSettings);
    },

    /**
     * 记录原始拆分设置
     */
    saveOriginalSplitSettings() {
        this._originalSplitCols = SpriteSheet.cols;
        this._originalSplitRows = SpriteSheet.rows;
    },

    /**
     * 渲染拆分网格（带占位符）
     */
    renderSplitGridWithPlaceholders() {
        const container = document.getElementById('splitGrid');
        const splits = SpriteSheet.splitImages;

        if (!splits || splits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const zoom = this.zoomLevels.split;
        const itemSize = Math.max(60, 80 * zoom / 100);
        const totalCells = SpriteSheet.cols * SpriteSheet.rows;

        container.style.gridTemplateColumns = `repeat(${SpriteSheet.cols}, ${itemSize}px)`;

        let html = '';
        for (let i = 0; i < totalCells; i++) {
            if (i < SpriteSheet.splitOrder.length) {
                const originalIndex = SpriteSheet.splitOrder[i];
                const item = splits[originalIndex];
                if (item) {
                    html += `
                        <div class="split-grid-item" data-new-index="${i}" data-original-index="${originalIndex}" style="min-width: ${itemSize}px; min-height: ${itemSize}px;">
                            <canvas width="${item.canvas.width}" height="${item.canvas.height}"></canvas>
                            <span class="split-grid-item__index">${i + 1}</span>
                            <div class="split-grid-item__actions">
                                <button class="split-grid-item__action split-grid-item__action--delete" data-new-index="${i}" title="删除此帧">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 6L6 18M6 6l12 12"/>
                                    </svg>
                                </button>
                                <button class="split-grid-item__action split-grid-item__action--move" data-new-index="${i}" title="拖拽移动顺序">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="9" cy="5" r="1"/>
                                        <circle cx="9" cy="12" r="1"/>
                                        <circle cx="9" cy="19" r="1"/>
                                        <circle cx="15" cy="5" r="1"/>
                                        <circle cx="15" cy="12" r="1"/>
                                        <circle cx="15" cy="19" r="1"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }
            } else {
                // 占位符（空白帧）
                html += `
                    <div class="split-grid-item split-grid-item--placeholder" style="min-width: ${itemSize}px; min-height: ${itemSize}px;">
                        <div class="split-grid-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v8M8 12h8"/>
                            </svg>
                        </div>
                        <span class="split-grid-item__index">${i + 1}</span>
                    </div>
                `;
            }
        }

        container.innerHTML = html;

        // 绘制canvas内容
        container.querySelectorAll('.split-grid-item:not(.split-grid-item--placeholder)').forEach(el => {
            const originalIndex = parseInt(el.dataset.originalIndex);
            const canvas = el.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(splits[originalIndex].canvas, 0, 0);
        });

        // 绑定删除按钮
        container.querySelectorAll('.split-grid-item__action--delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = parseInt(btn.dataset.newIndex);
                this.removeSplitFrame(newIndex);
            });
        });

        // 绑定移动按钮的拖拽
        this.bindMoveButtonDrag(container, splits);
    },

    /**
     * 更新输出尺寸显示
     */
    updateOutputSize() {
        const size = SpriteSheet.calculateOutputSize();
        document.getElementById('outputSizeInfo').innerHTML = `输出尺寸: <strong>${size.width} × ${size.height}</strong> px`;
    },

    /**
     * 绑定导出
     */
    bindExport() {
        const exportBtn = document.getElementById('exportBtn');

        exportBtn.addEventListener('click', async () => {
            const format = document.querySelector('input[name="format"]:checked').value;

            this.showLoading('正在导出...');

            try {
                await SpriteSheet.download('sprite-sheet', format);
                this.showToast('导出成功！', 'success');
            } catch (error) {
                this.showToast('导出失败: ' + error.message, 'error');
            } finally {
                this.hideLoading();
            }
        });
    },

    /**
     * 更新导出按钮状态
     */
    updateExportButton() {
        const exportBtn = document.getElementById('exportBtn');

        if (this.currentMode === 'multi') {
            exportBtn.disabled = SpriteSheet.images.length === 0;
        } else {
            exportBtn.disabled = SpriteSheet.splitOrder.length === 0;
        }
    },

    /**
     * 显示加载状态
     */
    showLoading(text = '处理中...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    /**
     * 显示提示
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <span class="toast__icon">${type === 'success' ? '✓' : '✕'}</span>
            <span class="toast__message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
