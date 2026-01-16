import { App, TFile } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import * as fs from 'fs';
import * as pathNode from 'path';
import { Buffer } from 'buffer';

export class ImageService {
    constructor(private app: App, private settings: HexoIntegrationSettings) { }

    async processImages(file: TFile, content: string, processedFiles: Set<string> = new Set()): Promise<string> {
        const cache = this.app.metadataCache.getFileCache(file);
        const embeds = cache?.embeds || [];
        const assetDir = this.getAssetFolderPath(file);
        if (!assetDir) return content;

        let updatedContent = content;

        for (const embed of embeds) {
            const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);

            if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
                // 1. Copy image (and compress if enabled)
                const finalFilename = await this.ensureImageCopied(linkedFile, assetDir, processedFiles);

                // 2. Dynamically replace this specific link pattern to handle unique Alt texts
                const escapedLink = embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Handle Wikilinks: ![[image.png|alt]]
                const wikiRegex = new RegExp(`!\\[\\[${escapedLink}(\\|(.*?))?\\]\\]`, 'g');
                updatedContent = updatedContent.replace(wikiRegex, (_match, _p1, altText: string | undefined) => {
                    const finalAlt = altText || "";
                    return this.settings.imageSyntax === 'markdown'
                        ? `![${finalAlt}](${finalFilename})`
                        : `{% asset_img ${finalFilename} ${finalAlt} %}`;
                });

                // Handle Markdown links: ![alt](image.png)
                const mdRegex = new RegExp(`!\\[(.*?)\\]\\(${escapedLink}\\)`, 'g');
                updatedContent = updatedContent.replace(mdRegex, (_match, altText: string | undefined) => {
                    const finalAlt = altText || "";
                    return this.settings.imageSyntax === 'markdown'
                        ? `![${finalAlt}](${finalFilename})`
                        : `{% asset_img ${finalFilename} ${finalAlt} %}`;
                });
            }
        }

        return updatedContent;
    }

    async handleCoverImage(file: TFile, coverLink: string, processedFiles: Set<string>): Promise<string | null> {
        if (!coverLink) return null;
        // Strip ![[ ]] and other junk if present
        const cleanLink = (coverLink.replace(/^"?\[\[|\]\]"?$/g, '').split('|')[0] ?? '').trim();
        const linkedFile = this.app.metadataCache.getFirstLinkpathDest(cleanLink, file.path);

        if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
            const assetDir = this.getAssetFolderPath(file);
            if (!assetDir) return null;
            const finalFilename = await this.ensureImageCopied(linkedFile, assetDir, processedFiles);
            return finalFilename;
        }
        return null;
    }

    private async ensureImageCopied(linkedFile: TFile, assetDir: string, processedFiles: Set<string>): Promise<string> {
        let finalName = linkedFile.name;
        if (this.settings.compressImages) {
            finalName = pathNode.parse(linkedFile.name).name + '.webp';
        }

        if (!processedFiles.has(finalName)) {
            if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
            const targetPath = pathNode.join(assetDir, finalName);

            if (this.settings.compressImages) {
                const buffer = await this.app.vault.readBinary(linkedFile);
                const compressed = await this.compressToWebP(buffer, this.settings.webpQuality / 100);
                fs.writeFileSync(targetPath, Buffer.from(compressed));
            } else {
                const imageContent = await this.app.vault.readBinary(linkedFile);
                fs.writeFileSync(targetPath, Buffer.from(imageContent));
            }
            processedFiles.add(finalName);
        }
        return finalName;
    }

    private async compressToWebP(buffer: ArrayBuffer, quality: number): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer]);
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0);
                canvas.toBlob((resultBlob) => {
                    URL.revokeObjectURL(url);
                    if (resultBlob) {
                        void resultBlob.arrayBuffer().then(resolve).catch(reject);
                    } else {
                        reject(new Error('Failed to compress image to WebP'));
                    }
                }, 'image/webp', quality);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image for compression'));
            };

            img.src = url;
        });
    }

    getAssetFolderPath(file: TFile): string | null {
        if (!this.settings.hexoRoot) return null;
        const hexoFileName = this.settings.pathMapping[file.path];
        if (!hexoFileName) return null;

        const postsDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
        const assetFolderName = pathNode.parse(hexoFileName).name;
        return pathNode.join(postsDir, assetFolderName);
    }

    getUnusedImages(file: TFile): string[] {
        const assetDir = this.getAssetFolderPath(file);
        if (!assetDir || !fs.existsSync(assetDir)) return [];

        const filesInAssetDir = fs.readdirSync(assetDir);
        const usedImages = new Set<string>();

        // 1. Check content for used images
        const cache = this.app.metadataCache.getFileCache(file);
        const embeds = cache?.embeds || [];

        for (const embed of embeds) {
            const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
            if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
                usedImages.add(linkedFile.name);
            }
        }

        // 2. Check frontmatter for cover image
        const frontmatter = cache?.frontmatter;
        const coverField = this.settings.coverFieldName || 'cover';
        if (frontmatter && frontmatter[coverField]) {
            const coverLink = String(frontmatter[coverField]);
            const cleanLink = (coverLink.replace(/^"?\[\[|\]\]"?$/g, '').split('|')[0] ?? '').trim();
            const linkedFile = this.app.metadataCache.getFirstLinkpathDest(cleanLink, file.path);
            if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
                usedImages.add(linkedFile.name);
            }
        }

        return filesInAssetDir.filter(f => !usedImages.has(f) && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(pathNode.extname(f).slice(1).toLowerCase()));
    }
}
