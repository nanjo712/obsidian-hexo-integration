import { App, Modal, Setting } from "obsidian";
import Convert from 'ansi-to-html';

export class ExecutionModal extends Modal {
    private logContainer: HTMLElement;
    private closeButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private isRunning: boolean = true;
    private convert: any;
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

        contentEl.createEl("div", { cls: "hexo-execution-modal-desc", text: "Streaming output from Hexo command:" });

        this.logContainer = contentEl.createEl("div", {
            cls: "hexo-execution-log-container",
        });
        this.logContainer.style.backgroundColor = "var(--background-secondary)";
        this.logContainer.style.padding = "10px";
        this.logContainer.style.borderRadius = "4px";
        this.logContainer.style.maxHeight = "400px";
        this.logContainer.style.overflowY = "auto";
        this.logContainer.style.whiteSpace = "pre-wrap";
        this.logContainer.style.fontFamily = "var(--font-monospace)";
        this.logContainer.style.fontSize = "0.85em";
        this.logContainer.style.lineHeight = "1.4";
        this.logContainer.style.border = "1px solid var(--background-modifier-border)";

        const buttonContainer = contentEl.createDiv({ cls: "hexo-execution-modal-buttons" });
        buttonContainer.style.marginTop = "20px";
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "10px";

        this.stopButton = buttonContainer.createEl("button", {
            text: "Stop",
            cls: "mod-warning",
        });
        this.stopButton.onclick = () => {
            if (this.onAbort) this.onAbort();
        };

        this.closeButton = buttonContainer.createEl("button", {
            text: "Close",
            cls: "mod-cta",
        });
        this.closeButton.disabled = true;
        this.closeButton.onclick = () => this.close();
    }

    appendLog(data: string, type: 'stdout' | 'stderr' = 'stdout') {
        const html = this.convert.toHtml(data);
        const span = document.createElement('span');
        if (type === 'stderr') {
            span.style.color = 'var(--text-error)';
        }
        span.innerHTML = html;
        this.logContainer.appendChild(span);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    setFinished() {
        this.isRunning = false;
        this.closeButton.disabled = false;
        this.stopButton.disabled = true;
        this.appendLog("\n--- Command finished ---");
    }

    onClose() {
        if (this.isRunning && this.onAbort) {
            this.onAbort();
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
