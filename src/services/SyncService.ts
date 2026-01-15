import { App, TFile } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';

export class SyncService {
    constructor(private app: App, private settings: HexoIntegrationSettings) { }

    async computeHash(content: string): Promise<string> {
        const buffer = new TextEncoder().encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    isHexoFormat(file: TFile): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        return !!(frontmatter && 'title' in frontmatter && 'date' in frontmatter && 'tags' in frontmatter && 'publish' in frontmatter);
    }

    async getSyncStatus(file: TFile): Promise<'published' | 'unsynced' | 'unpublished'> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        if (!frontmatter || !frontmatter.publish) {
            return 'unpublished';
        }

        const currentHash = await this.computeHash(await this.app.vault.read(file));
        const savedHash = this.settings.postHashes[file.path];

        if (!savedHash) {
            return 'unpublished';
        }

        return currentHash === savedHash ? 'published' : 'unsynced';
    }
}
