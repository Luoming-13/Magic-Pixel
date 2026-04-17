/**
 * Magic Pixel - 国际化模块
 * Internationalization Module
 * 支持中英文切换，使用localStorage持久化用户语言偏好
 */

const I18n = {
    _currentLang: 'zh',
    _translations: null,
    _initialized: false,

    /**
     * 初始化i18n模块
     * Initialize i18n module
     */
    init() {
        // 加载翻译字典
        if (typeof TRANSLATIONS !== 'undefined') {
            this._translations = TRANSLATIONS;
        } else {
            console.warn('I18n: TRANSLATIONS not found');
            return;
        }

        // 从localStorage加载保存的语言偏好
        const savedLang = localStorage.getItem('magicPixel_lang');
        if (savedLang && this._translations[savedLang]) {
            this._currentLang = savedLang;
        }

        // 绑定语言切换按钮事件
        this._bindSwitchButton();

        // 应用翻译
        this.applyTranslations();

        // 更新语言指示器
        this._updateLangIndicator();

        // 更新HTML lang属性
        this._updateHtmlLang();

        this._initialized = true;

        console.log('I18n initialized:', this._currentLang);
    },

    /**
     * 获取当前语言
     * Get current language
     */
    getLang() {
        return this._currentLang;
    },

    /**
     * 设置语言
     * Set language
     * @param {string} lang - 语言代码 ('zh' or 'en')
     */
    setLang(lang) {
        if (!this._translations[lang]) {
            console.warn('I18n: Language not supported:', lang);
            return;
        }

        if (lang === this._currentLang) {
            return;
        }

        this._currentLang = lang;
        localStorage.setItem('magicPixel_lang', lang);

        this.applyTranslations();
        this._updateLangIndicator();
        this._updateHtmlLang();

        // 发出语言变化事件
        document.dispatchEvent(new CustomEvent('langChanged', {
            detail: { lang: lang }
        }));

        console.log('Language changed to:', lang);
    },

    /**
     * 切换语言
     * Toggle language between zh and en
     */
    toggleLang() {
        const newLang = this._currentLang === 'zh' ? 'en' : 'zh';
        this.setLang(newLang);
    },

    /**
     * 获取翻译文本
     * Get translation text by key
     * @param {string} key - 翻译键名
     * @param {string} fallback - 默认文本(可选)
     * @returns {string} 翻译后的文本
     */
    t(key, fallback = '') {
        if (!this._translations || !this._translations[this._currentLang]) {
            return fallback || key;
        }

        const translation = this._translations[this._currentLang][key];
        return translation || fallback || key;
    },

    /**
     * 应用翻译到所有带有data-i18n属性的元素
     * Apply translations to all elements with data-i18n attributes
     */
    applyTranslations() {
        // 翻译文本内容
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation && translation !== key) {
                // 保留某些元素的原始HTML结构（如带有SVG的元素）
                if (el.hasAttribute('data-i18n-keep-html')) {
                    // 只更新纯文本部分
                } else {
                    el.textContent = translation;
                }
            }
        });

        // 翻译placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation && translation !== key) {
                el.placeholder = translation;
            }
        });

        // 翻译title属性
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation && translation !== key) {
                el.title = translation;
            }
        });

        // 翻译value属性（用于按钮等）
        document.querySelectorAll('[data-i18n-value]').forEach(el => {
            const key = el.getAttribute('data-i18n-value');
            const translation = this.t(key);
            if (translation && translation !== key) {
                el.value = translation;
            }
        });
    },

    /**
     * 绑定语言切换按钮点击事件
     * Bind click event to language switch button
     */
    _bindSwitchButton() {
        const switchBtn = document.getElementById('langSwitch');
        if (switchBtn) {
            switchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleLang();
            });
        }
    },

    /**
     * 更新语言指示器显示
     * Update language indicator text
     */
    _updateLangIndicator() {
        const indicator = document.getElementById('langCurrent');
        if (indicator) {
            // 显示将要切换到的语言代码
            indicator.textContent = this._currentLang === 'zh' ? 'EN' : 'ZH';
        }
    },

    /**
     * 更新HTML lang属性
     * Update HTML lang attribute
     */
    _updateHtmlLang() {
        document.documentElement.lang = this._currentLang === 'zh' ? 'zh-CN' : 'en';
    },

    /**
     * 插值翻译文本
     * Interpolate translation with values
     * @param {string} key - 翻译键名
     * @param {object} values - 插值对象 { count: 5, name: 'test' }
     * @returns {string} 插值后的文本
     */
    interpolate(key, values = {}) {
        let text = this.t(key);
        Object.keys(values).forEach(k => {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), values[k]);
        });
        return text;
    },

    /**
     * 检查是否已初始化
     * Check if initialized
     */
    isInitialized() {
        return this._initialized;
    }
};

// DOM加载完成后自动初始化
function initI18n() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => I18n.init());
    } else {
        I18n.init();
    }
}

// 立即初始化
initI18n();

// 导出供其他模块使用
window.I18n = I18n;