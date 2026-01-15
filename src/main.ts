import { App, Modal, Notice, Plugin, TFile, TAbstractFile, SuggestModal, addIcon, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, HexoIntegrationSettings, HexoIntegrationSettingTab } from "./settings";
import { SlugService } from './services/SlugService';
import { HexoService } from './services/HexoService';
import { SyncService } from './services/SyncService';
import { ImageService } from './services/ImageService';
import { PostService } from './services/PostService';

export default class HexoIntegration extends Plugin {
    settings: HexoIntegrationSettings;
    statusBarItemEl: HTMLElement;

    slugService: SlugService;
    hexoService: HexoService;
    syncService: SyncService;
    imageService: ImageService;
    postService: PostService;

    async onload() {
        await this.loadSettings();

        // Initialize Services
        this.slugService = new SlugService(this.settings);
        this.hexoService = new HexoService(this.settings);
        this.syncService = new SyncService(this.app, this.settings);
        this.imageService = new ImageService(this.app, this.settings);
        this.postService = new PostService(this.app, this.settings, this.slugService, this.syncService, this.imageService);

        // Register custom Hexo icon
        addIcon('hexo-logo', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.02 0L1.596 6.02l-.02 12L11.978 24l10.426-6.02.02-12zm4.828 17.14l-.96.558-.969-.574V12.99H9.081v4.15l-.96.558-.969-.574V6.854l.964-.552.965.563v4.145h5.838V6.86l.965-.552.964.563z"/></svg>');

        this.statusBarItemEl = this.addStatusBarItem();
        this.statusBarItemEl.addClass('mod-clickable');
        this.statusBarItemEl.setAttribute('aria-label', 'Publish to Hexo');

        this.statusBarItemEl.onClickEvent(async () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                await this.postService.publishPost(activeFile, async () => {
                    await this.saveSettings();
                    this.updateStatusBar();
                });
            }
        });

        this.addRibbonIcon('hexo-logo', 'Hexo Integration', (evt: MouseEvent) => {
            new HexoCommandModal(this.app, this).open();
        });

        this.addCommand({
            id: 'create-hexo-post',
            name: 'Create new Hexo Post',
            callback: () => this.postService.createHexoPost()
        });

        this.addCommand({
            id: 'convert-to-hexo',
            name: 'Convert current file to Hexo format',
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) this.postService.convertToHexo(activeFile);
            }
        });

        this.addCommand({
            id: 'publish-hexo-post',
            name: 'Publish current post',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    await this.postService.publishPost(activeFile, async () => {
                        await this.saveSettings();
                        this.updateStatusBar();
                    });
                }
            }
        });

        this.addCommand({
            id: 'hexo-generate',
            name: 'Generate Hexo Pages',
            callback: () => this.hexoService.hexoGenerate()
        });

        this.addCommand({
            id: 'hexo-server',
            name: 'Start Hexo Server',
            callback: () => this.hexoService.hexoServer()
        });

        this.addCommand({
            id: 'hexo-deploy',
            name: 'Deploy Hexo Pages',
            callback: () => this.hexoService.hexoDeploy()
        });

        this.addCommand({
            id: 'generate-slug',
            name: 'Generate Slug for current post',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const generatedSlug = await this.slugService.generateSlug(activeFile.basename);
                    if (generatedSlug) {
                        await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                            fm.slug = generatedSlug;
                        });
                        new Notice(`Generated slug: ${generatedSlug}`);
                    }
                }
            }
        });

        this.addSettingTab(new HexoIntegrationSettingTab(this.app, this));

        this.registerEvent(this.app.workspace.on('file-open', () => this.updateStatusBar()));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file === this.app.workspace.getActiveFile()) {
                this.updateStatusBar();
            }
        }));
        this.registerEvent(this.app.vault.on('rename', () => this.updateStatusBar()));
        this.registerEvent(this.app.vault.on('delete', () => this.updateStatusBar()));

        this.updateStatusBar();
    }

    onunload() { }

    async updateStatusBar() {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md' || !this.syncService.isHexoFormat(file)) {
            this.statusBarItemEl.empty();
            this.statusBarItemEl.style.display = 'none';
            return;
        }

        const status = await this.syncService.getSyncStatus(file);
        this.statusBarItemEl.style.display = 'inline-flex';
        this.statusBarItemEl.style.alignItems = 'center';
        this.statusBarItemEl.empty();

        let icon = 'circle';
        let color = '--text-muted';
        let statusText = 'Unpublished';

        if (status === 'published') {
            icon = 'check-circle';
            color = '--text-success';
            statusText = 'Published';
        } else if (status === 'unsynced') {
            icon = 'alert-circle';
            color = '--text-warning';
            statusText = 'Unsynced';
        }

        const container = this.statusBarItemEl.createSpan({ cls: 'hexo-status-bar-container' });
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '4px';

        const iconEl = container.createSpan();
        setIcon(iconEl, icon);
        iconEl.style.color = `var(${color})`;
        iconEl.style.display = 'flex';
        iconEl.style.alignItems = 'center';

        const textEl = container.createSpan();
        textEl.setText(statusText);
        textEl.style.fontSize = '0.8em';
        textEl.style.color = `var(${color})`;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
        const commands = [
            {
                label: "Publish current post",
                callback: async () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.postService.publishPost(activeFile, async () => {
                            await this.plugin.saveSettings();
                            this.plugin.updateStatusBar();
                        });
                    }
                }
            },
            {
                label: "Generate Hexo Pages",
                callback: () => this.plugin.hexoService.hexoGenerate()
            },
            {
                label: "Start Hexo Server",
                callback: () => this.plugin.hexoService.hexoServer()
            },
            {
                label: "Deploy Hexo Pages",
                callback: () => this.plugin.hexoService.hexoDeploy()
            },
            {
                label: "Generate Slug",
                callback: async () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        const generatedSlug = await this.plugin.slugService.generateSlug(activeFile.basename);
                        if (generatedSlug) {
                            await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                                fm.slug = generatedSlug;
                            });
                            new Notice(`Generated slug: ${generatedSlug}`);
                        }
                    }
                }
            },
            {
                label: "Create new Hexo Post",
                callback: () => this.plugin.postService.createHexoPost()
            },
            {
                label: "Convert current file to Hexo format",
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) this.plugin.postService.convertToHexo(activeFile);
                }
            }
        ];

        return commands.filter(command =>
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
