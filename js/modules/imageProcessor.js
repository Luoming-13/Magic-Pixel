/**
 * Magic Pixel - 图片切割处理模块
 */

const ImageProcessor = {
    // 状态
    _sourceImage: null,
    _cols: 1,
    _rows: 1,
    _pieces: [],
    _previewData: null,

    /**
     * 设置源图片
     */
    setSourceImage(image) {
        this._sourceImage = image;
        this._pieces = [];
    },

    /**
     * 设置切割网格
     */
    setGrid(cols, rows) {
        cols = Math.max(1, Math.min(CONFIG.MAX_GRID_SIZE, parseInt(cols) || 1));
        rows = Math.max(1, Math.min(CONFIG.MAX_GRID_SIZE, parseInt(rows) || 1));

        this._cols = cols;
        this._rows = rows;
        this._pieces = [];
    },

    /**
     * 计算切割块信息
     */
    calculatePieces() {
        if (!this._sourceImage) {
            return [];
        }

        const image = this._sourceImage;
        const cols = this._cols;
        const rows = this._rows;

        // 计算每个切割块的基础尺寸
        const baseWidth = Math.floor(image.width / cols);
        const baseHeight = Math.floor(image.height / rows);

        // 计算最后一列/行的尺寸（处理余数）
        const lastColWidth = image.width - (baseWidth * (cols - 1));
        const lastRowHeight = image.height - (baseHeight * (rows - 1));

        this._pieces = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;

                // 计算坐标
                const x = col * baseWidth;
                const y = row * baseHeight;

                // 计算尺寸（最后一列/行使用实际剩余尺寸）
                const width = (col === cols - 1) ? lastColWidth : baseWidth;
                const height = (row === rows - 1) ? lastRowHeight : baseHeight;

                this._pieces.push({
                    index,
                    row,
                    col,
                    x,
                    y,
                    width,
                    height,
                    canvas: null
                });
            }
        }

        return this._pieces;
    },

    /**
     * 渲染单个切割块
     */
    renderPiece(index) {
        if (!this._sourceImage || index < 0 || index >= this._pieces.length) {
            return null;
        }

        const piece = this._pieces[index];

        // 创建 Canvas 并绘制
        piece.canvas = CanvasUtils.drawSlice(
            this._sourceImage,
            piece.x,
            piece.y,
            piece.width,
            piece.height
        );

        return piece.canvas;
    },

    /**
     * 渲染所有切割块
     */
    renderAllPieces() {
        this.calculatePieces();

        this._pieces.forEach((piece, index) => {
            this.renderPiece(index);
        });

        return this._pieces;
    },

    /**
     * 获取切割块
     */
    getPieces() {
        return this._pieces;
    },

    /**
     * 获取单个切割块
     */
    getPiece(index) {
        return this._pieces[index] || null;
    },

    /**
     * 获取切割数量
     */
    getGridSize() {
        return {
            cols: this._cols,
            rows: this._rows,
            total: this._cols * this._rows
        };
    },

    /**
     * 获取每个切割块的尺寸信息
     */
    getPieceSizeInfo() {
        if (!this._sourceImage || this._cols === 0 || this._rows === 0) {
            return null;
        }

        const baseWidth = Math.floor(this._sourceImage.width / this._cols);
        const baseHeight = Math.floor(this._sourceImage.height / this._rows);

        return {
            width: baseWidth,
            height: baseHeight,
            formatted: `${baseWidth} × ${baseHeight}`
        };
    },

    /**
     * 获取预览数据（用于网格线显示）
     * @param {number} containerWidth - 容器宽度
     * @param {number} containerHeight - 容器高度
     * @param {number} canvasWidth - Canvas 显示宽度
     * @param {number} canvasHeight - Canvas 显示高度
     */
    getPreviewData(containerWidth, containerHeight, canvasWidth, canvasHeight) {
        if (!this._sourceImage) {
            return null;
        }

        // Canvas 在容器中居中，计算 Canvas 的实际位置
        const offsetX = (containerWidth - canvasWidth) / 2;
        const offsetY = (containerHeight - canvasHeight) / 2;

        const displayWidth = canvasWidth;
        const displayHeight = canvasHeight;

        // 计算切割线位置
        const horizontalLines = [];
        const verticalLines = [];

        for (let i = 1; i < this._rows; i++) {
            horizontalLines.push(offsetY + (displayHeight / this._rows) * i);
        }

        for (let i = 1; i < this._cols; i++) {
            verticalLines.push(offsetX + (displayWidth / this._cols) * i);
        }

        return {
            displayWidth,
            displayHeight,
            offsetX,
            offsetY,
            horizontalLines,
            verticalLines
        };
    },

    /**
     * 清除
     */
    clear() {
        this._sourceImage = null;
        this._pieces = [];
        this._cols = 1;
        this._rows = 1;
    }
};
