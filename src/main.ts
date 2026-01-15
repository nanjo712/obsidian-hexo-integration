import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, TAbstractFile, SuggestModal, addIcon, setIcon, requestUrl } from 'obsidian';
import * as crypto_node from 'crypto';
import { exec } from 'child_process';
import { pinyin } from 'pinyin-pro';
import { DEFAULT_SETTINGS, HexoIntegrationSettings, HexoIntegrationSettingTab } from "./settings";

export default class HexoIntegration extends Plugin {
    settings: HexoIntegrationSettings;
    statusBarItemEl: HTMLElement;

    async onload() {
        await this.loadSettings();

        // Register custom Hexo icon
        addIcon('hexo-logo', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.02 0L1.596 6.02l-.02 12L11.978 24l10.426-6.02.02-12zm4.828 17.14l-.96.558-.969-.574V12.99H9.081v4.15l-.96.558-.969-.574V6.854l.964-.552.965.563v4.145h5.838V6.86l.965-.552.964.563z"/></svg>');

        // This creates an icon in the left ribbon.
        this.addRibbonIcon('hexo-logo', 'Hexo Integration', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new HexoCommandModal(this.app, this).open();
        });

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        this.statusBarItemEl = this.addStatusBarItem();
        this.statusBarItemEl.addClass('mod-clickable');
        this.statusBarItemEl.setAttr('title', 'Click to publish to Hexo');

        this.statusBarItemEl.onClickEvent(() => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.publishPost(activeFile);
            }
        });

        this.registerEvent(this.app.workspace.on('file-open', () => this.updateStatusBar()));
        this.registerEvent(this.app.metadataCache.on('changed', () => this.updateStatusBar()));

        // Listen for renames and deletes
        this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
            if (this.settings.postHashes[oldPath]) {
                const hash = this.settings.postHashes[oldPath];
                delete this.settings.postHashes[oldPath];
                this.settings.postHashes[file.path] = hash;
                this.saveSettings();
            }
        }));

        this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
            if (this.settings.postHashes[file.path]) {
                delete this.settings.postHashes[file.path];
                this.saveSettings();
            }
        }));

        this.updateStatusBar();

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

        this.addCommand({
            id: 'hexo-generate',
            name: 'Hexo: Generate',
            callback: () => this.hexoGenerate()
        });

        this.addCommand({
            id: 'hexo-server',
            name: 'Hexo: Server',
            callback: () => this.hexoServer()
        });

        this.addCommand({
            id: 'hexo-deploy',
            name: 'Hexo: Deploy',
            callback: () => this.hexoDeploy()
        });

        this.addCommand({
            id: 'generate-slug',
            name: 'Generate Slug for current post',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const generatedSlug = await this.generateSlug(activeFile.basename);
                    if (generatedSlug) {
                        await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                            fm.slug = generatedSlug;
                        });
                        new Notice(`Generated slug: ${generatedSlug}`);
                    }
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new HexoIntegrationSettingTab(this.app, this));
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
slug: 
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
        const generatedSlug = await this.generateSlug(file.basename);
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (!frontmatter.title) frontmatter.title = file.basename;
            if (!frontmatter.slug) frontmatter.slug = generatedSlug;
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
        let frontmatter = cache?.frontmatter;

        // Ensure slug is present
        if (!frontmatter?.slug) {
            if (this.settings.slugStyle === 'manual') {
                new Notice('Error: Slug is required but not filled. Publishing aborted.');
                return;
            }

            const generatedSlug = await this.generateSlug(file.basename);
            if (generatedSlug) {
                await this.app.fileManager.processFrontMatter(file, (fm) => {
                    fm.slug = generatedSlug;
                });
                // Re-read frontmatter after update
                const updatedCache = this.app.metadataCache.getFileCache(file);
                frontmatter = updatedCache?.frontmatter;
                new Notice(`Generated slug: ${generatedSlug}`);
            }
        }
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
            const originalContent = content; // Keep original for hashing

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

            // Save hash for sync check (use original content!)
            this.settings.postHashes[file.path] = await this.computeHash(originalContent);
            await this.saveSettings();

            this.updateStatusBar();
        } catch (error: any) {
            console.error(error);
            new Notice(`Error publishing post: ${error.message}`);
        }
    }

    runHexoCommand(command: string, successMessage: string) {
        if (!this.settings.hexoRoot) {
            new Notice('Error: Hexo root directory not configured.');
            return;
        }

        new Notice(`Running: hexo ${command}...`);
        exec(`hexo ${command}`, { cwd: this.settings.hexoRoot }, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                new Notice(`Error: ${error.message}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            new Notice(successMessage);
        });
    }

    hexoGenerate() {
        this.runHexoCommand('generate', 'Hexo: Generation complete.');
    }

    hexoServer() {
        this.runHexoCommand('server', 'Hexo: Server started (check console for details).');
    }

    hexoDeploy() {
        this.runHexoCommand('deploy', 'Hexo: Deployment complete.');
    }

    async computeHash(content: string): Promise<string> {
        const buffer = new TextEncoder().encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async generateSlug(text: string): Promise<string> {
        let result = "";
        switch (this.settings.slugStyle) {
            case 'hash':
                const hash = await this.computeHash(text);
                result = hash.substring(0, 8);
                break;
            case 'pinyin':
                result = this.convertToPinyinInitials(text);
                break;
            case 'translate':
                const translated = await this.translateWithBaidu(text);
                result = translated ? this.postProcessSlug(translated) : "";
                break;
            case 'title':
                result = this.postProcessSlug(text);
                break;
            case 'manual':
            default:
                return "";
        }
        return result;
    }

    async translateWithBaidu(text: string): Promise<string> {
        if (!this.settings.baiduAppId || !this.settings.baiduApiKey) {
            new Notice('Error: Baidu AppID or API Key not configured.');
            return "";
        }

        try {
            const salt = Date.now().toString();
            const signStr = this.settings.baiduAppId + text + salt + this.settings.baiduApiKey;
            const sign = crypto_node.createHash('md5').update(signStr).digest('hex');

            const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=zh&to=en&appid=${this.settings.baiduAppId}&salt=${salt}&sign=${sign}`;

            const response = await requestUrl({ url });
            const data = response.json;

            if (data.error_code) {
                console.error('Baidu Translate Error:', data);
                new Notice(`Baidu Translate Error: ${data.error_msg}`);
                return "";
            }

            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result[0].dst;
            }
        } catch (error) {
            console.error('Translation failed:', error);
            new Notice('Translation failed. Check console for details.');
        }
        return "";
    }

    postProcessSlug(text: string): string {
        let words = text.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 0);

        if (this.settings.removeStopWords) {
            const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from']);
            words = words.filter(w => !stopWords.has(w));
        }

        if (this.settings.maxSlugWords > 0) {
            words = words.slice(0, this.settings.maxSlugWords);
        }

        return words.join('-') || 'slug';
    }

    convertToPinyinInitials(text: string): string {
        // Use pinyin-pro to get initials
        const initials = pinyin(text, { pattern: 'initial', type: 'array', nonZh: 'spaced' });
        return initials.join('').toLowerCase().replace(/[^a-z0-9]/g, '') || 'slug';
    }

    async updateStatusBar() {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') {
            this.statusBarItemEl.empty();
            this.statusBarItemEl.style.display = 'none';
            return;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        if (!frontmatter || frontmatter.publish === undefined) {
            this.statusBarItemEl.empty();
            this.statusBarItemEl.style.display = 'none';
            return;
        }

        this.statusBarItemEl.empty();
        this.statusBarItemEl.style.display = 'inline-flex';
        this.statusBarItemEl.style.alignItems = 'center';
        this.statusBarItemEl.style.gap = '4px';

        let iconId = '';
        let statusText = '';
        let color = '';

        if (frontmatter.publish === false) {
            iconId = 'circle';
            statusText = 'Unpublished';
            color = 'var(--text-muted)';
        } else {
            const content = await this.app.vault.read(file);
            const currentHash = await this.computeHash(content);
            const savedHash = this.settings.postHashes[file.path];

            if (currentHash !== savedHash) {
                iconId = 'alert-circle';
                statusText = 'Unsynced';
                color = 'var(--text-warning)';
            } else {
                iconId = 'check-circle';
                statusText = 'Published';
                color = 'var(--text-success)';
            }
        }

        const iconEl = this.statusBarItemEl.createSpan();
        setIcon(iconEl, iconId);
        iconEl.style.color = color;
        iconEl.style.display = 'flex';

        const textEl = this.statusBarItemEl.createSpan({ text: statusText });
        textEl.style.color = color;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<HexoIntegrationSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

interface HexoCommand {
    label: string;
    callback: () => void;
}

class HexoCommandModal extends SuggestModal<HexoCommand> {
    plugin: HexoIntegration;

    constructor(app: App, plugin: HexoIntegration) {
        super(app);
        this.plugin = plugin;
        this.setPlaceholder("Search for a Hexo command...");
    }

    getSuggestions(query: string): HexoCommand[] {
        const activeFile = this.app.workspace.getActiveFile();
        const commands: HexoCommand[] = [
            {
                label: "Create new Hexo Post",
                callback: () => this.plugin.createHexoPost()
            },
            {
                label: "Generate Hexo Pages",
                callback: () => this.plugin.hexoGenerate()
            },
            {
                label: "Start Hexo Server",
                callback: () => this.plugin.hexoServer()
            },
            {
                label: "Deploy Hexo Pages",
                callback: () => this.plugin.hexoDeploy()
            },
            {
                label: "Generate Slug",
                callback: async () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        const generatedSlug = await this.plugin.generateSlug(activeFile.basename);
                        if (generatedSlug) {
                            await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                                fm.slug = generatedSlug;
                            });
                            new Notice(`Generated slug: ${generatedSlug}`);
                        }
                    }
                }
            }
        ];

        if (activeFile && activeFile.extension === "md") {
            commands.push({
                label: "Publish current post",
                callback: () => this.plugin.publishPost(activeFile)
            });
            commands.push({
                label: "Convert current file to Hexo format",
                callback: () => this.plugin.convertToHexo(activeFile)
            });
        }

        return commands.filter((command) =>
            command.label.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(command: HexoCommand, el: HTMLElement) {
        el.createEl("div", { text: command.label });
    }

    onChooseSuggestion(command: HexoCommand, evt: MouseEvent | KeyboardEvent) {
        command.callback();
    }
}


