/**
 * Magic Pixel - 颜色处理工具
 *
 * 提供颜色空间转换和感知颜色距离计算功能
 */

const ColorUtils = {
    /**
     * RGB 转 HSL
     * @param {number} r - 红色分量 (0-255)
     * @param {number} g - 绿色分量 (0-255)
     * @param {number} b - 蓝色分量 (0-255)
     * @returns {Object} { h, s, l } - 色相(0-360), 饱和度(0-100), 亮度(0-100)
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // 灰色
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    },

    /**
     * HSL 转 RGB
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 饱和度 (0-100)
     * @param {number} l - 亮度 (0-100)
     * @returns {Object} { r, g, b } - RGB分量 (0-255)
     */
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l; // 灰色
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    },

    /**
     * RGB 转 Lab 颜色空间
     * 用于更准确的感知颜色距离计算
     * @param {number} r - 红色分量 (0-255)
     * @param {number} g - 绿色分量 (0-255)
     * @param {number} b - 蓝色分量 (0-255)
     * @returns {Object} { L, a, b }
     */
    rgbToLab(r, g, b) {
        // RGB to XYZ
        let R = r / 255;
        let G = g / 255;
        let B = b / 255;

        R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
        G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
        B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

        R *= 100;
        G *= 100;
        B *= 100;

        // Observer = 2°, Illuminant = D65
        const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
        const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
        const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

        // XYZ to Lab
        const refX = 95.047;
        const refY = 100.000;
        const refZ = 108.883;

        let x = X / refX;
        let y = Y / refY;
        let z = Z / refZ;

        const f = (t) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + (16 / 116);

        x = f(x);
        y = f(y);
        z = f(z);

        return {
            L: Math.round((116 * y) - 16),
            a: Math.round(500 * (x - y)),
            b: Math.round(200 * (y - z))
        };
    },

    /**
     * 计算感知颜色距离 (CIEDE2000 简化版)
     * @param {Object} color1 - { r, g, b }
     * @param {Object} color2 - { r, g, b }
     * @returns {number} 颜色距离 (0-100)
     */
    perceptualDistance(color1, color2) {
        const lab1 = this.rgbToLab(color1.r, color1.g, color1.b);
        const lab2 = this.rgbToLab(color2.r, color2.g, color2.b);

        const dL = lab1.L - lab2.L;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;

        // 简化的 CIEDE2000
        return Math.sqrt(dL * dL + da * da + db * db);
    },

    /**
     * 计算欧几里得颜色距离
     * @param {Object} color1 - { r, g, b }
     * @param {Object} color2 - { r, g, b }
     * @returns {number} 颜色距离
     */
    euclideanDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    },

    /**
     * 颜色混合
     * @param {Object} color1 - { r, g, b }
     * @param {Object} color2 - { r, g, b }
     * @param {number} ratio - 混合比例 (0-1), 0=color1, 1=color2
     * @returns {Object} { r, g, b }
     */
    blendColors(color1, color2, ratio) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * ratio),
            g: Math.round(color1.g + (color2.g - color1.g) * ratio),
            b: Math.round(color1.b + (color2.b - color1.b) * ratio)
        };
    },

    /**
     * 获取颜色亮度
     * @param {number} r - 红色分量
     * @param {number} g - 绿色分量
     * @param {number} b - 蓝色分量
     * @returns {number} 亮度 (0-255)
     */
    getLuminance(r, g, b) {
        // 使用感知亮度公式
        return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    },

    /**
     * 颜色对象转十六进制字符串
     * @param {Object} color - { r, g, b }
     * @returns {string} 十六进制颜色 (如 "#ff0000")
     */
    rgbToHex(color) {
        const toHex = (c) => {
            const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(color.r) + toHex(color.g) + toHex(color.b);
    },

    /**
     * 十六进制字符串转颜色对象
     * @param {string} hex - 十六进制颜色 (如 "#ff0000" 或 "ff0000")
     * @returns {Object} { r, g, b }
     */
    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    },

    /**
     * 比较颜色的亮度
     * @param {Object} color1 - { r, g, b }
     * @param {Object} color2 - { r, g, b }
     * @returns {number} 负数表示 color1 更暗，正数表示 color1 更亮
     */
    compareBrightness(color1, color2) {
        const l1 = this.getLuminance(color1.r, color1.g, color1.b);
        const l2 = this.getLuminance(color2.r, color2.g, color2.b);
        return l1 - l2;
    },

    /**
     * 查找数组中亮度最接近的颜色索引
     * @param {Object} target - 目标颜色 { r, g, b }
     * @param {Array} colors - 颜色数组 [{ r, g, b }, ...]
     * @param {string} method - 距离计算方法: 'perceptual' | 'euclidean'
     * @returns {number} 最接近的颜色索引
     */
    findClosestColor(target, colors, method = 'perceptual') {
        const distanceFunc = method === 'perceptual' ? this.perceptualDistance : this.euclideanDistance;

        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < colors.length; i++) {
            const distance = distanceFunc.call(this, target, colors[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        return closestIndex;
    },

    /**
     * 获取颜色的平均值
     * @param {Array} colors - 颜色数组 [{ r, g, b }, ...]
     * @returns {Object} 平均颜色 { r, g, b }
     */
    getAverageColor(colors) {
        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        let totalR = 0, totalG = 0, totalB = 0;
        for (const color of colors) {
            totalR += color.r;
            totalG += color.g;
            totalB += color.b;
        }

        return {
            r: Math.round(totalR / colors.length),
            g: Math.round(totalG / colors.length),
            b: Math.round(totalB / colors.length)
        };
    },

    /**
     * 获取颜色的中值
     * @param {Array} colors - 颜色数组 [{ r, g, b }, ...]
     * @returns {Object} 中值颜色 { r, g, b }
     */
    getMedianColor(colors) {
        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        // 按亮度排序
        const sorted = [...colors].sort((a, b) => {
            return this.getLuminance(a.r, a.g, a.b) - this.getLuminance(b.r, b.g, b.b);
        });

        const mid = Math.floor(sorted.length / 2);
        return sorted[mid];
    },

    /**
     * 获取颜色的主导色（出现频率最高的颜色）
     * @param {Array} colors - 颜色数组 [{ r, g, b }, ...]
     * @param {number} tolerance - 颜色归类容差 (0-255)
     * @returns {Object} 主导颜色 { r, g, b }
     */
    getDominantColor(colors, tolerance = 16) {
        if (colors.length === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        // 简化颜色用于统计
        const simplifyColor = (color) => ({
            r: Math.round(color.r / tolerance) * tolerance,
            g: Math.round(color.g / tolerance) * tolerance,
            b: Math.round(color.b / tolerance) * tolerance
        });

        const colorCounts = new Map();

        for (const color of colors) {
            const simplified = simplifyColor(color);
            const key = `${simplified.r},${simplified.g},${simplified.b}`;

            if (colorCounts.has(key)) {
                colorCounts.get(key).count++;
                // 保留原始颜色的累加值用于计算平均
                colorCounts.get(key).sumR += color.r;
                colorCounts.get(key).sumG += color.g;
                colorCounts.get(key).sumB += color.b;
            } else {
                colorCounts.set(key, {
                    count: 1,
                    sumR: color.r,
                    sumG: color.g,
                    sumB: color.b
                });
            }
        }

        // 找出出现次数最多的颜色组
        let maxCount = 0;
        let dominantKey = null;

        for (const [key, data] of colorCounts) {
            if (data.count > maxCount) {
                maxCount = data.count;
                dominantKey = key;
            }
        }

        if (!dominantKey) {
            return colors[0];
        }

        const dominantData = colorCounts.get(dominantKey);
        return {
            r: Math.round(dominantData.sumR / dominantData.count),
            g: Math.round(dominantData.sumG / dominantData.count),
            b: Math.round(dominantData.sumB / dominantData.count)
        };
    }
};
