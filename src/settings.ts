import { App, PluginSettingTab, Setting } from "obsidian";
import HexoIntegration from "./main";
import { t } from "./i18n/helpers";

export interface HexoIntegrationSettings {
    hexoRoot: string;
    postHashes: Record<string, string>;
    slugStyle: 'translate' | 'pinyin' | 'hash' | 'manual' | 'title';
    baiduAppId: string;
    baiduApiKey: string;
    removeStopWords: boolean;
    maxSlugWords: number;
    imageSyntax: 'hexo' | 'markdown';
    coverFieldName: string;
    showOutputModal: boolean;
    pathMapping: Record<string, string>;
    autoExcerpt: boolean;
    serverPort: number;
    compressImages: boolean;
    webpQuality: number;
}

export const DEFAULT_SETTINGS: HexoIntegrationSettings = {
    hexoRoot: '',
    postHashes: {},
    slugStyle: 'hash',
    baiduAppId: '',
    baiduApiKey: '',
    removeStopWords: true,
    maxSlugWords: 5,
    imageSyntax: 'hexo',
    coverFieldName: 'cover',
    showOutputModal: true,
    pathMapping: {},
    autoExcerpt: false,
    serverPort: 4000,
    compressImages: false,
    webpQuality: 75
}

export class HexoIntegrationSettingTab extends PluginSettingTab {
    plugin: HexoIntegration;

    constructor(app: App, plugin: HexoIntegration) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName(t('SETTINGS_HEXO_ROOT'))
            .setDesc(t('SETTINGS_HEXO_ROOT_DESC'))
            .addText(text => text
                .setPlaceholder('/path/to/your/hexo/blog')
                .setValue(this.plugin.settings.hexoRoot)
                .onChange(async (value) => {
                    this.plugin.settings.hexoRoot = value;
                    await this.plugin.saveSettings();
                    void this.plugin.fileWatcherService.start();
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_PERMALINK_STYLE'))
            .setDesc(t('SETTINGS_PERMALINK_STYLE_DESC'))
            .addDropdown(dropdown => dropdown
                .addOption('translate', t('SETTINGS_SELECT_BAIDU'))
                .addOption('title', t('SETTINGS_SELECT_TITLE'))
                .addOption('pinyin', t('SETTINGS_SELECT_PINYIN'))
                .addOption('hash', t('SETTINGS_SELECT_HASH'))
                .addOption('manual', t('SETTINGS_SELECT_MANUAL'))
                .setValue(this.plugin.settings.slugStyle)
                .onChange(async (value: 'translate' | 'pinyin' | 'hash' | 'manual' | 'title') => {
                    this.plugin.settings.slugStyle = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide relevant settings
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_IMAGE_SYNTAX'))
            .setDesc(t('SETTINGS_IMAGE_SYNTAX_DESC'))
            .addDropdown(dropdown => dropdown
                .addOption('hexo', t('SETTINGS_SELECT_HEXO_TAG'))
                .addOption('markdown', t('SETTINGS_SELECT_MARKDOWN_TAG'))
                .setValue(this.plugin.settings.imageSyntax)
                .onChange(async (value: 'hexo' | 'markdown') => {
                    this.plugin.settings.imageSyntax = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_COVER_FIELD'))
            .setDesc(t('SETTINGS_COVER_FIELD_DESC'))
            .addText(text => text
                .setPlaceholder('Property name for cover')
                .setValue(this.plugin.settings.coverFieldName)
                .onChange(async (value) => {
                    this.plugin.settings.coverFieldName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_SHOW_OUTPUT'))
            .setDesc(t('SETTINGS_SHOW_OUTPUT_DESC'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showOutputModal)
                .onChange(async (value) => {
                    this.plugin.settings.showOutputModal = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_AUTO_EXCERPT'))
            .setDesc(t('SETTINGS_AUTO_EXCERPT_DESC'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoExcerpt)
                .onChange(async (value) => {
                    this.plugin.settings.autoExcerpt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t('SETTINGS_SERVER_PORT'))
            .setDesc(t('SETTINGS_SERVER_PORT_DESC'))
            .addText(text => text
                .setPlaceholder('4000')
                .setValue(String(this.plugin.settings.serverPort))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                        this.plugin.settings.serverPort = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl).setHeading().setName(t('SETTINGS_HEADER_IMAGE_OPTIMIZATION'));

        new Setting(containerEl)
            .setName(t('SETTINGS_COMPRESS_IMAGES'))
            .setDesc(t('SETTINGS_COMPRESS_IMAGES_DESC'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.compressImages)
                .onChange(async (value) => {
                    this.plugin.settings.compressImages = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide quality setting
                }));

        if (this.plugin.settings.compressImages) {
            new Setting(containerEl)
                .setName(t('SETTINGS_WEBP_QUALITY'))
                .setDesc(t('SETTINGS_WEBP_QUALITY_DESC'))
                .addSlider(slider => slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.webpQuality)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.webpQuality = value;
                        await this.plugin.saveSettings();
                    }));
        }

        if (this.plugin.settings.slugStyle === 'translate') {
            new Setting(containerEl).setHeading().setName(t('SETTINGS_HEADER_BAIDU_TRANSLATE'));

            new Setting(containerEl)
                .setName(t('SETTINGS_BAIDU_APP_ID'))
                .addText(text => text
                    .setValue(this.plugin.settings.baiduAppId)
                    .onChange(async (value) => {
                        this.plugin.settings.baiduAppId = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName(t('SETTINGS_BAIDU_API_KEY'))
                .addText(text => text
                    .setValue(this.plugin.settings.baiduApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.baiduApiKey = value;
                        await this.plugin.saveSettings();
                    }));
        }

        if (this.plugin.settings.slugStyle === 'translate' || this.plugin.settings.slugStyle === 'title') {
            new Setting(containerEl).setHeading().setName(t('SETTINGS_HEADER_PERMALINK_POST_PROCESSING'));

            new Setting(containerEl)
                .setName(t('SETTINGS_REMOVE_STOP_WORDS'))
                .setDesc(t('SETTINGS_REMOVE_STOP_WORDS_DESC'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.removeStopWords)
                    .onChange(async (value) => {
                        this.plugin.settings.removeStopWords = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName(t('SETTINGS_MAX_PERMALINK_WORDS'))
                .setDesc(t('SETTINGS_MAX_PERMALINK_WORDS_DESC'))
                .addText(text => text
                    .setValue(String(this.plugin.settings.maxSlugWords))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (!isNaN(num)) {
                            this.plugin.settings.maxSlugWords = num;
                            await this.plugin.saveSettings();
                        }
                    }));
        }
    }
}
