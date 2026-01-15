import { spawn } from 'child_process';
import { App, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import { ExecutionModal } from '../modals/ExecutionModal';

export class HexoService {
    constructor(private app: App, private settings: HexoIntegrationSettings) { }

    private runHexoCommand(command: string, args: string[], successMessage: string) {
        if (!this.settings.hexoRoot) {
            new Notice('Error: Hexo root directory not configured.');
            return;
        }

        let modal: ExecutionModal | null = null;
        if (this.settings.showOutputModal) {
            modal = new ExecutionModal(this.app, `Hexo: ${command} ${args.join(' ')}`);
            modal.open();
        } else {
            new Notice(`Running Hexo: ${command} ${args.join(' ')}...`);
        }

        const child = spawn(command, args, { cwd: this.settings.hexoRoot, shell: true });

        if (modal) {
            modal.onAbort = () => {
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/F', '/T', '/PID', child.pid?.toString() || ''], { shell: true });
                } else {
                    child.kill('SIGINT');
                }
                if (modal) modal.appendLog("\n--- Command interrupted by user ---", 'stderr');
            };
        }

        child.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`stdout: ${output}`);
            if (modal) modal.appendLog(output);
        });

        child.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(`stderr: ${output}`);
            if (modal) modal.appendLog(output, 'stderr');
        });

        child.on('close', (code) => {
            if (code === 0) {
                new Notice(successMessage);
            } else {
                new Notice(`Error: Hexo command failed with code ${code}.`);
            }
            if (modal) modal.setFinished();
        });

        child.on('error', (err) => {
            new Notice(`Error starting Hexo command: ${err.message}`);
            if (modal) {
                modal.appendLog(`\nError: ${err.message}`, 'stderr');
                modal.setFinished();
            }
        });
    }

    hexoGenerate() {
        this.runHexoCommand('hexo', ['generate'], 'Hexo: Site generated successfully.');
    }

    hexoServer() {
        this.runHexoCommand('hexo', ['server'], 'Hexo: Server started at http://localhost:4000');
    }

    hexoDeploy() {
        this.runHexoCommand('hexo', ['deploy'], 'Hexo: Site deployed successfully.');
    }
}
