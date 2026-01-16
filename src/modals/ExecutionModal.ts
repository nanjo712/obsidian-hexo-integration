import { App, Modal } from "obsidian";
import Convert from 'ansi-to-html';
import { t } from '../i18n/helpers';

export class ExecutionModal extends Modal {
    private logContainer: HTMLElement;
    private closeButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private isRunning = true;
    private convert: { toHtml: (data: string) => string };
    public onAbort: () => void;

    constructor(app: App, private titleText: string) {
        super(app);
        this.convert = new Convert({
            fg: 'var(--text-normal)',
            bg: 'var(--background-primary)',
            newline: false,
            escapeXML: true,
            stream: true
        });
    }

    onOpen() {
        const { contentEl } = this;
        this.titleEl.setText(this.titleText);

        contentEl.createEl("div", { cls: "hexo-execution-modal-desc", text: t('MODAL_EXECUTION_DESC') });

        this.logContainer = contentEl.createEl("div", {
            cls: "hexo-execution-log-container",
        });
        this.logContainer.setCssProps({
            "background-color": "var(--background-secondary)",
            "padding": "10px",
            "border-radius": "4px",
            "max-height": "400px",
            "overflow-y": "auto",
            "white-space": "pre-wrap",
            "font-family": "var(--font-monospace)",
            "font-size": "0.85em",
            "line-height": "1.4",
            "border": "1px solid var(--background-modifier-border)"
        });

        const buttonContainer = contentEl.createDiv({ cls: "hexo-execution-modal-buttons" });
        buttonContainer.setCssProps({
            "margin-top": "20px",
            "display": "flex",
            "justify-content": "flex-end",
            "gap": "10px"
        });

        this.stopButton = buttonContainer.createEl("button", {
            text: t('MODAL_EXECUTION_STOP'),
            cls: "mod-warning",
        });
        this.stopButton.onclick = () => {
            if (this.onAbort) this.onAbort();
        };

        this.closeButton = buttonContainer.createEl("button", {
            text: t('MODAL_EXECUTION_CLOSE'),
            cls: "mod-cta",
        });
        this.closeButton.disabled = true;
        this.closeButton.onclick = () => this.close();
    }

    appendLog(data: string, type: 'stdout' | 'stderr' = 'stdout') {
        const html = this.convert.toHtml(data);
        const span = document.createElement('span');
        if (type === 'stderr') {
            span.setCssProps({ 'color': 'var(--text-error)' });
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        span.append(...Array.from(doc.body.childNodes));
        this.logContainer.appendChild(span);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    setFinished() {
        this.isRunning = false;
        this.closeButton.disabled = false;
        this.stopButton.disabled = true;
        this.appendLog("\n--- " + t('MODAL_EXECUTION_FINISHED') + " ---");
    }

    onClose() {
        if (this.isRunning && this.onAbort) {
            this.onAbort();
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
