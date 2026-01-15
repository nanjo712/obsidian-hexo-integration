import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import * as chokidar from 'chokidar';
import * as pathNode from 'path';

export class FileWatcherService {
    private watcher: chokidar.FSWatcher | null = null;

    constructor(
        private app: App,
        private settings: HexoIntegrationSettings,
        private updateStatusBar: () => void
    ) { }

    start() {
        this.stop();

        if (!this.settings.hexoRoot) return;

        const postsPath = pathNode.join(this.settings.hexoRoot, 'source', '_posts');

        this.watcher = chokidar.watch(postsPath, {
            persistent: true,
            ignoreInitial: true,
            depth: 0
        });

        this.watcher.on('unlink', (filePath) => {
            this.handleFileDeletion(filePath);
        });

        this.watcher.on('unlinkDir', (dirPath) => {
            // Optional: handle directory deletion if assets are stored there
        });
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }

    private async handleFileDeletion(hexoFilePath: string) {
        const fileName = pathNode.basename(hexoFilePath);

        // Find Obsidian files that map to this Hexo filename
        let changed = false;
        const keysToRemove: string[] = [];

        for (const obsidianPath in this.settings.postHashes) {
            const obsidianFileName = pathNode.basename(obsidianPath);
            if (obsidianFileName === fileName) {
                keysToRemove.push(obsidianPath);
            }
        }

        for (const obsidianPath of keysToRemove) {
            const file = this.app.vault.getAbstractFileByPath(obsidianPath);
            if (file instanceof TFile) {
                await this.app.fileManager.processFrontMatter(file, (fm) => {
                    fm.published = false;
                });
            }
            delete this.settings.postHashes[obsidianPath];
            changed = true;
        }

        if (changed) {
            // Trigger UI updates
            this.app.workspace.trigger('hexo-integration:sync-change');
            this.updateStatusBar();
            new Notice(`Hexo file ${fileName} removed. Obsidian note(s) updated to Draft status.`);
        }
    }
}
