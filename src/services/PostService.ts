import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import { PermalinkService } from './PermalinkService';
import { SyncService } from './SyncService';
import { ImageService } from './ImageService';
import { LinkService } from './LinkService';
import { FilenameService } from './FilenameService';
import * as fs from 'fs';
import * as pathNode from 'path';
import { AssetCleanupModal, UnusedAsset } from '../modals/AssetCleanupModal';
import { t } from '../i18n/helpers';

export class PostService {
    constructor(
        private app: App,
        private settings: HexoIntegrationSettings,
        private permalinkService: PermalinkService,
        private syncService: SyncService,
        private imageService: ImageService,
        private linkService: LinkService,
        private filenameService: FilenameService
    ) { }

    private getFormattedDate(date: Date = new Date()): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    private applyAutoExcerpt(content: string): string {
        // Find end of frontmatter
        const firstSep = content.indexOf('---');
        if (firstSep === -1) return content;
        const secondSep = content.indexOf('---', firstSep + 3);
        if (secondSep === -1) return content;

        const frontmatter = content.substring(0, secondSep + 3);
        const body = content.substring(secondSep + 3);

        const lines = body.split('\n');
        let firstContentLineIndex = -1;
        let endOfFirstParagraphIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line === undefined) continue;
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
                if (firstContentLineIndex === -1) {
                    firstContentLineIndex = i;
                }
            } else if (firstContentLineIndex !== -1 && trimmedLine.length === 0) {
                endOfFirstParagraphIndex = i;
                break;
            }
        }

        if (endOfFirstParagraphIndex !== -1) {
            lines.splice(endOfFirstParagraphIndex, 0, '<!--more-->');
            return frontmatter + lines.join('\n');
        } else if (firstContentLineIndex !== -1) {
            // Only one paragraph
            return frontmatter + body.trimEnd() + '\n\n<!--more-->\n';
        }

        return content;
    }

    async convertToHexo(file: TFile) {
        const creationTime = new Date(file.stat.ctime);
        const generatedPermalink = await this.permalinkService.generatePermalink(file.basename);
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            if (!frontmatter.title) frontmatter.title = file.basename;
            if (!frontmatter.date) frontmatter.date = this.getFormattedDate(creationTime);
            if (!frontmatter.tags) frontmatter.tags = [];
            if (this.settings.permalinkStyle != 'manual' && !frontmatter.permalink) frontmatter.permalink = generatedPermalink;
            if (frontmatter.published === undefined) frontmatter.published = false;
        });
        new Notice(t('NOTICE_CONVERT_SUCCESS', { fileName: file.name }));
    }

    async publishPost(file: TFile, onComplete: () => Promise<void>) {
        if (!this.settings.hexoRoot) {
            new Notice(t('NOTICE_HEXO_ROOT_NOT_SET'));
            return;
        }
        if (!this.settings.baiduAppId || !this.settings.baiduApiKey) {
            new Notice('Baidu app ID or API key not configured');
            return;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter;


        const isHexoFormat = frontmatter && 'title' in frontmatter && 'date' in frontmatter && 'tags' in frontmatter && 'published' in frontmatter;
        if (!isHexoFormat) {
            await this.convertToHexo(file);
        }

        await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
            fm.published = true;
        });

        try {
            const targetDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
            if (!fs.existsSync(targetDir)) {
                new Notice(t('NOTICE_TARGET_DIR_NOT_EXIST', { targetDir }));
                return;
            }

            // Determine target Hexo filename
            let hexoFileName: string;
            const existingMapping = this.settings.pathMapping[file.path];
            if (!existingMapping) {
                const sanitized = this.filenameService.sanitize(file.name);
                hexoFileName = this.filenameService.getUniqueFilename(targetDir, sanitized);
                this.settings.pathMapping[file.path] = hexoFileName;
            } else {
                hexoFileName = existingMapping;
            }

            let content = await this.app.vault.read(file);
            const originalContent = content;

            const processedFiles = new Set<string>();

            // Handle cover image
            const coverField = this.settings.coverFieldName || 'cover';
            if (frontmatter && frontmatter[coverField]) {
                const coverValue = frontmatter[coverField] as string;
                const newCoverValue = await this.imageService.handleCoverImage(file, coverValue, processedFiles);
                if (newCoverValue) {
                    // Update only the published content's frontmatter (non-destructive to original file)
                    const coverRegex = new RegExp(`^${coverField}:.*$`, 'm');
                    content = content.replace(coverRegex, `${coverField}: ${newCoverValue}`);
                }
            }

            content = await this.imageService.processImages(file, content, processedFiles);
            content = this.linkService.transformLinks(content, file);

            if (this.settings.autoExcerpt && !/<!--\s*more\s*-->/.test(content)) {
                content = this.applyAutoExcerpt(content);
            }

            fs.writeFileSync(pathNode.join(targetDir, hexoFileName), content);
            new Notice(t('NOTICE_PUBLISH_SUCCESS', { fileName: file.name, hexoName: hexoFileName }));

            this.settings.postHashes[file.path] = await this.syncService.computeHash(originalContent);
            await onComplete();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(t('NOTICE_PUBLISH_ERROR', { message }));
        }
    }

    syncRename(file: TFile, oldPath: string) {
        if (!this.settings.hexoRoot) return;

        const oldHash = this.settings.postHashes[oldPath];
        const oldHexoFileName = this.settings.pathMapping[oldPath];

        if (!oldHash || !oldHexoFileName) {
            // If it wasn't published, clear stale entries if they exist
            delete this.settings.postHashes[oldPath];
            delete this.settings.pathMapping[oldPath];
            return;
        }

        try {
            const postsDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
            const oldHexoPath = pathNode.join(postsDir, oldHexoFileName);

            // Generate new sanitized filename
            const sanitized = this.filenameService.sanitize(file.name);
            const newHexoFileName = this.filenameService.getUniqueFilename(postsDir, sanitized);
            const newHexoPath = pathNode.join(postsDir, newHexoFileName);

            if (fs.existsSync(oldHexoPath)) {
                fs.renameSync(oldHexoPath, newHexoPath);
                new Notice(t('NOTICE_RENAME_SUCCESS', { fileName: newHexoFileName }));
            }

            // Update mapping and hashes
            this.settings.pathMapping[file.path] = newHexoFileName;
            this.settings.postHashes[file.path] = oldHash;

            delete this.settings.postHashes[oldPath];
            delete this.settings.pathMapping[oldPath];
        } catch (error) {
            console.error('Hexo Integration: Rename sync failed', error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(t('NOTICE_RENAME_ERROR', { message }));
        }
    }

    async cleanAssets(file: TFile) {
        if (!this.syncService.isHexoFile(file)) {
            new Notice(t('NOTICE_NOT_HEXO_FORMAT'));
            return;
        }

        const unused = this.imageService.getUnusedImages(file);
        const assetDir = this.imageService.getAssetFolderPath(file);

        if (unused.length === 0 || !assetDir) {
            new Notice(t('NOTICE_NO_UNUSED_ASSETS', { fileName: file.basename }));
            return;
        }

        const items: UnusedAsset[] = unused.map((name: string) => ({
            fileName: name,
            filePath: pathNode.join(assetDir, name),
            noteTitle: file.basename
        }));

        new AssetCleanupModal(this.app, items, () => {
            items.forEach(item => fs.unlinkSync(item.filePath));
            new Notice(t('NOTICE_DELETE_ASSETS_SUCCESS', { count: String(items.length), fileName: file.basename }));
        }).open();
    }

    async cleanAllAssets() {
        const files = this.app.vault.getMarkdownFiles();
        let allUnused: UnusedAsset[] = [];

        new Notice(t('NOTICE_SCANNING_ASSETS'));

        for (const file of files) {
            if (this.syncService.isHexoFile(file)) {
                const unused = this.imageService.getUnusedImages(file);
                const assetDir = this.imageService.getAssetFolderPath(file);
                if (assetDir && unused.length > 0) {
                    allUnused = allUnused.concat(unused.map((name: string) => ({
                        fileName: name,
                        filePath: pathNode.join(assetDir, name),
                        noteTitle: file.basename
                    })));
                }
            }
        }

        if (allUnused.length === 0) {
            new Notice(t('NOTICE_NO_UNUSED_ASSETS_GLOBAL'));
            return;
        }

        new AssetCleanupModal(this.app, allUnused, () => {
            allUnused.forEach(item => fs.unlinkSync(item.filePath));
            new Notice(t('NOTICE_CLEANUP_COMPLETED', { count: String(allUnused.length) }));
        }).open();
    }
}
