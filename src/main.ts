import { App, Notice, Plugin, TFile, SuggestModal, addIcon, setIcon, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, HexoIntegrationSettings, HexoIntegrationSettingTab } from "./settings";
import { PermalinkService } from './services/PermalinkService';
import { HexoService } from './services/HexoService';
import { SyncService } from './services/SyncService';
import { ImageService } from './services/ImageService';
import { PostService } from './services/PostService';
import { LinkService } from './services/LinkService';
import { FilenameService } from './services/FilenameService';
import { FileWatcherService } from './services/FileWatcherService';
import { HexoManagementView, HEXO_VIEW_TYPE } from './views/HexoManagementView';
import { t } from './i18n/helpers';

export default class HexoIntegration extends Plugin {
    settings: HexoIntegrationSettings;
    statusBarItemEl: HTMLElement;

    permalinkService: PermalinkService;
    hexoService: HexoService;
    syncService: SyncService;
    imageService: ImageService;
    postService: PostService;
    filenameService: FilenameService;
    fileWatcherService: FileWatcherService;

    async onload() {
        await this.loadSettings();

        // Initialize Services
        this.permalinkService = new PermalinkService(this.settings);
        this.hexoService = new HexoService(this.app, this.settings);
        this.syncService = new SyncService(this.app, this.settings);
        this.imageService = new ImageService(this.app, this.settings);
        this.filenameService = new FilenameService(this.app);
        const linkService = new LinkService(this.app);
        this.postService = new PostService(this.app, this.settings, this.permalinkService, this.syncService, this.imageService, linkService, this.filenameService);
        this.fileWatcherService = new FileWatcherService(this.app, this.settings, () => { void this.updateStatusBar(); });

        // Register custom Hexo icon
        addIcon('hexo-logo', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.02 0L1.596 6.02l-.02 12L11.978 24l10.426-6.02.02-12zm4.828 17.14l-.96.558-.969-.574V12.99H9.081v4.15l-.96.558-.969-.574V6.854l.964-.552.965.563v4.145h5.838V6.86l.965-.552.964.563z"/></svg>');

        this.statusBarItemEl = this.addStatusBarItem();
        this.statusBarItemEl.addClass('mod-clickable');
        this.statusBarItemEl.setAttribute('aria-label', t('STATUS_BAR_PUBLISH'));

        this.statusBarItemEl.onClickEvent(() => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.postService.publishPost(activeFile, async () => {
                    await this.saveSettings();
                    await this.updateStatusBar();
                }).catch((err) => {
                    console.error(`Failed to publish ${activeFile.path}:`, err);
                });
            }
        });

        // Start File Watcher
        this.fileWatcherService.start();

        // Auto-start Hexo Server if enabled
        if (this.settings.alwaysKeepServerRunning) {
            this.hexoService.hexoServer();
        }

        this.addRibbonIcon('hexo-logo', t('RIBBON_TOOLTIP'), (evt: MouseEvent) => {
            new HexoCommandModal(this.app, this).open();
        });

