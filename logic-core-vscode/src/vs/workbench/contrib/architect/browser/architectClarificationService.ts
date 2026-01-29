/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';

export const IArchitectClarificationService = createDecorator<IArchitectClarificationService>('architectClarificationService');

export interface IClarificationQuestion {
    id: string;
    question: string;
    options: IClarificationOption[];
    allowCustom: boolean;
}

export interface IClarificationOption {
    id: string;
    label: string;
    description: string;
    recommended?: boolean;
}

export interface IClarificationAnswer {
    questionId: string;
    selectedOptionId: string | null;
    customValue: string | null;
}

export interface IProjectSpec {
    description: string;
    techStack: string;
    uiType: string;
    features: string[];
    confirmed: boolean;
}

export interface IArchitectClarificationService {
    readonly _serviceBrand: undefined;

    readonly onQuestionsGenerated: Event<IClarificationQuestion[]>;
    readonly onSpecConfirmed: Event<IProjectSpec>;

    startClarification(userDescription: string): void;
    submitAnswer(answer: IClarificationAnswer): void;
    confirmSpec(): void;
    getCurrentSpec(): IProjectSpec | null;
    getQuestions(): IClarificationQuestion[];
    getAnswers(): IClarificationAnswer[];
}

export class ArchitectClarificationService extends Disposable implements IArchitectClarificationService {

    readonly _serviceBrand: undefined;

    private readonly _onQuestionsGenerated = this._register(new Emitter<IClarificationQuestion[]>());
    readonly onQuestionsGenerated: Event<IClarificationQuestion[]> = this._onQuestionsGenerated.event;

    private readonly _onSpecConfirmed = this._register(new Emitter<IProjectSpec>());
    readonly onSpecConfirmed: Event<IProjectSpec> = this._onSpecConfirmed.event;

    private _questions: IClarificationQuestion[] = [];
    private _answers: IClarificationAnswer[] = [];
    private _currentSpec: IProjectSpec | null = null;
    private _userDescription: string = '';

    constructor() {
        super();
    }

    public startClarification(userDescription: string): void {
        this._userDescription = userDescription;
        this._answers = [];

        // Generate clarification questions based on the description
        this._questions = this.generateQuestions(userDescription);
        this._onQuestionsGenerated.fire(this._questions);
    }

