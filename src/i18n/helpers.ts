import en from './locales/en';
import zh from './locales/zh';

const localeMap: { [key: string]: any } = {
    en,
    zh,
    'zh-TW': zh,
};

const lang = window.localStorage.getItem('language') || 'en';
const locale = localeMap[lang] || en;

/**
 * Translation helper function.
 * @param key The key of the text to translate.
 * @param vars Optional variables to replace in the translated text (e.g. {{name}}).
 */
export function t(key: keyof typeof en, vars?: Record<string, string>): string {
    let text = locale[key] || en[key] || key;

    if (vars) {
        Object.keys(vars).forEach((v) => {
            text = text.replace(`{{${v}}}`, vars[v]);
        });
    }

    return text;
}
