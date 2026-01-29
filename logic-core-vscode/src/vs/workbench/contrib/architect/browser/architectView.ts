/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextViewService, IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import * as dom from '../../../../base/browser/dom.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import * as nls from '../../../../nls.js';
import { IArchitectGamePaneService, IGameNode } from './architectGamePane.js';
import { IArchitectClarificationService, IClarificationQuestion, IClarificationOption, IProjectSpec } from './architectClarificationService.js';
import { IArchitectCodeGeneratorService, IStreamingUpdate, IGeneratedFile } from './architectCodeGeneratorService.js';
import { IArchitectChangeManagerService, IFileChange } from './architectChangeManagerService.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';

type ArchitectPhase = 'input' | 'clarification' | 'generating' | 'review' | 'game';

const ARCHITECT_PENDING_SPEC_KEY = 'architect.pendingSpec';

export class ArchitectView extends ViewPane {

    private mainContainer: HTMLElement | undefined;

    // Phase containers
    private inputContainer: HTMLElement | undefined;
    private clarificationContainer: HTMLElement | undefined;
    private generatingContainer: HTMLElement | undefined;
    private reviewContainer: HTMLElement | undefined;

    // Input phase
    private input: InputBox | undefined;

    // Clarification phase
    private questionContainers: Map<string, HTMLElement> = new Map();

    // Generating phase
    private currentFileLabel: HTMLElement | undefined;
    private streamProgressBar: HTMLElement | undefined;
    private codePreview: HTMLElement | undefined;

    // Review phase
    private changesList: HTMLElement | undefined;

    // Spec
    private currentSpec: IProjectSpec | null = null;

    constructor(
        options: IViewPaneOptions,
        @IKeybindingService keybindingService: IKeybindingService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IConfigurationService configurationService: IConfigurationService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @IInstantiationService instantiationService: IInstantiationService,
        @IOpenerService openerService: IOpenerService,
        @IThemeService themeService: IThemeService,
        @IHoverService hoverService: IHoverService,
        @IContextViewService private readonly contextViewService: IContextViewService,
        @IArchitectGamePaneService private readonly architectGameService: IArchitectGamePaneService,
        @IArchitectClarificationService private readonly clarificationService: IArchitectClarificationService,
        @IArchitectCodeGeneratorService private readonly codeGeneratorService: IArchitectCodeGeneratorService,
        @IArchitectChangeManagerService private readonly changeManagerService: IArchitectChangeManagerService,
        @IFileDialogService private readonly fileDialogService: IFileDialogService,
        @IHostService private readonly hostService: IHostService,
        @IStorageService private readonly storageService: IStorageService,
        @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
    ) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

        // Subscribe to service events
        this._register(this.clarificationService.onQuestionsGenerated(questions => this.showClarificationPhase(questions)));
        this._register(this.clarificationService.onSpecConfirmed(spec => this.onSpecConfirmed(spec)));

        this._register(this.codeGeneratorService.onFileStreamStart(file => this.onFileStreamStart(file)));
        this._register(this.codeGeneratorService.onFileStreamUpdate(update => this.onFileStreamUpdate(update)));
        this._register(this.codeGeneratorService.onGenerationComplete(files => this.onGenerationComplete(files)));

