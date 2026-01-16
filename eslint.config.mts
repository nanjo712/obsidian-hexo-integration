import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
    {
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        'eslint.config.js',
                        'manifest.json'
                    ]
                },
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.json']
            },
        },
        rules: {
            // 警告那些标记了 async 但没有使用 await 的函数
            "@typescript-eslint/require-await": "warn",
        }
    },
    ...obsidianmd.configs.recommended,
    globalIgnores([
        "node_modules",
        "dist",
        "esbuild.config.mjs",
        "eslint.config.js",
        "version-bump.mjs",
        "versions.json",
        "main.js",
        "package.json",
        "manifest.json",
        "package-lock.json"
    ]),
);


