/**
 * Magic Pixel - 网格线检测与移除模块
 *
 * 识别图片上的等间距参考网格线，计算网格单元大小，并支持移除网格线
 */

const GridLineDetector = {
    // 配置
    _config: {
        minLineWidth: 1,              // 最小网格线宽度
        maxLineWidth: 10,             // 最大网格线宽度
        lineColorThreshold: 30,       // 线条颜色差异阈值
        gridRegularityThreshold: 0.7, // 网格规律性阈值
        minCellSize: 4,               // 最小单元格大小
        maxCellSize: 128,             // 最大单元格大小
        sampleStep: 1                 // 采样步长
    },

    // 最后检测结果
    _lastResult: null,

    /**
     * 检测网格线
     * @param {HTMLImageElement} image - 图片元素
     * @returns {Object} 检测结果 { detected, cellWidth, cellHeight, lineWidth, lineColor, confidence, method }
     */
    detect(image) {
        if (!image || !image.complete) {
            return this._getDefaultResult();
        }

        // 获取像素数据
        const imageData = this._getImageData(image);
        if (!imageData) {
            return this._getDefaultResult();
        }

        const { width, height, data } = imageData;

        // 策略一：颜色一致性检测 - 检测贯穿整图的颜色一致线条
        const colorConsistencyResult = this._detectByColorConsistency(imageData);

        // 策略二：周期性模式分析 - 分析像素变化的周期性
        const periodicityResult = this._detectByPeriodicity(imageData);

        // 选择最佳结果
        const results = [colorConsistencyResult, periodicityResult]
            .filter(r => r && r.confidence > 0)
            .sort((a, b) => b.confidence - a.confidence);

        if (results.length === 0) {
            return this._getDefaultResult();
        }

        this._lastResult = results[0];
        return results[0];
    },

    /**
     * 获取图片像素数据
     */
    _getImageData(image) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return {
                data: imageData.data,
                width: canvas.width,
                height: canvas.height
            };
        } catch (e) {
            console.error('获取像素数据失败:', e);
            return null;
        }
    },

    // ==================== 策略一：颜色一致性检测 ====================

    /**
     * 通过检测贯穿整图的颜色一致线条来识别网格
     */
    _detectByColorConsistency(imageData) {
        const { width, height, data } = imageData;

        // 检测水平网格线
        const hLines = this._detectHorizontalLines(data, width, height);
        // 检测垂直网格线
        const vLines = this._detectVerticalLines(data, width, height);

        if (hLines.length < 1 && vLines.length < 1) {
            return { detected: false, confidence: 0, method: 'colorConsistency' };
        }

        // 分析线条间距，计算单元格大小
        const cellWidth = this._calculateCellSize(vLines, width);
        const cellHeight = this._calculateCellSize(hLines, height);

        // 验证网格规律性
        const regularity = this._verifyGridRegularity(
            imageData, cellWidth, cellHeight, vLines, hLines
        );

        if (regularity < this._config.gridRegularityThreshold) {
            return { detected: false, confidence: regularity * 0.5, method: 'colorConsistency' };
        }

        return {
            detected: true,
            cellWidth: cellWidth.size,
            cellHeight: cellHeight.size,
            lineWidth: hLines.length > 0 ? hLines[0].thickness : vLines.length > 0 ? vLines[0].thickness : 1,
            lineColor: hLines.length > 0 ? hLines[0].color : (vLines.length > 0 ? vLines[0].color : null),
            confidence: regularity,
            method: 'colorConsistency',
            hLines: hLines.map(l => l.position),
            vLines: vLines.map(l => l.position)
        };
    },

    /**
     * 检测水平线条
     */
    _detectHorizontalLines(data, width, height) {
        const lines = [];
        const lineColors = new Map();

        // 扫描每一行
        for (let y = 0; y < height; y++) {
            const rowColors = [];
            let isConsistent = true;
            let firstColor = null;

            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const color = {
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2],
                    a: data[idx + 3]
                };

                if (firstColor === null) {
                    firstColor = color;
                } else if (!this._colorsSimilar(color, firstColor, this._config.lineColorThreshold)) {
                    isConsistent = false;
                    break;
                }
            }

            if (isConsistent && firstColor) {
                lineColors.set(y, firstColor);
            }
        }

        // 合并相邻的行形成线条
        const sortedYs = Array.from(lineColors.keys()).sort((a, b) => a - b);
        let currentLine = null;

        for (let i = 0; i < sortedYs.length; i++) {
            const y = sortedYs[i];
            const color = lineColors.get(y);

            if (currentLine === null) {
                currentLine = { startY: y, endY: y, color };
            } else if (y === currentLine.endY + 1 && this._colorsSimilar(color, currentLine.color, 10)) {
                currentLine.endY = y;
            } else {
                // 保存当前线条
                if (currentLine.endY - currentLine.startY + 1 <= this._config.maxLineWidth) {
                    lines.push({
                        position: Math.floor((currentLine.startY + currentLine.endY) / 2),
                        thickness: currentLine.endY - currentLine.startY + 1,
                        color: currentLine.color
                    });
                }
                currentLine = { startY: y, endY: y, color };
            }
        }

        // 保存最后一条线
        if (currentLine && currentLine.endY - currentLine.startY + 1 <= this._config.maxLineWidth) {
            lines.push({
                position: Math.floor((currentLine.startY + currentLine.endY) / 2),
                thickness: currentLine.endY - currentLine.startY + 1,
                color: currentLine.color
            });
        }

        return lines;
    },

    /**
     * 检测垂直线条
     */
    _detectVerticalLines(data, width, height) {
        const lines = [];
        const lineColors = new Map();

        // 扫描每一列
        for (let x = 0; x < width; x++) {
            const colColors = [];
            let isConsistent = true;
            let firstColor = null;

            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                const color = {
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2],
                    a: data[idx + 3]
                };

                if (firstColor === null) {
                    firstColor = color;
                } else if (!this._colorsSimilar(color, firstColor, this._config.lineColorThreshold)) {
                    isConsistent = false;
                    break;
                }
            }

            if (isConsistent && firstColor) {
                lineColors.set(x, firstColor);
            }
        }

        // 合并相邻的列形成线条
        const sortedXs = Array.from(lineColors.keys()).sort((a, b) => a - b);
        let currentLine = null;

        for (let i = 0; i < sortedXs.length; i++) {
            const x = sortedXs[i];
            const color = lineColors.get(x);

            if (currentLine === null) {
                currentLine = { startX: x, endX: x, color };
            } else if (x === currentLine.endX + 1 && this._colorsSimilar(color, currentLine.color, 10)) {
                currentLine.endX = x;
            } else {
                if (currentLine.endX - currentLine.startX + 1 <= this._config.maxLineWidth) {
                    lines.push({
                        position: Math.floor((currentLine.startX + currentLine.endX) / 2),
                        thickness: currentLine.endX - currentLine.startX + 1,
                        color: currentLine.color
                    });
                }
                currentLine = { startX: x, endX: x, color };
            }
        }

        if (currentLine && currentLine.endX - currentLine.startX + 1 <= this._config.maxLineWidth) {
            lines.push({
                position: Math.floor((currentLine.startX + currentLine.endX) / 2),
                thickness: currentLine.endX - currentLine.startX + 1,
                color: currentLine.color
            });
        }

        return lines;
    },

    // ==================== 策略二：周期性模式分析 ====================

    /**
     * 通过分析像素变化的周期性来推算网格
     */
    _detectByPeriodicity(imageData) {
        const { width, height, data } = imageData;

        // 分析水平方向的周期性
        const hPeriod = this._analyzeHorizontalPeriod(data, width, height);
        // 分析垂直方向的周期性
        const vPeriod = this._analyzeVerticalPeriod(data, width, height);

        if (hPeriod.period === 0 && vPeriod.period === 0) {
            return { detected: false, confidence: 0, method: 'periodicity' };
        }

        const cellWidth = hPeriod.period || width;
        const cellHeight = vPeriod.period || height;

        // 验证周期性
        const confidence = (hPeriod.confidence + vPeriod.confidence) / 2;

        return {
            detected: confidence > this._config.gridRegularityThreshold,
            cellWidth: cellWidth,
            cellHeight: cellHeight,
            lineWidth: 1,
            lineColor: null,
            confidence: confidence,
            method: 'periodicity'
        };
    },

    /**
     * 分析水平方向的周期性
     */
    _analyzeHorizontalPeriod(data, width, height) {
        if (width < this._config.minCellSize * 2) {
            return { period: 0, confidence: 0 };
        }

        // 计算每列的平均颜色差异
        const diffs = [];
        for (let x = 1; x < width; x++) {
            let diff = 0;
            for (let y = 0; y < height; y += this._config.sampleStep) {
                const idx1 = (y * width + x - 1) * 4;
                const idx2 = (y * width + x) * 4;
                diff += Math.abs(data[idx1] - data[idx2]) +
                        Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                        Math.abs(data[idx1 + 2] - data[idx2 + 2]);
            }
            diffs.push(diff / (height / this._config.sampleStep));
        }

        // 找周期性峰值
        return this._findPeriod(diffs, width);
    },

    /**
     * 分析垂直方向的周期性
     */
    _analyzeVerticalPeriod(data, width, height) {
        if (height < this._config.minCellSize * 2) {
            return { period: 0, confidence: 0 };
        }

        // 计算每行的平均颜色差异
        const diffs = [];
        for (let y = 1; y < height; y++) {
            let diff = 0;
            for (let x = 0; x < width; x += this._config.sampleStep) {
                const idx1 = ((y - 1) * width + x) * 4;
                const idx2 = (y * width + x) * 4;
                diff += Math.abs(data[idx1] - data[idx2]) +
                        Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                        Math.abs(data[idx1 + 2] - data[idx2 + 2]);
            }
            diffs.push(diff / (width / this._config.sampleStep));
        }

        return this._findPeriod(diffs, height);
    },

    /**
     * 找出差异序列的周期
     */
    _findPeriod(diffs, totalSize) {
        const minPeriod = this._config.minCellSize;
        const maxPeriod = Math.min(this._config.maxCellSize, Math.floor(totalSize / 2));

        let bestPeriod = 0;
        let bestScore = 0;

        for (let period = minPeriod; period <= maxPeriod; period++) {
            // 检查是否有规律性峰值
            let peaks = 0;
            let totalPositions = 0;

            for (let i = period; i < diffs.length; i += period) {
                totalPositions++;
                // 检查是否是局部最大值
                const isPeak = diffs[i] > diffs[i - 1] && diffs[i] > diffs[(i + 1) || i];
                if (isPeak || diffs[i] > this._calculateAverage(diffs) * 1.2) {
                    peaks++;
                }
            }

            const score = totalPositions > 0 ? peaks / totalPositions : 0;

            if (score > bestScore) {
                bestScore = score;
                bestPeriod = period;
            }
        }

        return { period: bestPeriod, confidence: bestScore };
    },

    // ==================== 辅助方法 ====================

    /**
     * 计算单元格大小
     */
    _calculateCellSize(lines, totalSize) {
        if (lines.length < 2) {
            return { size: totalSize, confidence: 0 };
        }

        // 计算线条间距
        const gaps = [];
        for (let i = 1; i < lines.length; i++) {
            gaps.push(lines[i].position - lines[i - 1].position);
        }

        // 使用中位数作为单元格大小
        gaps.sort((a, b) => a - b);
        const medianGap = gaps[Math.floor(gaps.length / 2)];

        return {
            size: Math.max(this._config.minCellSize, Math.min(this._config.maxCellSize, medianGap)),
            confidence: this._calculateVariance(gaps) < 0.1 ? 0.9 : 0.6
        };
    },

    /**
     * 验证网格规律性
     */
    _verifyGridRegularity(imageData, cellWidth, cellHeight, vLines, hLines) {
        const { width, height, data } = imageData;

        if (cellWidth.size < this._config.minCellSize || cellHeight.size < this._config.minCellSize) {
            return 0;
        }

        // 检查单元格内容的一致性
        const cols = Math.floor(width / cellWidth.size);
        const rows = Math.floor(height / cellHeight.size);

        if (cols < 1 || rows < 1) return 0;

        // 采样单元格内容
        const cellFeatures = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const feature = this._extractCellFeature(
                    data, width, height,
                    col * cellWidth.size, row * cellHeight.size,
                    cellWidth.size, cellHeight.size
                );
                cellFeatures.push(feature);
            }
        }

        // 计算单元格活跃度的一致性
        const activities = cellFeatures.map(f => f.activity);
        const avgActivity = this._calculateAverage(activities);
        const variance = this._calculateVariance(activities);

        // 活跃度变异系数越小，规律性越高
        const regularity = Math.max(0, 1 - variance);

        return regularity;
    },

    /**
     * 提取单元格特征
     */
    _extractCellFeature(data, imgWidth, imgHeight, x, y, w, h) {
        let nonEmpty = 0;
        let samples = 0;

        const step = Math.max(1, Math.floor(Math.min(w, h) / 8));

        for (let dy = 0; dy < h; dy += step) {
            for (let dx = 0; dx < w; dx += step) {
                const px = x + dx;
                const py = y + dy;
                if (px >= imgWidth || py >= imgHeight) continue;

                const idx = (py * imgWidth + px) * 4;
                const a = data[idx + 3];

                samples++;
                if (a > 20) {
                    nonEmpty++;
                }
            }
        }

        return {
            activity: samples > 0 ? nonEmpty / samples : 0
        };
    },

    /**
     * 判断两个颜色是否相似
     */
    _colorsSimilar(c1, c2, threshold) {
        return Math.abs(c1.r - c2.r) <= threshold &&
               Math.abs(c1.g - c2.g) <= threshold &&
               Math.abs(c1.b - c2.b) <= threshold;
    },

    /**
     * 计算平均值
     */
    _calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },

    /**
     * 计算变异系数
     */
    _calculateVariance(arr) {
        if (arr.length === 0) return 0;
        const avg = this._calculateAverage(arr);
        if (avg === 0) return 0;
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
        return Math.sqrt(variance) / avg;
    },

    /**
     * 获取默认结果
     */
    _getDefaultResult() {
        return {
            detected: false,
            cellWidth: 16,
            cellHeight: 16,
            lineWidth: 1,
            lineColor: null,
            confidence: 0,
            method: 'default'
        };
    },

    /**
     * 获取上次检测结果
     */
    getLastResult() {
        return this._lastResult;
    },

    // ==================== 网格线移除 ====================

    /**
     * 移除网格线
     * @param {HTMLImageElement} image - 原始图片
     * @param {Object} gridInfo - 网格检测结果
     * @returns {HTMLCanvasElement} 移除网格线后的 Canvas
     */
    removeGridLines(image, gridInfo) {
        if (!gridInfo.detected || (!gridInfo.hLines && !gridInfo.vLines)) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // 移除水平线条
        if (gridInfo.hLines && gridInfo.hLines.length > 0) {
            for (const lineY of gridInfo.hLines) {
                this._fillLine(data, width, height, 'horizontal', lineY, gridInfo.lineWidth);
            }
        }

        // 移除垂直线条
        if (gridInfo.vLines && gridInfo.vLines.length > 0) {
            for (const lineX of gridInfo.vLines) {
                this._fillLine(data, width, height, 'vertical', lineX, gridInfo.lineWidth);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    },

    /**
     * 填充线条（使用相邻像素插值）
     */
    _fillLine(data, width, height, direction, position, lineWidth) {
        const halfWidth = Math.floor(lineWidth / 2);

        if (direction === 'horizontal') {
            // 水平线
            for (let x = 0; x < width; x++) {
                for (let offset = -halfWidth; offset <= halfWidth; offset++) {
                    const y = position + offset;
                    if (y < 0 || y >= height) continue;

                    // 获取上方和下方的颜色
                    const upperY = Math.max(0, position - halfWidth - 1);
                    const lowerY = Math.min(height - 1, position + halfWidth + 1);

                    const upperIdx = (upperY * width + x) * 4;
                    const lowerIdx = (lowerY * width + x) * 4;
                    const targetIdx = (y * width + x) * 4;

                    // 线性插值
                    const ratio = (y - upperY) / (lowerY - upperY + 1);
                    data[targetIdx] = Math.round(data[upperIdx] * (1 - ratio) + data[lowerIdx] * ratio);
                    data[targetIdx + 1] = Math.round(data[upperIdx + 1] * (1 - ratio) + data[lowerIdx + 1] * ratio);
                    data[targetIdx + 2] = Math.round(data[upperIdx + 2] * (1 - ratio) + data[lowerIdx + 2] * ratio);
                    data[targetIdx + 3] = 255;
                }
            }
        } else {
            // 垂直线
            for (let y = 0; y < height; y++) {
                for (let offset = -halfWidth; offset <= halfWidth; offset++) {
                    const x = position + offset;
                    if (x < 0 || x >= width) continue;

                    // 获取左边和右边的颜色
                    const leftX = Math.max(0, position - halfWidth - 1);
                    const rightX = Math.min(width - 1, position + halfWidth + 1);

                    const leftIdx = (y * width + leftX) * 4;
                    const rightIdx = (y * width + rightX) * 4;
                    const targetIdx = (y * width + x) * 4;

                    // 线性插值
                    const ratio = (x - leftX) / (rightX - leftX + 1);
                    data[targetIdx] = Math.round(data[leftIdx] * (1 - ratio) + data[rightIdx] * ratio);
                    data[targetIdx + 1] = Math.round(data[leftIdx + 1] * (1 - ratio) + data[rightIdx + 1] * ratio);
                    data[targetIdx + 2] = Math.round(data[leftIdx + 2] * (1 - ratio) + data[rightIdx + 2] * ratio);
                    data[targetIdx + 3] = 255;
                }
            }
        }
    },

    /**
     * 按网格单元提取内容
     * @param {HTMLImageElement} image - 图片
     * @param {Object} gridInfo - 网格检测结果
     * @returns {Array} 单元格数组，每个单元格包含 { x, y, width, height, canvas }
     */
    extractCells(image, gridInfo) {
        const cells = [];
        const imgWidth = image.naturalWidth || image.width;
        const imgHeight = image.naturalHeight || image.height;

        const cellW = gridInfo.cellWidth;
        const cellH = gridInfo.cellHeight;
        const lineW = gridInfo.lineWidth || 1;

        const cols = Math.floor(imgWidth / (cellW + lineW));
        const rows = Math.floor(imgHeight / (cellH + lineW));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * (cellW + lineW);
                const y = row * (cellH + lineW);

                // 创建单元格画布
                const cellCanvas = document.createElement('canvas');
                cellCanvas.width = cellW;
                cellCanvas.height = cellH;
                const ctx = cellCanvas.getContext('2d');

                // 绘制单元格内容（跳过网格线）
                ctx.drawImage(
                    image,
                    x, y, cellW, cellH,
                    0, 0, cellW, cellH
                );

                cells.push({
                    row,
                    col,
                    x,
                    y,
                    width: cellW,
                    height: cellH,
                    canvas: cellCanvas
                });
            }
        }

        return cells;
    },

    /**
     * 更新配置
     */
    setConfig(config) {
        Object.assign(this._config, config);
    }
};