    private generateQuestions(description: string): IClarificationQuestion[] {
        const questions: IClarificationQuestion[] = [];
        const lowerDesc = description.toLowerCase();

        // 1. Tech Stack Analysis
        const techOptions: IClarificationOption[] = [];
        let techQuestion = '推荐的技术栈';

        if (lowerDesc.includes('game') || lowerDesc.includes('游戏')) {
            techQuestion = '这是一个游戏项目，你倾向于使用什么引擎？';
            techOptions.push({ id: 'unity', label: 'Unity (C#)', description: '专业 3D/2D 游戏引擎', recommended: true });
            techOptions.push({ id: 'godot', label: 'Godot', description: '轻量级开源引擎' });
            techOptions.push({ id: 'canvas', label: 'HTML5 Canvas + TS', description: '网页小游戏' });
        } else if (lowerDesc.includes('mobile') || lowerDesc.includes('app') || lowerDesc.includes('移动')) {
            techQuestion = '移动端开发技术栈';
            techOptions.push({ id: 'flutter', label: 'Flutter', description: 'Google 跨平台 UI 框架', recommended: true });
            techOptions.push({ id: 'react-native', label: 'React Native', description: '使用 React 构建原生应用' });
            techOptions.push({ id: 'swift', label: 'Swift (iOS)', description: '原生 iOS 开发' });
        } else if (lowerDesc.includes('ai') || lowerDesc.includes('data') || lowerDesc.includes('模型')) {
            techQuestion = 'AI/数据项目通常使用';
            techOptions.push({ id: 'python', label: 'Python (PyTorch/TF)', description: 'AI 领域标准语言', recommended: true });
            techOptions.push({ id: 'cpp', label: 'C++', description: '高性能计算' });
        } else {
            // Default / Web / General
            techQuestion = '你希望使用哪种技术栈？';
            techOptions.push({ id: 'nodejs', label: 'Node.js + TypeScript', description: '通用全栈选择', recommended: true });
            techOptions.push({ id: 'python', label: 'Python', description: '简洁易用' });
            techOptions.push({ id: 'go', label: 'Go', description: '高性能后端' });
            techOptions.push({ id: 'rust', label: 'Rust', description: '系统级编程' });
        }

        questions.push({
            id: 'tech-stack',
            question: techQuestion,
            options: techOptions,
            allowCustom: true // Always allow custom input
        });

        // 2. UI Type Analysis
        const uiOptions: IClarificationOption[] = [];
        let uiQuestion = '首选的交互界面？';

        if (lowerDesc.includes('tool') || lowerDesc.includes('cli') || lowerDesc.includes('脚本')) {
            uiQuestion = '脚本/工具的交互方式';
            uiOptions.push({ id: 'cli', label: '命令行 (CLI)', description: '纯文本交互，效率高', recommended: true });
            uiOptions.push({ id: 'tui', label: '终端 UI (TUI)', description: '带界面的终端应用' });
        } else {
            uiOptions.push({ id: 'web', label: 'Web 应用', description: '浏览器访问', recommended: true });
            uiOptions.push({ id: 'desktop', label: '桌面应用 (Electron)', description: '独立安装包' });
            uiOptions.push({ id: 'mobile', label: '移动 App', description: '手机应用' });
            uiOptions.push({ id: 'api', label: '无界面 (API 服务)', description: '仅提供接口' });
        }

        questions.push({
            id: 'ui-type',
            question: uiQuestion,
            options: uiOptions,
            allowCustom: true // Always allow custom input
        });

        // 3. Features (Dynamic Extraction)
        const featureOptions: IClarificationOption[] = [];

        // Dynamic keyword extraction simulation
        const commonFeatures = [
            { key: 'auth', label: '用户认证 (Auth)', keywords: ['login', 'user', '登录', '用户'] },
            { key: 'db', label: '数据库存储', keywords: ['data', 'store', 'db', '数据', '存'] },
            { key: 'api', label: 'RESTful API', keywords: ['api', '接口', 'server'] },
            { key: 'realtime', label: '实时通信 (WebSocket)', keywords: ['chat', 'realtime', 'socket', '聊'] },
            { key: 'search', label: '全文搜索', keywords: ['search', 'find', '搜'] }
        ];

        commonFeatures.forEach(f => {
            if (f.keywords.some(k => lowerDesc.includes(k))) {
                featureOptions.push({ id: f.key, label: f.label, description: '根据需求自动推荐', recommended: true });
            }
        });

        // Always add some generic ones if few matches
        if (featureOptions.length < 2) {
            featureOptions.push({ id: 'logging', label: '日志系统', description: '标准功能' });
            featureOptions.push({ id: 'config', label: '配置管理', description: '标准功能' });
        }

        questions.push({
            id: 'features',
            question: '根据描述，我为你推荐了这些功能模块',
            options: featureOptions,
            allowCustom: true
        });

        return questions;
    }

    public submitAnswer(answer: IClarificationAnswer): void {
        // Remove previous answer for the same question
        this._answers = this._answers.filter(a => a.questionId !== answer.questionId);
        this._answers.push(answer);

        // Update spec
        this.updateSpec();
    }

    private updateSpec(): void {
        const techAnswer = this._answers.find(a => a.questionId === 'tech-stack');
        const uiAnswer = this._answers.find(a => a.questionId === 'ui-type');
        const featuresAnswer = this._answers.find(a => a.questionId === 'features');

        this._currentSpec = {
            description: this._userDescription,
            techStack: techAnswer?.customValue || techAnswer?.selectedOptionId || 'nodejs',
            uiType: uiAnswer?.selectedOptionId || 'cli',
            features: featuresAnswer?.selectedOptionId?.split(',') || [],
            confirmed: false
        };
    }

    public confirmSpec(): void {
        if (this._currentSpec) {
            this._currentSpec.confirmed = true;
            this._onSpecConfirmed.fire(this._currentSpec);
        }
    }

    public getCurrentSpec(): IProjectSpec | null {
        return this._currentSpec;
    }

    public getQuestions(): IClarificationQuestion[] {
        return this._questions;
    }

    public getAnswers(): IClarificationAnswer[] {
        return this._answers;
    }
}
