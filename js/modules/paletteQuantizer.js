/**
 * Magic Pixel - 调色板量化模块
 *
 * 提供预设调色板和颜色量化功能
 */

const PaletteQuantizer = {
    // 预设调色板
    _presets: {
        // NES 调色板 (54色)
        nes: [
            { r: 0, g: 0, b: 0 },       // 黑色
            { r: 252, g: 252, b: 252 }, // 白色
            { r: 188, g: 188, b: 188 }, // 浅灰
            { r: 124, g: 124, b: 124 }, // 灰色
            { r: 164, g: 228, b: 252 }, // 浅蓝
            { r: 60, g: 188, b: 252 },  // 天蓝
            { r: 0, g: 120, b: 248 },   // 蓝色
            { r: 0, g: 0, b: 252 },     // 深蓝
            { r: 184, g: 184, b: 248 }, // 淡紫蓝
            { r: 104, g: 136, b: 252 }, // 紫蓝
            { r: 0, g: 88, b: 248 },    // 亮深蓝
            { r: 104, g: 68, b: 252 },  // 深紫蓝
            { r: 216, g: 184, b: 248 }, // 淡粉
            { r: 216, g: 0, b: 204 },   // 粉红
            { r: 180, g: 0, b: 152 },   // 洋红
            { r: 148, g: 0, b: 132 },   // 深洋红
            { r: 248, g: 184, b: 248 }, // 浅粉
            { r: 248, g: 120, b: 248 }, // 粉色
            { r: 216, g: 0, b: 120 },   // 玫红
            { r: 168, g: 0, b: 32 },    // 深红
            { r: 248, g: 164, b: 192 }, // 浅肉色
            { r: 248, g: 56, b: 0 },    // 橙红
            { r: 228, g: 0, b: 88 },    // 红
            { r: 136, g: 20, b: 0 },    // 深红棕
            { r: 248, g: 216, b: 120 }, // 浅黄
            { r: 248, g: 184, b: 0 },   // 金黄
            { r: 248, g: 120, b: 88 },  // 橙
            { r: 0, g: 0, b: 0 },       // 重复占位
            { r: 240, g: 208, b: 176 }, // 肉色
            { r: 248, g: 120, b: 0 },   // 深橙
            { r: 228, g: 92, b: 16 },   // 红橙
            { r: 172, g: 124, b: 0 },   // 棕
            { r: 252, g: 224, b: 168 }, // 浅黄2
            { r: 248, g: 216, b: 0 },   // 黄
            { r: 248, g: 160, b: 68 },  // 浅橙
            { r: 184, g: 72, b: 0 },    // 棕橙
            { r: 248, g: 248, b: 120 }, // 浅黄绿
            { r: 184, g: 248, b: 24 },  // 黄绿
            { r: 0, g: 184, b: 0 },     // 绿
            { r: 0, g: 168, b: 0 },     // 深绿
            { r: 184, g: 248, b: 184 }, // 浅绿
            { r: 88, g: 216, b: 84 },   // 亮绿
            { r: 0, g: 168, b: 68 },    // 蓝绿
            { r: 0, g: 136, b: 136 },   // 青绿
            { r: 248, g: 184, b: 248 }, // 浅粉2
            { r: 0, g: 252, b: 252 },   // 青
            { r: 0, g: 232, b: 216 },   // 浅青
            { r: 0, g: 136, b: 136 },   // 青绿2
            { r: 0, g: 64, b: 88 },     // 深青
            { r: 216, g: 248, b: 120 }, // 浅黄绿2
            { r: 56, g: 248, b: 56 },   // 亮绿2
            { r: 0, g: 216, b: 0 },     // 绿2
            { r: 0, g: 104, b: 0 },     // 深绿2
            { r: 120, g: 120, b: 120 }, // 灰2
            { r: 248, g: 216, b: 0 },   // 金黄2
            { r: 0, g: 0, b: 252 },     // 蓝紫
        ].slice(0, 54),

        // Game Boy 调色板 (4色 - 经典绿色)
        gameboy: [
            { r: 15, g: 56, b: 15 },    // 最深绿
            { r: 48, g: 98, b: 48 },    // 深绿
            { r: 139, g: 172, b: 15 },  // 浅绿
            { r: 155, g: 188, b: 15 },  // 最浅绿
        ],

        // PICO-8 调色板 (16色)
        pico8: [
            { r: 0, g: 0, b: 0 },       // 0 黑色
            { r: 29, g: 43, b: 83 },    // 1 深蓝
            { r: 126, g: 37, b: 83 },   // 2 深紫
            { r: 0, g: 135, b: 81 },    // 3 深绿
            { r: 171, g: 82, b: 54 },   // 4 棕
            { r: 95, g: 87, b: 79 },    // 5 深灰
            { r: 194, g: 195, b: 199 }, // 6 浅灰
            { r: 255, g: 241, b: 232 }, // 7 白色
            { r: 255, g: 0, b: 77 },    // 8 红
            { r: 255, g: 163, b: 0 },   // 9 橙
            { r: 255, g: 236, b: 39 },  // 10 黄
            { r: 0, g: 228, b: 54 },    // 11 绿
            { r: 41, g: 173, b: 255 },  // 12 蓝
            { r: 131, g: 118, b: 156 }, // 13 靛蓝
            { r: 255, g: 119, b: 168 }, // 14 粉
            { r: 255, g: 204, b: 170 }, // 15 肉色
        ],

        // EGA 调色板 (16色)
        ega: [
            { r: 0, g: 0, b: 0 },       // 黑色
            { r: 0, g: 0, b: 170 },     // 蓝色
            { r: 0, g: 170, b: 0 },     // 绿色
            { r: 0, g: 170, b: 170 },   // 青色
            { r: 170, g: 0, b: 0 },     // 红色
            { r: 170, g: 0, b: 170 },   // 洋红
            { r: 170, g: 85, b: 0 },    // 棕色
            { r: 170, g: 170, b: 170 }, // 浅灰
            { r: 85, g: 85, b: 85 },    // 深灰
            { r: 85, g: 85, b: 255 },   // 亮蓝
            { r: 85, g: 255, b: 85 },   // 亮绿
            { r: 85, g: 255, b: 255 },  // 亮青
            { r: 255, g: 85, b: 85 },   // 亮红
            { r: 255, g: 85, b: 255 },  // 亮洋红
            { r: 255, g: 255, b: 85 },  // 黄色
            { r: 255, g: 255, b: 255 }, // 白色
        ],

        // CGA 调色板 (4色)
        cga: [
            { r: 0, g: 0, b: 0 },       // 黑色
            { r: 85, g: 255, b: 255 },  // 青色
            { r: 255, g: 85, b: 255 },  // 洋红
            { r: 255, g: 255, b: 255 }, // 白色
        ],

        // Web 安全色 (216色)
        webSafe: (function() {
            const colors = [];
            for (let r = 0; r <= 255; r += 51) {
                for (let g = 0; g <= 255; g += 51) {
                    for (let b = 0; b <= 255; b += 51) {
                        colors.push({ r, g, b });
                    }
                }
            }
            return colors;
        })(),

        // 灰度调色板 (16色)
        grayscale: (function() {
            const colors = [];
            for (let i = 0; i < 16; i++) {
                const v = Math.round(i * 255 / 15);
                colors.push({ r: v, g: v, b: v });
            }
            return colors;
        })()
    },

    /**
     * 获取预设调色板
     * @param {string} name - 调色板名称
     * @returns {Array} 调色板颜色数组
     */
    getPreset(name) {
        return this._presets[name] || null;
    },

    /**
     * 获取所有预设名称
     * @returns {Array} 调色板名称数组
     */
    getPresetNames() {
        return Object.keys(this._presets);
    },

    /**
     * 从图片提取调色板
     * 使用中位切分算法
     * @param {ImageData} imageData - 图片数据
     * @param {number} colorCount - 目标颜色数量
     * @returns {Array} 调色板颜色数组
     */
    extractPalette(imageData, colorCount) {
        const { data, width, height } = imageData;
        const colors = [];

        // 收集所有非透明像素的颜色
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a > 128) { // 忽略半透明像素
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }

        if (colors.length === 0) {
            return this._presets.pico8; // 返回默认调色板
        }

        // 使用中位切分算法
        return this._medianCut(colors, colorCount);
    },

    /**
     * 中位切分算法
     * @param {Array} colors - 颜色数组
     * @param {number} count - 目标颜色数量
     * @returns {Array} 量化后的调色板
     */
    _medianCut(colors, count) {
        if (colors.length <= count) {
            return colors;
        }

        // 创建初始颜色盒子
        let boxes = [colors.slice()];

        // 持续分割直到达到目标数量
        while (boxes.length < count) {
            // 找到体积最大的盒子
            let maxVolume = -1;
            let maxIndex = 0;

            for (let i = 0; i < boxes.length; i++) {
                const volume = this._getBoxVolume(boxes[i]);
                if (volume > maxVolume) {
                    maxVolume = volume;
                    maxIndex = i;
                }
            }

            // 分割最大的盒子
            const box = boxes[maxIndex];
            const [box1, box2] = this._splitBox(box);

            if (box1.length === 0 || box2.length === 0) {
                // 无法继续分割
                break;
            }

            boxes.splice(maxIndex, 1, box1, box2);
        }

        // 计算每个盒子的平均颜色
        return boxes.map(box => this._getBoxAverageColor(box));
    },

    /**
     * 计算颜色盒子的体积
     */
    _getBoxVolume(colors) {
        if (colors.length === 0) return 0;

        const ranges = this._getColorRanges(colors);
        return (ranges.rMax - ranges.rMin) *
               (ranges.gMax - ranges.gMin) *
               (ranges.bMax - ranges.bMin);
    },

    /**
     * 获取颜色范围
     */
    _getColorRanges(colors) {
        let rMin = 255, rMax = 0;
        let gMin = 255, gMax = 0;
        let bMin = 255, bMax = 0;

        for (const c of colors) {
            rMin = Math.min(rMin, c.r);
            rMax = Math.max(rMax, c.r);
            gMin = Math.min(gMin, c.g);
            gMax = Math.max(gMax, c.g);
            bMin = Math.min(bMin, c.b);
            bMax = Math.max(bMax, c.b);
        }

        return { rMin, rMax, gMin, gMax, bMin, bMax };
    },

    /**
     * 分割颜色盒子
     */
    _splitBox(colors) {
        if (colors.length < 2) {
            return [colors, []];
        }

        const ranges = this._getColorRanges(colors);

        // 找到范围最大的通道
        const rRange = ranges.rMax - ranges.rMin;
        const gRange = ranges.gMax - ranges.gMin;
        const bRange = ranges.bMax - ranges.bMin;

        let sortKey;
        if (rRange >= gRange && rRange >= bRange) {
            sortKey = 'r';
        } else if (gRange >= bRange) {
            sortKey = 'g';
        } else {
            sortKey = 'b';
        }

        // 按该通道排序
        const sorted = [...colors].sort((a, b) => a[sortKey] - b[sortKey]);

        // 按中位数分割
        const mid = Math.floor(sorted.length / 2);
        return [sorted.slice(0, mid), sorted.slice(mid)];
    },

    /**
     * 获取盒子平均颜色
     */
    _getBoxAverageColor(colors) {
        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        let totalR = 0, totalG = 0, totalB = 0;
        for (const c of colors) {
            totalR += c.r;
            totalG += c.g;
            totalB += c.b;
        }

        return {
            r: Math.round(totalR / colors.length),
            g: Math.round(totalG / colors.length),
            b: Math.round(totalB / colors.length)
        };
    },

    /**
     * 颜色量化 - 将颜色映射到最近的调色板颜色
     * @param {Object} color - 目标颜色 { r, g, b }
     * @param {Array} palette - 调色板
     * @returns {Object} 最近的调色板颜色
     */
    quantizeColor(color, palette) {
        if (!palette || palette.length === 0) {
            return color;
        }

        let minDistance = Infinity;
        let closestColor = palette[0];

        for (const paletteColor of palette) {
            const distance = ColorUtils.perceptualDistance(color, paletteColor);
            if (distance < minDistance) {
                minDistance = distance;
                closestColor = paletteColor;
            }
        }

        return closestColor;
    },

    /**
     * 批量量化颜色
     * @param {Array} colors - 颜色数组
     * @param {Array} palette - 调色板
     * @returns {Array} 量化后的颜色数组
     */
    quantizeColors(colors, palette) {
        return colors.map(c => this.quantizeColor(c, palette));
    },

    /**
     * 创建自定义调色板
     * @param {Array} colors - 颜色数组 [{ r, g, b }, ...]
     * @returns {Array} 调色板
     */
    createCustomPalette(colors) {
        // 去重
        const uniqueColors = [];
        const seen = new Set();

        for (const color of colors) {
            const key = `${color.r},${color.g},${color.b}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueColors.push(color);
            }
        }

        return uniqueColors;
    },

    /**
     * 生成渐变调色板
     * @param {Object} startColor - 起始颜色 { r, g, b }
     * @param {Object} endColor - 结束颜色 { r, g, b }
     * @param {number} steps - 步数
     * @returns {Array} 渐变调色板
     */
    generateGradient(startColor, endColor, steps) {
        const palette = [];

        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            palette.push({
                r: Math.round(startColor.r + (endColor.r - startColor.r) * t),
                g: Math.round(startColor.g + (endColor.g - startColor.g) * t),
                b: Math.round(startColor.b + (endColor.b - startColor.b) * t)
            });
        }

        return palette;
    }
};
