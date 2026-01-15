import { App, TFile } from 'obsidian';
import * as pathNode from 'path';
import * as fs from 'fs';

export class FilenameService {
    constructor(private app: App) { }

    /**
     * Sanitizes a filename according to the rules:
     * - Lowercase: MyFile -> myfile
     * - Space to dash: My File -> my-file
     * - Remove special characters: ?, :, *, ", <, >, |, #
     * - Dot treatment: Middle dots to dash or remove
     * - Preserve Chinese characters
     */
    sanitize(name: string): string {
        // Separate basename and extension
        const ext = pathNode.extname(name);
        let base = name.slice(0, name.length - ext.length);

        // 1. Lowercase
        base = base.toLowerCase();

        // 2. Replace all non-word, non-numeric, and non-Chinese characters with a dash
        // This covers +, &, ?, :, *, ", <, >, |, # and other special symbols.
        // \w matches [A-Za-z0-9_], \u4e00-\u9fa5 covers common Chinese characters.
        base = base.replace(/[^\w\u4e00-\u9fa5]/g, '-');

        // 3. Clean up multiple dashes
        base = base.replace(/-+/g, '-');

        // 4. Trim dashes from ends
        base = base.replace(/^-+|-+$/g, '');

        // If name becomes empty (e.g. only special characters), use a fallback
        if (!base) {
            base = 'post';
        }

        return base + ext;
    }

    /**
     * Ensures a filename is unique within the target directory.
     * If a conflict exists, it adds a numeric suffix.
     * @param targetDir The directory to check for existence
     * @param sanitizedName The already sanitized name (with extension)
     * @param hexoRoot The root path to check against existing files
     */
    getUniqueFilename(targetDir: string, sanitizedName: string): string {
        const ext = pathNode.extname(sanitizedName);
        const base = sanitizedName.slice(0, sanitizedName.length - ext.length);

        let counter = 0;
        let finalName = sanitizedName;

        while (fs.existsSync(pathNode.join(targetDir, finalName))) {
            counter++;
            finalName = `${base}-${counter}${ext}`;
        }

        return finalName;
    }
}
