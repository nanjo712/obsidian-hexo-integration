import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, HexoIntegrationSettings, HexoIntegrationSettingTab } from "./settings";

// Remember to rename these classes and interfaces!

export default class HexoIntegration extends Plugin {
    settings: HexoIntegrationSettings;

    async onload() {
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        this.addRibbonIcon('dice', 'Hexo Integration', (evt: MouseEvent) => {
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
                new HexoIntegrationModal(this.app).open();
            }
        });

        this.addCommand({
            id: 'create-hexo-post',
            name: 'Create new Hexo Post',
            callback: async () => {
                await this.createHexoPost();
            }
        });

        this.addCommand({
            id: 'convert-to-hexo',
            name: 'Convert to Hexo format',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    await this.convertToHexo(activeFile);
                }
            }
        });

        this.addCommand({
            id: 'publish-post',
            name: 'Publish current post',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    await this.publishPost(activeFile);
                }
            }
        });


        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new HexoIntegrationSettingTab(this.app, this));

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
        const dateStr = this.getFormattedDate();

        const content = `---
title: 
date: ${dateStr}
tags: 
publish: false
---
`;

        // Create and open
        const file = await this.app.vault.create(fileName, content);
        this.app.workspace.getLeaf(false).openFile(file);
    }

    getFormattedDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    async convertToHexo(file: TFile) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (!frontmatter.title) frontmatter.title = file.basename;
            if (!frontmatter.date) frontmatter.date = this.getFormattedDate();
            if (!frontmatter.tags) frontmatter.tags = [];
            if (frontmatter.publish === undefined) frontmatter.publish = false;
        });
        new Notice(`${file.name} converted to Hexo format.`);
    }

    async publishPost(file: TFile) {
        if (!this.settings.hexoRoot) {
            new Notice('Error: Hexo root directory not configured in settings.');
            return;
        }

        // Check format
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        const isHexoFormat = frontmatter &&
            'title' in frontmatter &&
            'date' in frontmatter &&
            'tags' in frontmatter &&
            'publish' in frontmatter;

        if (!isHexoFormat) {
            await this.convertToHexo(file);
        }

        // Set publish to true
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            fm.publish = true;
        });

        // Copy to Hexo
        try {
            const fs = require('fs');
            const pathNode = require('path');
            const targetDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
            const assetDir = pathNode.join(targetDir, file.basename);

            if (!fs.existsSync(targetDir)) {
                new Notice(`Error: Target directory ${targetDir} does not exist.`);
                return;
            }

            let content = await this.app.vault.read(file);

            // Handle images
            const embeds = cache?.embeds || [];
            for (const embed of embeds) {
                const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);

                if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
                    // Create asset folder if it doesn't exist
                    if (!fs.existsSync(assetDir)) {
                        fs.mkdirSync(assetDir, { recursive: true });
                    }

                    // Copy image
                    const imageContent = await this.app.vault.readBinary(linkedFile);
                    fs.writeFileSync(pathNode.join(assetDir, linkedFile.name), Buffer.from(imageContent));

                    // Replace syntax in content
                    // Handle ![[image.png|alt]] or ![[image.png]]
                    const altText = embed.displayText !== linkedFile.name ? embed.displayText : '';
                    const wikiRegex = new RegExp(`!\\[\\[${embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|.*?)?\\]\\]`, 'g');
                    content = content.replace(wikiRegex, `{% asset_img ${linkedFile.name} ${altText} %}`);

                    // Handle ![alt](image.png)
                    const mdRegex = new RegExp(`!\\[(.*?)\\]\\(${embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
                    content = content.replace(mdRegex, (match, alt) => `{% asset_img ${linkedFile.name} ${alt || ''} %}`);
                }
            }

            fs.writeFileSync(pathNode.join(targetDir, file.name), content);
            new Notice(`Published ${file.name} to Hexo blog with ${embeds.length} images handled.`);
        } catch (error: any) {
            console.error(error);
            new Notice(`Error publishing post: ${error.message}`);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<HexoIntegrationSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HexoIntegrationModal extends Modal {
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
