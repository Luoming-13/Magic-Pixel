/**
 * Magic Pixel - Canvas 工具函数
 */

const CanvasUtils = {
    /**
     * 创建 Canvas
     */
    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    },

    /**
     * 获取 Canvas 2D 上下文
     */
    getContext(canvas) {
        return canvas.getContext('2d');
    },

    /**
     * 绘制图片到 Canvas
     */
    drawImage(canvas, image, sx, sy, sw, sh, dx, dy, dw, dh) {
        const ctx = canvas.getContext('2d');

        if (arguments.length === 6) {
            // drawImage(canvas, image, x, y, width, height)
            ctx.drawImage(image, sx, sy, sw, sh);
        } else if (arguments.length === 10) {
            // drawImage(canvas, image, sx, sy, sw, sh, dx, dy, dw, dh)
            ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        } else {
            // drawImage(canvas, image) - 填充整个 canvas
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
    },

    /**
     * 从源图片绘制切割区域到新 Canvas
     */
    drawSlice(sourceImage, x, y, width, height) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            sourceImage,
            x, y, width, height,  // 源区域
            0, 0, width, height   // 目标区域
        );

        return canvas;
    },

    /**
     * Canvas 转 Blob
     */
    canvasToBlob(canvas, format = 'png', quality = CONFIG.JPEG_QUALITY) {
        return new Promise((resolve, reject) => {
            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob 转换失败'));
                    }
                },
                mimeType,
                format === 'jpg' ? quality : undefined
            );
        });
    },

    /**
     * Canvas 转 DataURL
     */
    canvasToDataUrl(canvas, format = 'png', quality = CONFIG.JPEG_QUALITY) {
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        return canvas.toDataURL(mimeType, format === 'jpg' ? quality : undefined);
    },

    /**
     * 清空 Canvas
     */
    clearCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * 调整 Canvas 尺寸
     */
    resizeCanvas(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;
    },

    /**
     * 复制 Canvas
     */
    cloneCanvas(sourceCanvas) {
        const canvas = this.createCanvas(sourceCanvas.width, sourceCanvas.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);
        return canvas;
    }
};
