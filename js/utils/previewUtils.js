/**
 * Magic Pixel - 预览工具模块
 * 统一处理图片预览的自适应缩放和居中逻辑
 */

const PreviewUtils = {
    /**
     * 计算自适应缩放比例
     * @param {Object} options - 配置选项
     * @param {HTMLElement} options.container - 容器元素
     * @param {number} options.contentWidth - 内容宽度
     * @param {number} options.contentHeight - 内容高度
     * @param {Object} options.limits - 缩放限制
     * @param {number} options.limits.min - 最小缩放比例
     * @param {number} options.limits.max - 最大缩放比例
     * @param {number} options.limits.maxScaleUp - 最大放大倍数(用于像素图)
     * @param {boolean} options.allowScaleUp - 是否允许放大
     * @param {number} options.padding - 额外的边距
     * @returns {number} 自适应缩放比例
     */
    calculateFitScale(options) {
        const {
            container,
            contentWidth,
            contentHeight,
            limits = {},
            allowScaleUp = false,
            padding = 40
        } = options;

        const { min = 0.1, max = 1, maxScaleUp = 8 } = limits;

        // 处理内容尺寸为0的情况
        if (contentWidth <= 0 || contentHeight <= 0) {
            return min;
        }

        // 获取容器可用尺寸（考虑 padding）
        const containerStyle = getComputedStyle(container);
        const paddingH = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
        const paddingV = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

        const availableWidth = container.clientWidth - paddingH - padding;
        const availableHeight = container.clientHeight - paddingV - padding;

        // 处理容器尺寸未初始化的情况
        if (availableWidth <= 0 || availableHeight <= 0) {
            return min;
        }

        // 计算缩放比例
        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;

        let fitScale;

        if (allowScaleUp) {
            // 允许放大的场景（如像素图预览）
            fitScale = Math.min(scaleX, scaleY, maxScaleUp);
        } else {
            // 不允许放大，最大为1（100%）
            fitScale = Math.min(scaleX, scaleY, max);
        }

        // 确保最小缩放比例
        fitScale = Math.max(fitScale, min);

        return fitScale;
    },

    /**
     * 应用缩放到元素
     * @param {HTMLElement} element - 目标元素
     * @param {number} scale - 缩放比例
     * @param {string} origin - transform-origin 值
     */
    applyScale(element, scale, origin = 'center center') {
        element.style.transform = `scale(${scale})`;
        element.style.transformOrigin = origin;
    },

    /**
     * 应用缩放和平移
     * @param {HTMLElement} element - 目标元素
     * @param {Object} transform - 变换参数
     * @param {number} transform.scale - 缩放比例
     * @param {number} transform.offsetX - X轴偏移
     * @param {number} transform.offsetY - Y轴偏移
     * @param {string} origin - transform-origin 值
     */
    applyTransform(element, transform, origin = 'top left') {
        const { scale = 1, offsetX = 0, offsetY = 0 } = transform;
        element.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        element.style.transformOrigin = origin;
    },

    /**
     * 自适应预览并更新滑块
     * @param {Object} options - 配置选项
     * @param {HTMLElement} options.container - 容器元素
     * @param {HTMLElement} options.canvas - Canvas元素
     * @param {HTMLElement} options.slider - 缩放滑块元素
     * @param {HTMLElement} options.valueDisplay - 缩放值显示元素
     * @param {string} options.type - 预览类型: 'original' | 'pixel'
     * @returns {number} 应用的缩放比例
     */
    autoFitPreview(options) {
        const {
            container,
            canvas,
            slider,
            valueDisplay,
            type = 'original' // 'original' | 'pixel'
        } = options;

        if (!canvas || !container) return 0.1;

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // 根据类型设置不同的缩放策略
        const limits = type === 'pixel'
            ? { min: 0.1, max: 8, maxScaleUp: 8 }
            : { min: 0.1, max: 1, maxScaleUp: 1 };

        const fitScale = this.calculateFitScale({
            container,
            contentWidth: imgWidth,
            contentHeight: imgHeight,
            limits,
            allowScaleUp: type === 'pixel',
            padding: type === 'pixel' ? 60 : 40
        });

        // 转换为百分比
        const fitPercent = Math.round(fitScale * 100);

        // 更新滑块值
        if (slider) {
            slider.value = fitPercent;
        }
        if (valueDisplay) {
            valueDisplay.textContent = `${fitPercent}%`;
        }

        // 应用缩放
        this.applyScale(canvas, fitScale, 'center center');

        return fitScale;
    },

    /**
     * 等待容器尺寸初始化
     * @param {HTMLElement} container - 容器元素
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise<boolean>}
     */
    async waitForContainerSize(container, timeout = 100) {
        return new Promise((resolve) => {
            const checkSize = () => {
                if (container.clientWidth > 0 && container.clientHeight > 0) {
                    resolve(true);
                } else {
                    requestAnimationFrame(checkSize);
                }
            };

            // 设置超时
            setTimeout(() => resolve(false), timeout);

            checkSize();
        });
    },

    /**
     * 计算并应用自适应预览（带重试机制）
     * @param {Object} options - 配置选项（同autoFitPreview）
     * @param {number} retryCount - 重试次数
     * @param {number} retryDelay - 重试延迟(毫秒)
     * @returns {Promise<number>} 应用的缩放比例
     */
    async autoFitPreviewWithRetry(options, retryCount = 3, retryDelay = 50) {
        const { container } = options;

        for (let i = 0; i < retryCount; i++) {
            // 检查容器尺寸是否有效
            const hasSize = await this.waitForContainerSize(container, retryDelay);

            if (hasSize) {
                return this.autoFitPreview(options);
            }

            // 等待后重试
            if (i < retryCount - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        // 最终尝试
        return this.autoFitPreview(options);
    }
};

// 导出到全局
window.PreviewUtils = PreviewUtils;
