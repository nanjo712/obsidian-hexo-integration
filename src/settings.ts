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
}

export const DEFAULT_SETTINGS: HexoIntegrationSettings = {
    hexoRoot: '',
    postHashes: {},
    slugStyle: 'hash',
    baiduAppId: '',
    baiduApiKey: '',
    removeStopWords: true,
    maxSlugWords: 5
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
                }));

        new Setting(containerEl)
            .setName('Slug Style')
            .setDesc('How to generate the slug if it is missing when publishing.')
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
            containerEl.createEl('h3', { text: 'Slug Post-Processing' });

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
                .setName('Max Slug Words')
                .setDesc('Maximum number of words in the generated slug.')
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