        this.addCommand({
            id: 'convert-to-hexo',
            name: t('COMMAND_CONVERT'),
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) { void this.postService.convertToHexo(activeFile); }
            }
        });

        this.addCommand({
            id: 'publish-hexo-post',
            name: t('COMMAND_PUBLISH_POST'),
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.postService.publishPost(activeFile, async () => {
                        await this.saveSettings();
                        await this.updateStatusBar();
                    }).catch((err) => {
                        console.error(`Failed to publish ${activeFile.path}:`, err);
                    });
                }
            }
        });

        this.addCommand({
            id: 'hexo-generate',
            name: t('COMMAND_GENERATE'),
            callback: () => { void this.hexoService.hexoGenerate(); }
        });

        this.addCommand({
            id: 'hexo-server',
            name: t('COMMAND_SERVER'),
            callback: () => { void this.hexoService.hexoServer(); }
        });

        this.addCommand({
            id: 'stop-hexo-server',
            name: t('COMMAND_STOP_SERVER'),
            checkCallback: (checking: boolean) => {
                const isRunning = this.hexoService.isServerRunning();
                if (checking) {
                    return isRunning;
                }
                if (isRunning) {
                    this.hexoService.stopServer();
                }
                return true;
            }
        });

        this.addCommand({
            id: 'hexo-deploy',
            name: t('COMMAND_DEPLOY'),
            callback: () => { void this.hexoService.hexoDeploy(); }
        });

        this.addCommand({
            id: 'generate-permalink',
            name: t('COMMAND_GEN_PERMALINK'),
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const generatedPermalink = await this.permalinkService.generatePermalink(activeFile.basename);
                    if (generatedPermalink) {
                        await this.app.fileManager.processFrontMatter(activeFile, (fm: { [key: string]: unknown }) => {
                            fm.permalink = generatedPermalink;
                        });
                        new Notice(t('NOTICE_GEN_PERMALINK', { permalink: generatedPermalink }));
                    }
                }
            }
        });

        this.addSettingTab(new HexoIntegrationSettingTab(this.app, this));

        this.registerView(HEXO_VIEW_TYPE, (leaf) => new HexoManagementView(leaf, this));

        this.addCommand({
            id: 'open-hexo-management-view',
            name: t('COMMAND_OPEN_VIEW'),
            callback: () => { void this.activateView(); },
        });

        this.addCommand({
            id: 'clean-active-assets',
            name: t('COMMAND_CLEAN_ACTIVE'),
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) { this.postService.cleanAssets(activeFile); }
            }
        });

        this.addCommand({
            id: 'clean-all-assets',
            name: t('COMMAND_CLEAN_ALL'),
            callback: () => { this.postService.cleanAllAssets(); }
        });

        this.registerEvent(this.app.workspace.on('file-open', () => { void this.updateStatusBar(); }));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file === this.app.workspace.getActiveFile()) {
                void this.updateStatusBar();
            }
        }));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file instanceof TFile) {
                void (async () => {
                    this.postService.syncRename(file, oldPath);
                    await this.saveSettings();
                    await this.updateStatusBar();
                })();
            }
        }));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            void (async () => {
                this.postService.syncDelete(file.path);
                await this.saveSettings();
                await this.updateStatusBar();
            })();
        }));

        void this.updateStatusBar();
    }

    onunload() {
        this.fileWatcherService.stop();
        this.hexoService.stopServer();
    }

    async updateStatusBar() {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md' || !this.syncService.isHexoFile(file)) {
            this.statusBarItemEl.empty();
            this.statusBarItemEl.setCssProps({ 'display': 'none' });
            return;
        }

        const status = await this.syncService.getSyncStatus(file);
        this.statusBarItemEl.setCssProps({
            'display': 'inline-flex',
            'align-items': 'center'
        });
        this.statusBarItemEl.empty();

        let icon = 'circle';
        let color = '--text-muted';
        let statusText = t('STATUS_DRAFT');

        if (status === 'published') {
            icon = 'check-circle';
            color = '--text-success';
            statusText = t('STATUS_PUBLISHED');
        } else if (status === 'unsynced') {
            icon = 'alert-circle';
            color = '--text-warning';
            statusText = t('STATUS_UNSYNCED');
        }

        const container = this.statusBarItemEl.createSpan({ cls: 'hexo-status-bar-container' });
        container.setCssProps({
            'display': 'flex',
            'align-items': 'center',
            'gap': '4px'
        });

        const iconEl = container.createSpan();
        setIcon(iconEl, icon);
        iconEl.setCssProps({
            'color': `var(${color})`,
            'display': 'flex',
            'align-items': 'center'
        });

        const textEl = container.createSpan();
        textEl.setText(statusText);
        textEl.setCssProps({
            'font-size': '0.8em',
            'color': `var(${color})`
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as object);
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
            void workspace.revealLeaf(leaf);
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
        this.setPlaceholder(t('SUGGEST_PLACEHOLDER'));
    }

    getSuggestions(query: string): HexoCommand[] {
        const commands = [
            {
                label: t('COMMAND_PUBLISH_POST'),
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        this.plugin.postService.publishPost(activeFile, async () => {
                            await this.plugin.saveSettings();
                            await this.plugin.updateStatusBar();
                        }).catch((err) => {
                            console.error(`Failed to publish ${activeFile.path}:`, err);
                        });
                    }
                }
            },
            {
                label: t('COMMAND_OPEN_VIEW'),
                callback: () => { void this.plugin.activateView(); }
            },
            {
                label: t('COMMAND_GENERATE'),
                callback: () => this.plugin.hexoService.hexoGenerate()
            },
            {
                label: t('COMMAND_SERVER'),
                callback: () => this.plugin.hexoService.hexoServer()
            },
            {
                label: t('COMMAND_STOP_SERVER'),
                callback: () => this.plugin.hexoService.stopServer()
            },
            {
                label: t('COMMAND_DEPLOY'),
                callback: () => this.plugin.hexoService.hexoDeploy()
            },
            {
                label: t('COMMAND_GEN_PERMALINK'),
                callback: () => {
                    void (async () => {
                        const activeFile = this.app.workspace.getActiveFile();
                        if (activeFile) {
                            const generatedPermalink = await this.plugin.permalinkService.generatePermalink(activeFile.basename);
                            if (generatedPermalink) {
                                await this.app.fileManager.processFrontMatter(activeFile, (fm: { [key: string]: unknown }) => {
                                    fm.permalink = generatedPermalink;
                                });
                                new Notice(t('NOTICE_GEN_PERMALINK', { permalink: generatedPermalink }));
                            }
                        }
                    })();
                }
            },
            {
                label: t('COMMAND_CONVERT'),
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) { void this.plugin.postService.convertToHexo(activeFile); }
                }
            },
            {
                label: t('COMMAND_CLEAN_ACTIVE'),
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) { this.plugin.postService.cleanAssets(activeFile); }
                }
            },
            {
                label: t('COMMAND_CLEAN_ALL'),
                callback: () => { this.plugin.postService.cleanAllAssets(); }
            }
        ];

        const filteredCommands = commands.filter(cmd => {
            if (cmd.label === t('COMMAND_STOP_SERVER')) {
                return this.plugin.hexoService.isServerRunning();
            }
            return true;
        });

        return filteredCommands.filter(command =>
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
