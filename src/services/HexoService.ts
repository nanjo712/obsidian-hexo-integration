import { exec } from 'child_process';
import { Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';

export class HexoService {
    constructor(private settings: HexoIntegrationSettings) { }

    private runHexoCommand(command: string, successMessage: string) {
        if (!this.settings.hexoRoot) {
            new Notice('Error: Hexo root directory not configured.');
            return;
        }

        new Notice(`Running Hexo: ${command}...`);
        exec(command, { cwd: this.settings.hexoRoot }, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                new Notice(`Error: ${error.message}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            new Notice(successMessage);
        });
    }

    hexoGenerate() {
        this.runHexoCommand('hexo generate', 'Hexo: Site generated successfully.');
    }

    hexoServer() {
        this.runHexoCommand('hexo server', 'Hexo: Server started at http://localhost:4000');
    }

    hexoDeploy() {
        this.runHexoCommand('hexo deploy', 'Hexo: Site deployed successfully.');
    }
}
