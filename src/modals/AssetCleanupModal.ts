import { App, Modal, Setting, Notice } from 'obsidian';
import * as fs from 'fs';
import * as pathNode from 'path';

export interface UnusedAsset {
    filePath: string;
    fileName: string;
    noteTitle: string;
}

export class AssetCleanupModal extends Modal {
    constructor(
        app: App,
        private unusedAssets: UnusedAsset[],
        private onConfirm: () => Promise<void>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Unused Assets Cleanup' });

        if (this.unusedAssets.length === 0) {
            contentEl.createEl('p', { text: 'No unused images found.' });
            return;
        }

        contentEl.createEl('p', { text: `Found ${this.unusedAssets.length} unused images. Are you sure you want to delete them?` });

        const listContainer = contentEl.createDiv({ cls: 'hexo-cleanup-list' });
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.border = '1px solid var(--background-modifier-border)';
        listContainer.style.padding = '8px';
        listContainer.style.marginBottom = '16px';

        this.unusedAssets.forEach(asset => {
            const item = listContainer.createDiv();
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.padding = '4px 0';

            item.createSpan({ text: asset.fileName, cls: 'hexo-cleanup-filename' });
            item.createSpan({ text: `(${asset.noteTitle})`, cls: 'hexo-cleanup-note' }).style.color = 'var(--text-muted)';
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Delete All')
                .setWarning()
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Deleting...');
                    await this.onConfirm();
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
