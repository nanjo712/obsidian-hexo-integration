import { App, Modal, Notice, Plugin, TFile, TAbstractFile, SuggestModal, addIcon, setIcon, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, HexoIntegrationSettings, HexoIntegrationSettingTab } from "./settings";
import { PermalinkService } from './services/PermalinkService';
import { HexoService } from './services/HexoService';
import { SyncService } from './services/SyncService';
import { ImageService } from './services/ImageService';
import { PostService } from './services/PostService';
import { LinkService } from './services/LinkService';
import { HexoManagementView, HEXO_VIEW_TYPE } from './views/HexoManagementView';

export default class HexoIntegration extends Plugin {
    settings: HexoIntegrationSettings;
    statusBarItemEl: HTMLElement;

    permalinkService: PermalinkService;
    hexoService: HexoService;
    syncService: SyncService;
    imageService: ImageService;
    postService: PostService;

    async onload() {
        await this.loadSettings();

        // Initialize Services
        this.permalinkService = new PermalinkService(this.settings);
        this.hexoService = new HexoService(this.app, this.settings);
        this.syncService = new SyncService(this.app, this.settings);
        this.imageService = new ImageService(this.app, this.settings);
        const linkService = new LinkService(this.app);
        this.postService = new PostService(this.app, this.settings, this.permalinkService, this.syncService, this.imageService, linkService);

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
            id: 'generate-permalink',
            name: 'Generate Permalink for current post',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const generatedPermalink = await this.permalinkService.generatePermalink(activeFile.basename);
                    if (generatedPermalink) {
                        await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                            fm.permalink = generatedPermalink;
                        });
                        new Notice(`Generated permalink: ${generatedPermalink}`);
                    }
                }
            }
        });

        this.addSettingTab(new HexoIntegrationSettingTab(this.app, this));

        this.registerView(HEXO_VIEW_TYPE, (leaf) => new HexoManagementView(leaf, this));

        this.addCommand({
            id: 'open-hexo-management-view',
            name: 'Open Hexo Management View',
            callback: () => this.activateView(),
        });

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

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(HEXO_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0]!;
        } else {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: HEXO_VIEW_TYPE, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
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
                label: "Open Hexo Management View",
                callback: () => this.plugin.activateView()
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
                label: "Generate Permalink",
                callback: async () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        const generatedPermalink = await this.plugin.permalinkService.generatePermalink(activeFile.basename);
                        if (generatedPermalink) {
                            await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                                fm.permalink = generatedPermalink;
                            });
                            new Notice(`Generated permalink: ${generatedPermalink}`);
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
