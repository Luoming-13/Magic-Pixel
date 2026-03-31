/**
 * Magic Pixel - DOM 工具函数
 */

const DOM = {
    /**
     * 选择器
     */
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },

    $$(selector, parent = document) {
        return [...parent.querySelectorAll(selector)];
    },

    /**
     * 创建元素
     */
    createElement(tag, className = '', attrs = {}) {
        const el = document.createElement(tag);
        if (className) {
            el.className = className;
        }
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'textContent') {
                el.textContent = value;
            } else if (key === 'innerHTML') {
                el.innerHTML = value;
            } else if (key.startsWith('data')) {
                el.dataset[key.slice(4).toLowerCase()] = value;
            } else {
                el.setAttribute(key, value);
            }
        });
        return el;
    },

    /**
     * 类名操作
     */
    addClass(el, ...classNames) {
        el.classList.add(...classNames);
    },

    removeClass(el, ...classNames) {
        el.classList.remove(...classNames);
    },

    toggleClass(el, className, force) {
        el.classList.toggle(className, force);
    },

    hasClass(el, className) {
        return el.classList.contains(className);
    },

    /**
     * 显示/隐藏
     */
    show(el, display = 'block') {
        el.style.display = display;
    },

    hide(el) {
        el.style.display = 'none';
    },

    toggle(el, display = 'block') {
        if (el.style.display === 'none') {
            el.style.display = display;
        } else {
            el.style.display = 'none';
        }
    },

    /**
     * 样式设置
     */
    setStyles(el, styles) {
        Object.entries(styles).forEach(([prop, value]) => {
            el.style[prop] = value;
        });
    },

    /**
     * 事件绑定
     */
    on(el, event, handler, options) {
        el.addEventListener(event, handler, options);
    },

    off(el, event, handler) {
        el.removeEventListener(event, handler);
    },

    /**
     * 清空子元素
     */
    empty(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    },

    /**
     * 插入到目标元素后面
     */
    insertAfter(newEl, targetEl) {
        targetEl.parentNode.insertBefore(newEl, targetEl.nextSibling);
    }
};
