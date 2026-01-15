import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

// Remember to rename these classes and interfaces!

export default class ObsidianHexoIntegration extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status bar text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-modal-simple',
            name: 'Open modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'replace-selected',
            name: 'Replace selected content',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                editor.replaceSelection('Sample editor command');
            }
        });

        this.addCommand({
            id: 'create-hexo-post',
            name: 'Create new Hexo Post',
            callback: async () => {
                await this.createHexoPost();
            }
        });


        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            new Notice("Click");
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

    }

    onunload() {
    }

    async createHexoPost() {
        let baseName = 'Untitled';
        let fileName = `${baseName}.md`;
        let i = 0;

        // Find unique filename
        while (await this.app.vault.adapter.exists(fileName)) {
            i++;
            fileName = `${baseName} ${i}.md`;
        }

        // Generate content
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const content = `---
title: 
date: ${dateStr}
tags: 
---
`;

        // Create and open
        const file = await this.app.vault.create(fileName, content);
        this.app.workspace.getLeaf(false).openFile(file);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
