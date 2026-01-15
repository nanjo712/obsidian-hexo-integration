import { ItemView, WorkspaceLeaf, TFile, Notice, setIcon } from "obsidian";
import HexoIntegration from "../main";

export const HEXO_VIEW_TYPE = "hexo-management-view";

export class HexoManagementView extends ItemView {
    plugin: HexoIntegration;
    private isRendering = false;

    constructor(leaf: WorkspaceLeaf, plugin: HexoIntegration) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return HEXO_VIEW_TYPE;
    }

    getDisplayText() {
        return "Hexo Dashboard";
    }

    getIcon() {
        return "hexo-logo";
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("hexo-management-view");

        this.registerEvent(this.app.vault.on("modify", (file) => {
            if (file instanceof TFile && file.extension === 'md') this.render();
        }));
        this.registerEvent(this.app.vault.on("rename", () => this.render()));
        this.registerEvent(this.app.vault.on("delete", () => this.render()));

        await this.render();
    }

    async render() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            const { contentEl } = this;
            contentEl.empty();

            const header = contentEl.createDiv({ cls: "hexo-view-header" });
            header.createEl("h4", { text: "Hexo Dashboard" });

            const actions = contentEl.createDiv({ cls: "hexo-view-actions" });

            const posts = await this.getPostsByStatus();
            const pendingCount = posts.drafts.length + posts.unsynced.length;

            const bulkPublishBtn = actions.createEl("button", {
                text: `Bulked Publish (${pendingCount})`,
                cls: "mod-cta"
            });
            setIcon(bulkPublishBtn, "zap");
            bulkPublishBtn.disabled = pendingCount === 0;
            bulkPublishBtn.onclick = () => this.bulkPublish([...posts.unsynced, ...posts.drafts]);

            const refreshBtn = actions.createEl("button", { text: "Refresh" });
            setIcon(refreshBtn, "refresh-cw");
            refreshBtn.onclick = () => this.render();

            if (posts.unsynced.length === 0 && posts.drafts.length === 0 && posts.published.length === 0) {
                this.renderEmptyState(contentEl);
            } else {
                this.renderSection("Unsynced (Modified)", posts.unsynced, "modified", false);
                this.renderSection("Drafts", posts.drafts, "new", false);
                this.renderSection("Published", posts.published, "published", true);
            }
        } finally {
            this.isRendering = false;
        }
    }

    renderEmptyState(container: HTMLElement) {
        const empty = container.createDiv({ cls: "hexo-empty-state" });
        const icon = empty.createDiv({ cls: "hexo-empty-state-icon" });
        setIcon(icon, "check-circle");
        empty.createEl("div", { text: "No Hexo posts found in vault.", cls: "hexo-empty-state-text" });
    }

    async getPostsByStatus() {
        const unsynced: TFile[] = [];
        const drafts: TFile[] = [];
        const published: TFile[] = [];

        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            if (this.plugin.syncService.isHexoFormat(file)) {
                const status = await this.plugin.syncService.getSyncStatus(file);
                if (status === 'unsynced') unsynced.push(file);
                else if (status === 'unpublished') drafts.push(file);
                else if (status === 'published') published.push(file);
            }
        }
        return { unsynced, drafts, published };
    }

    renderSection(title: string, files: TFile[], type: 'modified' | 'new' | 'published', isFolded: boolean) {
        if (files.length === 0) return;

        const { contentEl } = this;
        const details = contentEl.createEl("details", { cls: "hexo-view-section" });
        if (!isFolded) details.setAttribute("open", "true");

        const summary = details.createEl("summary");
        const icon = summary.createSpan({ cls: "folding-icon" });
        setIcon(icon, "chevron-right");

        const header = summary.createEl("h5");
        const typeIcon = header.createSpan();
        let iconName = 'file-text';
        if (type === 'modified') iconName = 'file-edit';
        else if (type === 'new') iconName = 'file-plus';
        else if (type === 'published') iconName = 'file-check';
        setIcon(typeIcon, iconName);
        header.createSpan({ text: `${title} (${files.length})` });

        const list = details.createDiv({ cls: "hexo-post-list" });
        files.forEach(file => {
            const card = list.createDiv({ cls: "hexo-post-card" });

            const cardHeader = card.createDiv({ cls: "hexo-post-card-header" });
            const name = cardHeader.createDiv({ text: file.basename, cls: "hexo-post-title" });
            name.onclick = (e) => {
                e.stopPropagation();
                this.app.workspace.getLeaf().openFile(file);
            };

            const badge = cardHeader.createSpan({
                text: type === 'modified' ? 'Modified' : (type === 'new' ? 'Draft' : 'Published'),
                cls: `hexo-status-badge ${type}`
            });

            if (type !== 'published') {
                const cardFooter = card.createDiv({ cls: "hexo-post-card-footer" });
                const publishBtn = cardFooter.createEl("button", { text: "Publish", cls: "mod-small" });
                setIcon(publishBtn, "upload");
                publishBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await this.plugin.postService.publishPost(file, async () => {
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                        this.render();
                    });
                };
            }
        });
    }

    async bulkPublish(files: TFile[]) {
        if (files.length === 0) {
            new Notice("No posts to publish.");
            return;
        }

        new Notice(`Bulk publishing ${files.length} posts...`);
        for (const file of files) {
            try {
                await this.plugin.postService.publishPost(file, async () => {
                    await this.plugin.saveSettings();
                });
            } catch (e) {
                console.error(`Failed to publish ${file.path}:`, e);
            }
        }
        this.plugin.updateStatusBar();
        this.render();
        new Notice("Bulk publish completed.");
    }

    async onClose() {
        // Nothing to clean up
    }
}
