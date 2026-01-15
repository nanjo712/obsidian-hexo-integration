import { App, TFile, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import * as fs from 'fs';
import * as pathNode from 'path';

export class ImageService {
    constructor(private app: App, private settings: HexoIntegrationSettings) { }

    async processImages(file: TFile, content: string): Promise<string> {
        const cache = this.app.metadataCache.getFileCache(file);
        const embeds = cache?.embeds || [];
        const targetDir = pathNode.join(this.settings.hexoRoot, 'source', '_posts');
        const assetDir = pathNode.join(targetDir, file.basename);

        let updatedContent = content;

        for (const embed of embeds) {
            const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);

            if (linkedFile && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(linkedFile.extension.toLowerCase())) {
                // Create asset folder if it doesn't exist
                if (!fs.existsSync(assetDir)) {
                    fs.mkdirSync(assetDir, { recursive: true });
                }

                // Copy image
                const imageContent = await this.app.vault.readBinary(linkedFile);
                fs.writeFileSync(pathNode.join(assetDir, linkedFile.name), Buffer.from(imageContent));

                // Replace syntax in content
                const altText = embed.displayText !== linkedFile.name ? embed.displayText : '';
                let replacement = "";
                if (this.settings.imageSyntax === 'markdown') {
                    replacement = `![${altText}](${linkedFile.name})`;
                } else {
                    replacement = `{% asset_img ${linkedFile.name} ${altText} %}`;
                }

                const wikiRegex = new RegExp(`!\\[\\[${embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|.*?)?\\]\\]`, 'g');
                updatedContent = updatedContent.replace(wikiRegex, replacement);

                const mdRegex = new RegExp(`!\\[(.*?)\\]\\(${embed.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
                updatedContent = updatedContent.replace(mdRegex, (match, alt) => {
                    const currentAlt = alt || altText;
                    return this.settings.imageSyntax === 'markdown'
                        ? `![${currentAlt}](${linkedFile.name})`
                        : `{% asset_img ${linkedFile.name} ${currentAlt} %}`;
                });
            }
        }

        return updatedContent;
    }
}