        this._register(this.changeManagerService.onChangesUpdated(changes => this.updateChangesList(changes)));
        this._register(this.changeManagerService.onAllChangesApplied(() => this.onAllChangesApplied()));
    }

    protected override renderBody(container: HTMLElement): void {
        super.renderBody(container);

        this.mainContainer = dom.append(container, dom.$('.architect-view-container'));
        this.mainContainer.style.cssText = `
			padding: 15px;
			height: 100%;
			display: flex;
			flex-direction: column;
			overflow-y: auto;
			font-family: var(--vscode-font-family);
		`;

        this.renderInputPhase();
        this.renderClarificationPhase();
        this.renderGeneratingPhase();
        this.renderReviewPhase();

        // Check for pending session
        const pendingSpecJson = this.storageService.get(ARCHITECT_PENDING_SPEC_KEY, StorageScope.PROFILE);
        if (pendingSpecJson) {
            try {
                const spec = JSON.parse(pendingSpecJson);
                this.storageService.remove(ARCHITECT_PENDING_SPEC_KEY, StorageScope.PROFILE); // Clear immediately
                this.resumeGeneration(spec);
            } catch (e) {
                console.error('ArchitectView: Failed to parse pending spec', e);
                this.showPhase('input');
            }
        } else {
            this.showPhase('input');
        }
    }

    // ========================================
    // PHASE 1: INPUT
    // ========================================
    private renderInputPhase(): void {
        this.inputContainer = dom.append(this.mainContainer!, dom.$('.phase-input'));

        // Header - using safe DOM methods instead of innerHTML
        const header = dom.append(this.inputContainer, dom.$('.phase-header'));

        const title = dom.append(header, dom.$('h2'));
        title.textContent = 'LogicCore Architect';
        title.style.cssText = 'margin: 0 0 5px 0; color: var(--vscode-foreground);';

        const subtitle = dom.append(header, dom.$('p'));
        subtitle.textContent = '告诉我你想做什么，我会帮你一步步实现';
        subtitle.style.cssText = 'margin: 0; opacity: 0.7; font-size: 12px;';

        const inputWrapper = dom.append(this.inputContainer, dom.$('.input-wrapper'));
        inputWrapper.style.marginTop = '20px';

        this.input = this._register(new InputBox(inputWrapper, this.contextViewService, {
            placeholder: nls.localize('architect.placeholder', "例如：做一个文件搜索工具..."),
            flexibleHeight: true,
            inputBoxStyles: {
                inputBackground: undefined, inputForeground: undefined, inputBorder: undefined,
                inputValidationInfoBorder: undefined, inputValidationInfoBackground: undefined, inputValidationInfoForeground: undefined,
                inputValidationWarningBorder: undefined, inputValidationWarningBackground: undefined, inputValidationWarningForeground: undefined,
                inputValidationErrorBorder: undefined, inputValidationErrorBackground: undefined, inputValidationErrorForeground: undefined
            }
        }));

        const startBtn = this.createButton(this.inputContainer, '开始构思', 'primary');
        startBtn.style.marginTop = '15px';
        dom.addDisposableListener(startBtn, dom.EventType.CLICK, () => this.onStartClicked());
    }

    private onStartClicked(): void {
        const description = this.input?.value?.trim();
        if (!description) {
            return;
        }
        this.clarificationService.startClarification(description);
    }

    // ========================================
    // PHASE 2: CLARIFICATION
    // ========================================
    private renderClarificationPhase(): void {
        this.clarificationContainer = dom.append(this.mainContainer!, dom.$('.phase-clarification'));
        this.clarificationContainer.style.display = 'none';
    }

    private showClarificationPhase(questions: IClarificationQuestion[]): void {
        this.showPhase('clarification');
        dom.clearNode(this.clarificationContainer!);
        this.questionContainers.clear();

        const header = dom.append(this.clarificationContainer!, dom.$('.phase-header'));
        const h3 = dom.append(header, dom.$('h3'));
        h3.textContent = '💬 我有几个问题想确认';
        h3.style.cssText = 'margin: 0 0 5px 0;';

        const p = dom.append(header, dom.$('p'));
        p.textContent = '请选择或补充以下信息';
        p.style.cssText = 'margin: 0; opacity: 0.7; font-size: 12px;';
        header.style.marginBottom = '20px';

        questions.forEach((question, index) => {
            const qContainer = this.renderQuestion(question, index + 1);
            this.questionContainers.set(question.id, qContainer);
            this.clarificationContainer!.appendChild(qContainer);
        });

        const confirmBtn = this.createButton(this.clarificationContainer!, '确认并选择文件夹', 'primary');
        confirmBtn.style.marginTop = '20px';
        dom.addDisposableListener(confirmBtn, dom.EventType.CLICK, () => this.clarificationService.confirmSpec());
    }

    private renderQuestion(question: IClarificationQuestion, index: number): HTMLElement {
        const container = dom.$('.question-container');
        container.style.cssText = `
			margin-bottom: 20px;
			padding: 12px;
			background: var(--vscode-editor-background);
			border-radius: 6px;
			border: 1px solid var(--vscode-widget-border);
		`;

        const title = dom.append(container, dom.$('.question-title'));
        title.textContent = `${index}. ${question.question}`;
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px;';

        const optionsContainer = dom.append(container, dom.$('.options'));
        optionsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

        question.options.forEach(option => {
            const optionEl = this.renderOption(question.id, option);
            optionsContainer.appendChild(optionEl);
        });

        return container;
    }

    private renderOption(questionId: string, option: IClarificationOption): HTMLElement {
        const el = dom.$('.option');
        el.style.cssText = `
			padding: 10px;
			border: 1px solid var(--vscode-widget-border);
			border-radius: 4px;
			cursor: pointer;
			transition: all 0.2s;
			display: flex;
			align-items: center;
			gap: 8px;
			${option.recommended ? 'border-color: var(--vscode-button-background);' : ''}
		`;

        const radio = dom.append(el, dom.$('input')) as HTMLInputElement;
        radio.type = 'radio';
        radio.name = questionId;
        radio.value = option.id;
        if (option.recommended) {
            radio.checked = true;
        }

        const textContainer = dom.append(el, dom.$('div'));

        const labelDiv = dom.append(textContainer, dom.$('div'));
        labelDiv.style.fontWeight = 'bold';
        labelDiv.textContent = option.label;

        if (option.recommended) {
            const badge = dom.append(labelDiv, dom.$('span'));
            badge.textContent = ' 推荐';
            badge.style.cssText = 'color: var(--vscode-button-background); font-size: 10px;';
        }

        const descDiv = dom.append(textContainer, dom.$('div'));
        descDiv.textContent = option.description;
        descDiv.style.cssText = 'font-size: 11px; opacity: 0.7;';

        dom.addDisposableListener(el, dom.EventType.CLICK, () => {
            radio.checked = true;
            this.clarificationService.submitAnswer({
                questionId,
                selectedOptionId: option.id,
                customValue: null
            });
        });

        return el;
    }

    private async onSpecConfirmed(spec: IProjectSpec): Promise<void> {
        this.currentSpec = spec;

        // 1. Show Folder Picker
        const folderUri = await this.fileDialogService.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: '选择项目保存位置'
        });

        if (folderUri && folderUri.length > 0) {
            const targetUri = folderUri[0];

            // 2. Persist Spec to resume later
            this.storageService.store(ARCHITECT_PENDING_SPEC_KEY, JSON.stringify(spec), StorageScope.PROFILE, StorageTarget.MACHINE);

            // 3. Open Folder (Will Reload Window)
            this.hostService.openWindow([{ folderUri: targetUri }], { forceNewWindow: false });
        }
    }

    private resumeGeneration(spec: IProjectSpec): void {
        this.currentSpec = spec;
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
        if (workspaceFolders.length === 0) {
            // Fallback: If no workspace is open (shouldn't happen if openWindow worked), warn or ask again
            // For now, just show generating with a warning or fallback to temp
            console.warn('ArchitectView: No workspace folder open, cannot generate files.');
            return;
        }

        const rootUri = workspaceFolders[0].uri;
        this.showPhase('generating');
        this.codeGeneratorService.startGeneration(spec, rootUri);
    }

    // ========================================
    // PHASE 3: GENERATING
    // ========================================
    private renderGeneratingPhase(): void {
        this.generatingContainer = dom.append(this.mainContainer!, dom.$('.phase-generating'));
        this.generatingContainer.style.display = 'none';

        const header = dom.append(this.generatingContainer, dom.$('.phase-header'));
        const h3 = dom.append(header, dom.$('h3'));
        h3.textContent = '⚙️ 正在生成代码...';
        h3.style.cssText = 'margin: 0 0 5px 0;';

        const p = dom.append(header, dom.$('p'));
        p.textContent = '请观察右侧编辑器的实时变化';
        p.style.cssText = 'margin: 0; opacity: 0.7; font-size: 12px;';
        header.style.marginBottom = '20px';

        this.currentFileLabel = dom.append(this.generatingContainer, dom.$('.current-file'));
        this.currentFileLabel.style.cssText = 'font-family: monospace; margin-bottom: 10px; color: var(--vscode-textLink-foreground);';

        const progressWrapper = dom.append(this.generatingContainer, dom.$('.progress-wrapper'));
        progressWrapper.style.cssText = 'height: 4px; background: var(--vscode-progressBar-background); border-radius: 2px; overflow: hidden;';

        this.streamProgressBar = dom.append(progressWrapper, dom.$('.progress-bar'));
        this.streamProgressBar.style.cssText = 'height: 100%; width: 0%; background: var(--vscode-button-background); transition: width 0.1s;';

        const previewWrapper = dom.append(this.generatingContainer, dom.$('.preview-wrapper'));
        previewWrapper.style.cssText = 'margin-top: 15px; flex: 1; overflow: hidden;';

        const previewHeader = dom.append(previewWrapper, dom.$('.preview-header'));
        const previewLabel = dom.append(previewHeader, dom.$('span'));
        previewLabel.textContent = '📄 实时预览';
        previewLabel.style.cssText = 'font-size: 11px; opacity: 0.7;';

        this.codePreview = dom.append(previewWrapper, dom.$('.code-preview'));
        this.codePreview.style.cssText = `
			font-family: var(--vscode-editor-font-family, monospace);
			font-size: 11px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-widget-border);
			border-radius: 4px;
			padding: 10px;
			height: 200px;
			overflow-y: auto;
			white-space: pre-wrap;
			color: var(--vscode-editor-foreground);
		`;
    }

    private onFileStreamStart(file: IGeneratedFile): void {
        if (this.currentFileLabel) {
            this.currentFileLabel.textContent = `📂 ${file.path}`;
        }
        if (this.codePreview) {
            this.codePreview.textContent = '';
        }
        if (this.streamProgressBar) {
            this.streamProgressBar.style.width = '0%';
        }
    }

    private onFileStreamUpdate(update: IStreamingUpdate): void {
        if (this.codePreview) {
            this.codePreview.textContent += update.lineContent + '\n';
            this.codePreview.scrollTop = this.codePreview.scrollHeight;
        }
        if (this.streamProgressBar) {
            const percent = (update.currentLine / update.totalLines) * 100;
            this.streamProgressBar.style.width = `${percent}%`;
        }
    }

    private onGenerationComplete(files: IGeneratedFile[]): void {
        this.changeManagerService.clearChanges();

        files.forEach(file => {
            const change = this.changeManagerService.addChange({
                filePath: file.path,
                fileName: file.path.split('/').pop() || file.path,
                changeType: file.isNew ? 'new' : 'modified',
                originalContent: null,
                newContent: file.content,
                addedLines: file.content.split('\n').length,
                removedLines: 0,
                summary: file.isNew ? '新建文件' : '修改文件'
            });
            // Auto-approve for immediate write
            this.changeManagerService.approveChange(change.id);
        });

        // Auto-apply to disk immediately
        this.changeManagerService.applyAllApproved().then(() => {
            this.showPhase('review');
        });
    }

    // ========================================
    // PHASE 4: REVIEW
    // ========================================
    private renderReviewPhase(): void {
        this.reviewContainer = dom.append(this.mainContainer!, dom.$('.phase-review'));
        this.reviewContainer.style.display = 'none';

        const header = dom.append(this.reviewContainer, dom.$('.phase-header'));
        const h3 = dom.append(header, dom.$('h3'));
        h3.textContent = '📋 变更预览';
        h3.style.cssText = 'margin: 0 0 5px 0;';

        const p = dom.append(header, dom.$('p'));
        p.textContent = '审查并选择要应用的更改';
        p.style.cssText = 'margin: 0; opacity: 0.7; font-size: 12px;';
        header.style.marginBottom = '15px';

        this.changesList = dom.append(this.reviewContainer, dom.$('.changes-list'));
        this.changesList.style.cssText = 'flex: 1; overflow-y: auto;';

        const actionsContainer = dom.append(this.reviewContainer, dom.$('.actions'));
        actionsContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 10px;';

        const applyAllBtn = this.createButton(actionsContainer, '✅ 全部应用', 'primary');
        dom.addDisposableListener(applyAllBtn, dom.EventType.CLICK, () => {
            this.changeManagerService.getChanges().forEach(c => {
                if (c.status === 'pending') {
                    this.changeManagerService.approveChange(c.id);
                }
            });
            this.changeManagerService.applyAllApproved();
        });

        const rejectAllBtn = this.createButton(actionsContainer, '❌ 全部拒绝', 'secondary');
        dom.addDisposableListener(rejectAllBtn, dom.EventType.CLICK, () => this.changeManagerService.rejectAll());

        const gameBtn = this.createButton(actionsContainer, '🎮 进入优化', 'secondary');
        dom.addDisposableListener(gameBtn, dom.EventType.CLICK, () => this.enterGameMode());
    }

    private updateChangesList(changes: IFileChange[]): void {
        if (!this.changesList) {
            return;
        }

        dom.clearNode(this.changesList);

        changes.forEach(change => {
            const item = this.renderChangeItem(change);
            this.changesList!.appendChild(item);
        });
    }

    private renderChangeItem(change: IFileChange): HTMLElement {
        const item = dom.$('.change-item');
        item.style.cssText = `
			padding: 10px;
			margin-bottom: 8px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-widget-border);
			border-radius: 4px;
			display: flex;
			align-items: center;
			gap: 10px;
		`;

        const typeIcon = change.changeType === 'new' ? '🆕' : change.changeType === 'modified' ? '📝' : '🗑️';
        const statusColor = change.status === 'approved' ? 'var(--vscode-testing-iconPassed)' :
            change.status === 'rejected' ? 'var(--vscode-testing-iconFailed)' :
                change.status === 'applied' ? 'var(--vscode-button-background)' : 'var(--vscode-foreground)';

        const iconSpan = dom.append(item, dom.$('span'));
        iconSpan.textContent = typeIcon;
        iconSpan.style.fontSize = '16px';

        const infoDiv = dom.append(item, dom.$('div'));
        infoDiv.style.flex = '1';

        const fileName = dom.append(infoDiv, dom.$('div'));
        fileName.textContent = change.fileName;
        fileName.style.cssText = 'font-weight: bold; font-size: 12px;';

        const details = dom.append(infoDiv, dom.$('div'));
        details.textContent = `+${change.addedLines} 行 | ${change.summary}`;
        details.style.cssText = 'font-size: 10px; opacity: 0.7;';

        const statusSpan = dom.append(item, dom.$('span'));
        statusSpan.textContent = change.status;
        statusSpan.style.cssText = `font-size: 10px; color: ${statusColor}; text-transform: uppercase;`;

        if (change.status === 'pending') {
            const approveBtn = dom.append(item, dom.$('button'));
            approveBtn.textContent = '✓';
            approveBtn.style.cssText = 'padding: 4px 8px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px;';
            dom.addDisposableListener(approveBtn, dom.EventType.CLICK, () => this.changeManagerService.approveChange(change.id));

            const rejectBtn = dom.append(item, dom.$('button'));
            rejectBtn.textContent = '✗';
            rejectBtn.style.cssText = 'padding: 4px 8px; cursor: pointer; background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-widget-border); border-radius: 2px; margin-left: 4px;';
            dom.addDisposableListener(rejectBtn, dom.EventType.CLICK, () => this.changeManagerService.rejectChange(change.id));
        }

        return item;
    }

    private onAllChangesApplied(): void {
        if (this.currentSpec) {
            this.enterGameMode();
        }
    }

    // ========================================
    // PHASE 5: GAME
    // ========================================
    private enterGameMode(): void {
        if (!this.currentSpec) {
            return;
        }

        const files = this.codeGeneratorService.getGeneratedFiles();
        const nodes = this.generateDetailedGameNodes(files);

        this.architectGameService.openGame(this.currentSpec.description, nodes);

        this.showPhase('input');
        if (this.input) {
            this.input.value = '';
        }
    }

    private generateDetailedGameNodes(files: IGeneratedFile[]): IGameNode[] {
        const nodes: IGameNode[] = [];
        let y = 80;

        files.forEach((file, fileIndex) => {
            nodes.push({
                id: `file-${fileIndex}`,
                label: file.path.split('/').pop() || 'file',
                type: 'data',
                x: 50,
                y: y,
                cost: 10,
                category: 'file'
            });

            const lines = file.content.split('\n');
            let x = 180;

            lines.forEach((line, lineIndex) => {
                if (line.includes('function') || line.includes('async ')) {
                    nodes.push({
                        id: `func-${fileIndex}-${lineIndex}`,
                        label: this.extractFunctionName(line),
                        type: 'logic',
                        x: x,
                        y: y,
                        cost: 30,
                        category: 'function'
                    });
                    x += 120;
                } else if (line.includes('for (') || line.includes('while (') || line.includes('.forEach(') || line.includes('.map(')) {
                    nodes.push({
                        id: `loop-${fileIndex}-${lineIndex}`,
                        label: '循环',
                        type: 'process',
                        x: x,
                        y: y + 60,
                        cost: 50,
                        category: 'loop',
                        complexity: 'O(n)'
                    });
                    x += 100;
                } else if (line.includes('if (') || line.includes('else')) {
                    nodes.push({
                        id: `cond-${fileIndex}-${lineIndex}`,
                        label: '条件',
                        type: 'logic',
                        x: x,
                        y: y + 30,
                        cost: 15,
                        category: 'condition'
                    });
                    x += 80;
                }
            });

            y += 150;
        });

        return nodes;
    }

    private extractFunctionName(line: string): string {
        const match = line.match(/(?:function|async)\s+(\w+)/);
        if (match) {
            return match[1];
        }
        const arrowMatch = line.match(/(\w+)\s*[=:]\s*(?:async\s*)?\(/);
        if (arrowMatch) {
            return arrowMatch[1];
        }
        return 'fn';
    }

    // ========================================
    // UTILITIES
    // ========================================
    private showPhase(phase: ArchitectPhase): void {
        const phases: { [key: string]: HTMLElement | undefined } = {
            input: this.inputContainer,
            clarification: this.clarificationContainer,
            generating: this.generatingContainer,
            review: this.reviewContainer
        };

        Object.entries(phases).forEach(([key, container]) => {
            if (container) {
                container.style.display = key === phase ? 'flex' : 'none';
                container.style.flexDirection = 'column';
            }
        });
    }

    private createButton(parent: HTMLElement, text: string, style: 'primary' | 'secondary'): HTMLElement {
        const btn = dom.append(parent, dom.$('button'));
        btn.textContent = text;
        btn.style.cssText = `
			padding: 8px 16px;
			cursor: pointer;
			border-radius: 4px;
			font-weight: bold;
			border: none;
			${style === 'primary'
                ? 'background: var(--vscode-button-background); color: var(--vscode-button-foreground);'
                : 'background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-widget-border);'
            }
		`;
        return btn;
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
        this.input?.layout();
    }
}
