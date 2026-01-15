import { App, PluginSettingTab, Setting } from "obsidian";
import HexoIntegration from "./main";

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
            .setName('Hexo Root Directory')
            .setDesc('The absolute path to your Hexo blog root directory.')
            .addText(text => text
                .setPlaceholder('/path/to/your/hexo/blog')
                .setValue(this.plugin.settings.hexoRoot)
                .onChange(async (value) => {
                    this.plugin.settings.hexoRoot = value;
                    await this.plugin.saveSettings();
                    this.plugin.fileWatcherService.start();
                }));

        new Setting(containerEl)
            .setName('Permalink Style')
            .setDesc('How to generate the permalink if it is missing when publishing.')
            .addDropdown(dropdown => dropdown
                .addOption('translate', 'Baidu Translate')
                .addOption('title', 'Note Title')
                .addOption('pinyin', 'Pinyin Initials')
                .addOption('hash', 'Short Hash')
                .addOption('manual', 'Manual (Abort if missing)')
                .setValue(this.plugin.settings.slugStyle)
                .onChange(async (value: 'translate' | 'pinyin' | 'hash' | 'manual' | 'title') => {
                    this.plugin.settings.slugStyle = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide relevant settings
                }));

        new Setting(containerEl)
            .setName('Image Syntax')
            .setDesc('How images should be referenced in the published post.')
            .addDropdown(dropdown => dropdown
                .addOption('hexo', 'Hexo Tag ({% asset_img %})')
                .addOption('markdown', 'Native Markdown (![]())')
                .setValue(this.plugin.settings.imageSyntax)
                .onChange(async (value: 'hexo' | 'markdown') => {
                    this.plugin.settings.imageSyntax = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Cover Field Name')
            .setDesc('Title of the frontmatter field for the cover image.')
            .addText(text => text
                .setPlaceholder('cover')
                .setValue(this.plugin.settings.coverFieldName)
                .onChange(async (value) => {
                    this.plugin.settings.coverFieldName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Output Panel')
            .setDesc('Show a real-time output panel when running Hexo commands (generate, deploy, etc.)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showOutputModal)
                .onChange(async (value) => {
                    this.plugin.settings.showOutputModal = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Excerpt')
            .setDesc('Automatically insert <!--more--> after the first paragraph when publishing.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoExcerpt)
                .onChange(async (value) => {
                    this.plugin.settings.autoExcerpt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Hexo Server Port')
            .setDesc('The port used by the Hexo preview server (default: 4000).')
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

        containerEl.createEl('h3', { text: 'Image Optimization' });

        new Setting(containerEl)
            .setName('Compress Images')
            .setDesc('Automatically convert and compress images to WebP format when publishing.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.compressImages)
                .onChange(async (value) => {
                    this.plugin.settings.compressImages = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide quality setting
                }));

        if (this.plugin.settings.compressImages) {
            new Setting(containerEl)
                .setName('WebP Quality')
                .setDesc('Compression quality for WebP (0-100).')
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
            containerEl.createEl('h3', { text: 'Baidu Translate Settings' });

            new Setting(containerEl)
                .setName('Baidu AppID')
                .addText(text => text
                    .setValue(this.plugin.settings.baiduAppId)
                    .onChange(async (value) => {
                        this.plugin.settings.baiduAppId = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Baidu API Key')
                .addText(text => text
                    .setValue(this.plugin.settings.baiduApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.baiduApiKey = value;
                        await this.plugin.saveSettings();
                    }));
        }

        if (this.plugin.settings.slugStyle === 'translate' || this.plugin.settings.slugStyle === 'title') {
            containerEl.createEl('h3', { text: 'Permalink Post-Processing' });

            new Setting(containerEl)
                .setName('Remove Stop Words')
                .setDesc('Remove common English stop words (a, the, in, etc.)')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.removeStopWords)
                    .onChange(async (value) => {
                        this.plugin.settings.removeStopWords = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Max Permalink Words')
                .setDesc('Maximum number of words in the generated permalink.')
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
