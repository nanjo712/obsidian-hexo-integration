import { App, TFile } from 'obsidian';

export class LinkService {
    constructor(private app: App) { }

    async transformLinks(content: string, sourceFile: TFile): Promise<string> {
        const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

        const matches = Array.from(content.matchAll(linkRegex));
        let offset = 0;
        let result = content;

        for (const match of matches) {
            const fullMatch = match[0];
            const linkPath = match[1];
            const alias = match[2];
            const startIndex = match.index;

            if (linkPath === undefined || startIndex === undefined) continue;

            const start = startIndex + offset;
            const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourceFile.path);

            let replacement = "";
            if (targetFile) {
                const cache = this.app.metadataCache.getFileCache(targetFile);
                const frontmatter = cache?.frontmatter;

                const isPublished = frontmatter && frontmatter.published === true;

                if (isPublished) {
                    const displayTitle = alias || targetFile.basename;
                    replacement = `{% post_link ${targetFile.basename} "${displayTitle}" %}`;
                } else {
                    replacement = alias || targetFile.basename;
                }
            } else {
                replacement = alias || linkPath;
            }

            result = result.substring(0, start) + replacement + result.substring(start + fullMatch.length);
            offset += replacement.length - fullMatch.length;
        }

        return result;
    }
}
