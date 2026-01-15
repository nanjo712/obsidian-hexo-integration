import { App, PluginSettingTab, Setting } from "obsidian";
import HexoIntegration from "./main";

export interface HexoIntegrationSettings {
    hexoRoot: string;
    postHashes: Record<string, string>;
}

export const DEFAULT_SETTINGS: HexoIntegrationSettings = {
    hexoRoot: '',
    postHashes: {}
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
    }
}
