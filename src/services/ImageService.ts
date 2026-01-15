import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import * as fs from 'fs';
import * as pathNode from 'path';

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
                // 1. Copy image (only once per file name)
                await this.ensureImageCopied(linkedFile, assetDir, processedFiles);

                // 2. Dynamically replace this specific link pattern to handle unique Alt texts
                const escapedLink = embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Handle Wikilinks: ![[image.png|alt]]
                const wikiRegex = new RegExp(`!\\[\\[${escapedLink}(\\|(.*?))?\\]\\]`, 'g');
                updatedContent = updatedContent.replace(wikiRegex, (match, p1, altText) => {
                    const finalAlt = altText || "";
                    return this.settings.imageSyntax === 'markdown'
                        ? `![${finalAlt}](${linkedFile.name})`
                        : `{% asset_img ${linkedFile.name} ${finalAlt} %}`;
                });

                // Handle Markdown links: ![alt](image.png)
                const mdRegex = new RegExp(`!\\[(.*?)\\]\\(${escapedLink}\\)`, 'g');
                updatedContent = updatedContent.replace(mdRegex, (match, altText) => {
                    const finalAlt = altText || "";
                    return this.settings.imageSyntax === 'markdown'
                        ? `![${finalAlt}](${linkedFile.name})`
                        : `{% asset_img ${linkedFile.name} ${finalAlt} %}`;
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
            await this.ensureImageCopied(linkedFile, assetDir, processedFiles);
            return linkedFile.name;
        }
        return null;
    }

    private async ensureImageCopied(linkedFile: TFile, assetDir: string, processedFiles: Set<string>) {
        if (!processedFiles.has(linkedFile.name)) {
            if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
            const imageContent = await this.app.vault.readBinary(linkedFile);
            fs.writeFileSync(pathNode.join(assetDir, linkedFile.name), Buffer.from(imageContent));
            processedFiles.add(linkedFile.name);
        }
    }

    getAssetFolderPath(file: TFile): string | null {
        if (!this.settings.hexoRoot) return null;
        const hexoFileName = this.settings.pathMapping[file.path];
        if (!hexoFileName) return null;

        const postsDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
        const assetFolderName = pathNode.parse(hexoFileName).name;
        return pathNode.join(postsDir, assetFolderName);
    }

    async getUnusedImages(file: TFile): Promise<string[]> {
        const assetDir = this.getAssetFolderPath(file);
        if (!assetDir || !fs.existsSync(assetDir)) return [];

        const filesInAssetDir = fs.readdirSync(assetDir);
        const usedImages = new Set<string>();

        // 1. Check content for used images
        let content = await this.app.vault.read(file);
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
