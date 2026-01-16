import { spawn, ChildProcess } from 'child_process';
import { App, Notice } from 'obsidian';
import { HexoIntegrationSettings } from '../settings';
import { ExecutionModal } from '../modals/ExecutionModal';
import { t } from '../i18n/helpers';

export class HexoService {
    private serverProcess: ChildProcess | null = null;

    constructor(private app: App, private settings: HexoIntegrationSettings) { }

    private runHexoCommand(command: string, args: string[], successMessage: string, isServer = false, autoCloseOnSuccess = false) {
        if (!this.settings.hexoRoot) {
            new Notice(t('NOTICE_HEXO_ROOT_NOT_SET'));
            return;
        }

        let modal: ExecutionModal | null = null;
        if (this.settings.showOutputModal) {
            modal = new ExecutionModal(this.app, `Hexo: ${command} ${args.join(' ')}`);
            modal.open();
        } else {
            new Notice(t('NOTICE_RUNNING_HEXO', { command: `${command} ${args.join(' ')}` }));
        }

        const child = spawn(command, args, { cwd: this.settings.hexoRoot, shell: true });

        if (isServer) {
            this.serverProcess = child;
        }

        if (modal) {
            modal.onAbort = () => {
                if (window.process.platform === 'win32') {
                    spawn('taskkill', ['/F', '/T', '/PID', child.pid?.toString() || ''], { shell: true });
                } else {
                    child.kill('SIGINT');
                }
                if (modal) modal.appendLog("\n--- " + t('NOTICE_HEXO_INTERRUPTED') + " ---", 'stderr');
            };
        }

        child.stdout.on('data', (data: { toString: () => string }) => {
            const output = data.toString();
            console.debug(`stdout: ${output}`);
            if (modal) modal.appendLog(output);

            if (isServer && modal && output.includes('http://localhost:')) {
                setTimeout(() => {
                    if (modal) modal.close();
                }, 1500);
            }
        });

        child.stderr.on('data', (data: { toString: () => string }) => {
            const output = data.toString();
            console.error(`stderr: ${output}`);
            if (modal) modal.appendLog(output, 'stderr');
        });

        child.on('close', (code) => {
            if (code === 0) {
                new Notice(successMessage);
                if (autoCloseOnSuccess && modal) {
                    modal.setFinished();
                    setTimeout(() => modal?.close(), 1000);
                }
            } else {
                new Notice(t('NOTICE_HEXO_FAILED', { code: String(code) }));
            }
            if (modal && (!autoCloseOnSuccess || code !== 0)) modal.setFinished();
            if (isServer) {
                this.serverProcess = null;
            }
        });

        child.on('error', (err) => {
            new Notice(t('NOTICE_HEXO_START_ERROR', { message: err.message }));
            if (modal) {
                modal.appendLog(`\nError: ${err.message}`, 'stderr');
                modal.setFinished();
            }
        });
    }

    hexoGenerate(isAuto = false) {
        this.runHexoCommand('hexo', ['generate'], t('NOTICE_GENERATE_SUCCESS'), false, isAuto);
    }

    hexoServer() {
        if (this.serverProcess) {
            new Notice(t('NOTICE_SERVER_ALREADY_RUNNING'));
            return;
        }
        const port = this.settings.serverPort || 4000;
        this.runHexoCommand('hexo', ['server', '-p', String(port)], t('NOTICE_SERVER_STARTED', { port: String(port) }), true);
    }

    stopServer() {
        if (this.serverProcess) {
            if (window.process.platform === 'win32') {
                spawn('taskkill', ['/F', '/T', '/PID', this.serverProcess.pid?.toString() || ''], { shell: true });
            } else {
                this.serverProcess.kill('SIGINT');
            }
            this.serverProcess = null;
            new Notice(t('NOTICE_SERVER_STOPPED'));
        }
    }

    isServerRunning(): boolean {
        return this.serverProcess !== null;
    }

    hexoDeploy() {
        this.runHexoCommand('hexo', ['deploy'], t('NOTICE_DEPLOY_SUCCESS'));
    }
}
