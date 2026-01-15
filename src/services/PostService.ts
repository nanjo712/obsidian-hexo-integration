import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import { PermalinkService } from './PermalinkService';
import { SyncService } from './SyncService';
import { ImageService } from './ImageService';
import { LinkService } from './LinkService';
import { FilenameService } from './FilenameService';
import * as fs from 'fs';
import * as pathNode from 'path';

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

    async createHexoPost() {
        const template = `---
title: 
slug: 
date: ${this.getFormattedDate()}
tags: 
published: false
---

# 
`;
        const file = await this.app.vault.create(`${this.getFormattedDate()}-new-post.md`, template);
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
    }

    private getFormattedDate(): string {
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
        const generatedPermalink = await this.permalinkService.generatePermalink(file.basename);
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (!frontmatter.title) frontmatter.title = file.basename;
            if (!frontmatter.permalink) frontmatter.permalink = generatedPermalink;
            if (!frontmatter.date) frontmatter.date = this.getFormattedDate();
            if (!frontmatter.tags) frontmatter.tags = [];
            if (frontmatter.published === undefined) frontmatter.published = false;
        });
        new Notice(`Converted ${file.name} to Hexo format.`);
    }

    async publishPost(file: TFile, onComplete: () => Promise<void>) {
        if (!this.settings.hexoRoot) {
            new Notice('Error: Hexo root directory not configured.');
            return;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter;


        const isHexoFormat = frontmatter && 'title' in frontmatter && 'date' in frontmatter && 'tags' in frontmatter && 'published' in frontmatter;
        if (!isHexoFormat) {
            await this.convertToHexo(file);
        }

        await this.app.fileManager.processFrontMatter(file, (fm) => {
            fm.published = true;
        });

        try {
            const targetDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
            if (!fs.existsSync(targetDir)) {
                new Notice(`Error: Target directory ${targetDir} does not exist.`);
                return;
            }

            let content = await this.app.vault.read(file);
            const originalContent = content;

            const processedFiles = new Set<string>();

            // Handle cover image
            const coverField = this.settings.coverFieldName || 'cover';
            if (frontmatter && frontmatter[coverField]) {
                const coverValue = frontmatter[coverField];
                const newCoverValue = await this.imageService.handleCoverImage(file, String(coverValue), processedFiles);
                if (newCoverValue) {
                    // Update only the published content's frontmatter (non-destructive to original file)
                    const coverRegex = new RegExp(`^${coverField}:.*$`, 'm');
                    content = content.replace(coverRegex, `${coverField}: ${newCoverValue}`);
                }
            }

            content = await this.imageService.processImages(file, content, processedFiles);
            content = await this.linkService.transformLinks(content, file);

            // Determine target Hexo filename
            let hexoFileName = this.settings.pathMapping[file.path];
            if (!hexoFileName) {
                const sanitized = this.filenameService.sanitize(file.name);
                hexoFileName = this.filenameService.getUniqueFilename(targetDir, sanitized);
                this.settings.pathMapping[file.path] = hexoFileName;
            }

            fs.writeFileSync(pathNode.join(targetDir, hexoFileName), content);
            new Notice(`Published ${file.name} to Hexo as ${hexoFileName}.`);

            this.settings.postHashes[file.path] = await this.syncService.computeHash(originalContent);
            await onComplete();
        } catch (error: any) {
            console.error(error);
            new Notice(`Error publishing: ${error.message}`);
        }
    }

    async syncRename(file: TFile, oldPath: string) {
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
                new Notice(`Renamed Hexo post to ${newHexoFileName}`);
            }

            // Update mapping and hashes
            this.settings.pathMapping[file.path] = newHexoFileName;
            this.settings.postHashes[file.path] = oldHash;

            delete this.settings.postHashes[oldPath];
            delete this.settings.pathMapping[oldPath];
        } catch (error: any) {
            console.error('Hexo Integration: Rename sync failed', error);
            new Notice(`Failed to rename Hexo post: ${error.message}`);
        }
    }
}
