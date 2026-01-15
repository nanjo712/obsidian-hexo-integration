import { App, PluginSettingTab, Setting } from "obsidian";
import HexoIntegration from "./main";

export interface HexoIntegrationSettings {
    mySetting: string;
    hexoRoot: string;
}

export const DEFAULT_SETTINGS: HexoIntegrationSettings = {
    mySetting: 'default',
    hexoRoot: ''
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
            .setName('Settings #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));

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
    }
}
