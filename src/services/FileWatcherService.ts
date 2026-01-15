import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import * as chokidar from 'chokidar';
import * as pathNode from 'path';
import * as fs from 'fs/promises';

export class FileWatcherService {
    private watcher: chokidar.FSWatcher | null = null;

    constructor(
        private app: App,
        private settings: HexoIntegrationSettings,
        private updateStatusBar: () => void
    ) { }

    async start() {
        this.stop();

        if (!this.settings.hexoRoot) return;

        const postsPath = pathNode.join(this.settings.hexoRoot, 'source', '_posts');

        // Perform initial integrity scan when the layout is ready
        this.app.workspace.onLayoutReady(async () => {
            await this.performFullScan(postsPath);
        });

        this.watcher = chokidar.watch(postsPath, {
            persistent: true,
            ignoreInitial: true,
            depth: 0,
            usePolling: true, // Sometimes helps on network drives or certain OS configs
            interval: 100,
            binaryInterval: 300
        });

        this.watcher.on('unlink', (filePath) => {
            this.handleUnlink(filePath);
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

    private async performFullScan(postsPath: string) {
        const keysToRemove: string[] = [];

        for (const obsidianPath in this.settings.postHashes) {
            const hexoFileName = this.settings.pathMapping[obsidianPath];
            if (!hexoFileName) {
                // Mapping missing, likely legacy
                keysToRemove.push(obsidianPath);
                continue;
            }

            const hexoFilePath = pathNode.join(postsPath, hexoFileName);

            try {
                await fs.access(hexoFilePath);
            } catch (error) {
                // File doesn't exist in Hexo
                keysToRemove.push(obsidianPath);
            }
        }

        if (keysToRemove.length > 0) {
            await this.processDeletion(keysToRemove, `Startup scan: ${keysToRemove.length} post(s) found missing in Hexo.`);
        }
    }

    private async handleUnlink(hexoFilePath: string) {
        const fileName = pathNode.basename(hexoFilePath);
        const keysToRemove: string[] = [];

        for (const obsidianPath in this.settings.pathMapping) {
            if (this.settings.pathMapping[obsidianPath] === fileName) {
                keysToRemove.push(obsidianPath);
            }
        }

        if (keysToRemove.length > 0) {
            await this.processDeletion(keysToRemove, `Hexo file ${fileName} removed.`);
        }
    }

    private async processDeletion(obsidianPaths: string[], reason: string) {
        let updatedCount = 0;
        const markdownFiles = this.app.vault.getMarkdownFiles();

        for (const obsidianPath of obsidianPaths) {
            // Normalize path for matching (Obsidian paths use forward slashes)
            const normalizedPath = obsidianPath.replace(/\\/g, '/');

            let file = this.app.vault.getAbstractFileByPath(normalizedPath);

            if (!file) {
                // Fallback 1: Try finding in the file list directly
                file = markdownFiles.find(f => f.path === normalizedPath) || null;
            }

            if (!file) {
                // Fallback 2: Handle potential encoding issues (NFC vs NFD)
                const nfcPath = normalizedPath.normalize('NFC');
                const nfdPath = normalizedPath.normalize('NFD');
                file = markdownFiles.find(f => f.path === nfcPath || f.path === nfdPath) || null;
            }

            if (file instanceof TFile) {
                try {
                    await this.app.fileManager.processFrontMatter(file, (fm) => {
                        fm.published = false;
                    });
                    updatedCount++;
                } catch (e) {
                    console.error(`Hexo Integration: Failed to update frontmatter for [${file.path}]:`, e);
                }
            }

            delete this.settings.postHashes[obsidianPath];
            delete this.settings.pathMapping[obsidianPath];
        }

        if (obsidianPaths.length > 0) {
            this.app.workspace.trigger('hexo-integration:sync-change');
            this.updateStatusBar();
            const message = `${reason} ${updatedCount} note(s) updated to Draft status.`;
            new Notice(message);
        }
    }
}
