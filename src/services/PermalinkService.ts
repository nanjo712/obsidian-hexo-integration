import { Notice, requestUrl } from 'obsidian';
import * as crypto_node from 'crypto';
import { pinyin } from 'pinyin-pro';
import { HexoIntegrationSettings } from '../settings';

export class PermalinkService {
    constructor(private settings: HexoIntegrationSettings) { }

    async computeHash(content: string): Promise<string> {
        const buffer = new TextEncoder().encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async generatePermalink(text: string): Promise<string> {
        let result = "";
        switch (this.settings.slugStyle) {
            case 'hash': {
                const hash = await this.computeHash(text);
                result = hash.substring(0, 8);
                break;
            }
            case 'pinyin':
                result = this.convertToPinyinInitials(text);
                break;
            case 'translate': {
                const translated = await this.translateWithBaidu(text);
                result = translated ? this.postProcessPermalink(translated) : "";
                break;
            }
            case 'title':
                result = this.postProcessPermalink(text);
                break;
            case 'manual':
            default:
                return "";
        }

        if (result && !result.endsWith('/') && !result.endsWith('.html')) {
            result += '/';
        }
        return result;
    }

    async translateWithBaidu(text: string): Promise<string> {
        if (!this.settings.baiduAppId || !this.settings.baiduApiKey) {
            new Notice('Baidu app ID or API key not configured');
            return "";
        }

        try {
            const salt = Date.now().toString();
            const signStr = this.settings.baiduAppId + text + salt + this.settings.baiduApiKey;
            const sign = crypto_node.createHash('md5').update(signStr).digest('hex');

            const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=zh&to=en&appid=${this.settings.baiduAppId}&salt=${salt}&sign=${sign}`;

            const response = await requestUrl({ url });
            const data = response.json as {
                error_code?: number;
                error_msg?: string;
                trans_result?: Array<{ dst: string }>;
            };

            if (data.error_code) {
                console.error('Baidu translate error:', data);
                new Notice(`Baidu translate error: ${data.error_msg}`);
                return "";
            }

            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result[0]?.dst || "";
            }
        } catch (error) {
            console.error('Translation failed:', error);
            new Notice('Translation failed, check console for details');
        }
        return "";
    }

    postProcessPermalink(text: string): string {
        let words = text.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 0);

        if (this.settings.removeStopWords) {
            const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from']);
            words = words.filter(w => !stopWords.has(w));
        }

        if (this.settings.maxSlugWords > 0) {
            words = words.slice(0, this.settings.maxSlugWords);
        }

        return words.join('-') || 'post';
    }

    convertToPinyinInitials(text: string): string {
        const initials = pinyin(text, { pattern: 'initial', type: 'array', nonZh: 'spaced' });
        return initials.join('').toLowerCase().replace(/[^a-z0-9]/g, '') || 'post';
    }
}
