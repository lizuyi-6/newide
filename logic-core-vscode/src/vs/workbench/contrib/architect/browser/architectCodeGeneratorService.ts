/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IProjectSpec } from './architectClarificationService.js';
import { URI } from '../../../../base/common/uri.js';

export const IArchitectCodeGeneratorService = createDecorator<IArchitectCodeGeneratorService>('architectCodeGeneratorService');

export interface IGeneratedFile {
    path: string;
    content: string;
    isNew: boolean;
    status: 'pending' | 'streaming' | 'complete';
    streamedLines: number;
}

export interface IStreamingUpdate {
    filePath: string;
    currentLine: number;
    totalLines: number;
    lineContent: string;
}

export interface IArchitectCodeGeneratorService {
    readonly _serviceBrand: undefined;

    readonly onFileStreamStart: Event<IGeneratedFile>;
    readonly onFileStreamUpdate: Event<IStreamingUpdate>;
    readonly onFileStreamComplete: Event<IGeneratedFile>;
    readonly onGenerationComplete: Event<IGeneratedFile[]>;

    startGeneration(spec: IProjectSpec, workspaceUri: URI): Promise<void>;
    getGeneratedFiles(): IGeneratedFile[];
    cancelGeneration(): void;
}

export class ArchitectCodeGeneratorService extends Disposable implements IArchitectCodeGeneratorService {

    readonly _serviceBrand: undefined;

    private readonly _onFileStreamStart = this._register(new Emitter<IGeneratedFile>());
    readonly onFileStreamStart: Event<IGeneratedFile> = this._onFileStreamStart.event;

    private readonly _onFileStreamUpdate = this._register(new Emitter<IStreamingUpdate>());
    readonly onFileStreamUpdate: Event<IStreamingUpdate> = this._onFileStreamUpdate.event;

    private readonly _onFileStreamComplete = this._register(new Emitter<IGeneratedFile>());
    readonly onFileStreamComplete: Event<IGeneratedFile> = this._onFileStreamComplete.event;

    private readonly _onGenerationComplete = this._register(new Emitter<IGeneratedFile[]>());
    readonly onGenerationComplete: Event<IGeneratedFile[]> = this._onGenerationComplete.event;

    private _generatedFiles: IGeneratedFile[] = [];
    private _isGenerating: boolean = false;
    private _cancelRequested: boolean = false;

    constructor() {
        super();
    }

    public async startGeneration(spec: IProjectSpec, workspaceUri: URI): Promise<void> {
        if (this._isGenerating) {
            return;
        }

        this._isGenerating = true;
        this._cancelRequested = false;
        this._generatedFiles = [];

        // Generate file templates based on spec
        const filesToGenerate = this.planFiles(spec);

        for (const file of filesToGenerate) {
            if (this._cancelRequested) {
                break;
            }

            file.status = 'streaming';
            this._generatedFiles.push(file);
            this._onFileStreamStart.fire(file);

            // Stream the file content line by line
            await this.streamFile(file);

            file.status = 'complete';
            this._onFileStreamComplete.fire(file);
        }

        this._isGenerating = false;
        this._onGenerationComplete.fire(this._generatedFiles);
    }

    private planFiles(spec: IProjectSpec): IGeneratedFile[] {
        const files: IGeneratedFile[] = [];
        const basePath = 'src';

        // Main entry file
        files.push({
            path: `${basePath}/index.ts`,
            content: this.generateMainFile(spec),
            isNew: true,
            status: 'pending',
            streamedLines: 0
        });

        // Core logic file
        files.push({
            path: `${basePath}/core/${this.getModuleName(spec)}.ts`,
            content: this.generateCoreModule(spec),
            isNew: true,
            status: 'pending',
            streamedLines: 0
        });

        // Types file
        files.push({
            path: `${basePath}/types/index.ts`,
            content: this.generateTypesFile(spec),
            isNew: true,
            status: 'pending',
            streamedLines: 0
        });

        // Config file
        if (spec.features.includes('config')) {
            files.push({
                path: `${basePath}/config.ts`,
                content: this.generateConfigFile(spec),
                isNew: true,
                status: 'pending',
                streamedLines: 0
            });
        }

        // Test file
        files.push({
            path: `tests/${this.getModuleName(spec)}.test.ts`,
            content: this.generateTestFile(spec),
            isNew: true,
            status: 'pending',
            streamedLines: 0
        });

        return files;
    }

    private async streamFile(file: IGeneratedFile): Promise<void> {
        const lines = file.content.split('\n');
        const totalLines = lines.length;

        for (let i = 0; i < totalLines; i++) {
            if (this._cancelRequested) {
                break;
            }

            file.streamedLines = i + 1;

            this._onFileStreamUpdate.fire({
                filePath: file.path,
                currentLine: i + 1,
                totalLines: totalLines,
                lineContent: lines[i]
            });

            // Simulate streaming delay (50ms per line)
            await this.delay(50);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getModuleName(spec: IProjectSpec): string {
        // Extract module name from description
        if (spec.description.includes('搜索') || spec.description.includes('search')) {
            return 'searcher';
        }
        if (spec.description.includes('TODO') || spec.description.includes('todo')) {
            return 'todoManager';
        }
        return 'core';
    }

    private generateMainFile(spec: IProjectSpec): string {
        const moduleName = this.getModuleName(spec);
        const className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

        return `/**
 * ${spec.description}
 *
 * 技术栈: ${spec.techStack}
 * UI 类型: ${spec.uiType}
 *
 * 由 LogicCore Architect 自动生成
 */

import { ${className} } from './core/${moduleName}';
import { Config } from './config';
import type { AppOptions } from './types';

async function main(): Promise<void> {
    console.log('🚀 正在启动 ${spec.description}...');

    // 加载配置
    const config = Config.load();

    // 初始化核心模块
    const app = new ${className}({
        verbose: config.verbose,
        maxResults: config.maxResults
    });

    // 启动应用
    await app.initialize();

    console.log('✅ 应用已就绪！');

    // 根据 UI 类型启动对应界面
    ${this.generateUIStartup(spec)}
}

main().catch(err => {
    console.error('❌ 启动失败:', err);
    process.exit(1);
});
`;
    }

    private generateUIStartup(spec: IProjectSpec): string {
        switch (spec.uiType) {
            case 'cli':
                return `// CLI 模式
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('请输入命令: ', async (input: string) => {
        const result = await app.execute(input);
        console.log(result);
        rl.close();
    });`;
            case 'web':
                return `// Web 服务模式
    const express = require('express');
    const server = express();
    server.use(express.json());
    server.post('/api/execute', async (req, res) => {
        const result = await app.execute(req.body.command);
        res.json(result);
    });
    server.listen(3000, () => console.log('🌐 Web 服务已启动: http://localhost:3000'));`;
            case 'api':
                return `// 纯 API 服务模式
    const http = require('http');
    http.createServer(async (req, res) => {
        // API 路由处理
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ready' }));
    }).listen(8080);`;
            default:
                return `// 默认模式
    await app.run();`;
        }
    }

    private generateCoreModule(spec: IProjectSpec): string {
        const moduleName = this.getModuleName(spec);
        const className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

        return `/**
 * 核心模块: ${className}
 *
 * 负责实现 ${spec.description} 的核心逻辑
 */

import type { AppOptions, ExecuteResult } from '../types';

export class ${className} {
    private options: AppOptions;
    private initialized: boolean = false;

    constructor(options: AppOptions) {
        this.options = options;
    }

    /**
     * 初始化模块
     */
    async initialize(): Promise<void> {
        if (this.options.verbose) {
            console.log('📦 正在初始化 ${className}...');
        }

        // 执行初始化逻辑
        await this.loadResources();
        await this.validateEnvironment();

        this.initialized = true;
    }

    /**
     * 加载必要资源
     */
    private async loadResources(): Promise<void> {
        // TODO: 实现资源加载
        await this.delay(100);
    }

    /**
     * 验证运行环境
     */
    private async validateEnvironment(): Promise<void> {
        // TODO: 实现环境验证
        await this.delay(50);
    }

    /**
     * 执行核心操作
     */
    async execute(input: string): Promise<ExecuteResult> {
        if (!this.initialized) {
            throw new Error('模块未初始化');
        }

        const startTime = Date.now();

        // 核心算法逻辑
        const results = await this.processInput(input);

        const duration = Date.now() - startTime;

        return {
            success: true,
            data: results,
            duration,
            count: results.length
        };
    }

    /**
     * 处理输入数据
     */
    private async processInput(input: string): Promise<string[]> {
        const results: string[] = [];

        // 模拟处理逻辑
        const items = input.split(' ').filter(Boolean);

        for (const item of items) {
            if (this.matchesCriteria(item)) {
                results.push(item);
            }

            if (results.length >= this.options.maxResults) {
                break;
            }
        }

        return results;
    }

    /**
     * 匹配条件判断
     */
    private matchesCriteria(item: string): boolean {
        // TODO: 实现具体的匹配逻辑
        return item.length > 0;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
`;
    }

    private generateTypesFile(spec: IProjectSpec): string {
        return `/**
 * 类型定义
 *
 * 项目: ${spec.description}
 */

export interface AppOptions {
    verbose: boolean;
    maxResults: number;
}

export interface ExecuteResult {
    success: boolean;
    data: string[];
    duration: number;
    count: number;
}

export interface ConfigOptions {
    verbose: boolean;
    maxResults: number;
    outputFormat: 'json' | 'text' | 'table';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
`;
    }

    private generateConfigFile(spec: IProjectSpec): string {
        return `/**
 * 配置管理
 */

import type { ConfigOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = 'config.json';
const DEFAULT_CONFIG: ConfigOptions = {
    verbose: false,
    maxResults: 100,
    outputFormat: 'text',
    logLevel: 'info'
};

export class Config {
    private static instance: ConfigOptions | null = null;

    static load(): ConfigOptions {
        if (this.instance) {
            return this.instance;
        }

        const configPath = path.resolve(process.cwd(), CONFIG_FILE);

        if (fs.existsSync(configPath)) {
            try {
                const raw = fs.readFileSync(configPath, 'utf-8');
                this.instance = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
            } catch {
                console.warn('⚠️ 配置文件解析失败，使用默认配置');
                this.instance = DEFAULT_CONFIG;
            }
        } else {
            this.instance = DEFAULT_CONFIG;
        }

        return this.instance;
    }

    static save(config: Partial<ConfigOptions>): void {
        const current = this.load();
        const merged = { ...current, ...config };

        const configPath = path.resolve(process.cwd(), CONFIG_FILE);
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));

        this.instance = merged;
    }
}
`;
    }

    private generateTestFile(spec: IProjectSpec): string {
        const moduleName = this.getModuleName(spec);
        const className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

        return `/**
 * 单元测试: ${className}
 */

import { ${className} } from '../src/core/${moduleName}';

describe('${className}', () => {

    let instance: ${className};

    beforeEach(() => {
        instance = new ${className}({
            verbose: false,
            maxResults: 10
        });
    });

    test('应该正确初始化', async () => {
        await expect(instance.initialize()).resolves.not.toThrow();
    });

    test('执行前未初始化应抛出错误', async () => {
        await expect(instance.execute('test')).rejects.toThrow('模块未初始化');
    });

    test('执行后应返回结果', async () => {
        await instance.initialize();
        const result = await instance.execute('hello world test');

        expect(result.success).toBe(true);
        expect(result.count).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('应遵守 maxResults 限制', async () => {
        const limitedInstance = new ${className}({
            verbose: false,
            maxResults: 2
        });
        await limitedInstance.initialize();

        const result = await limitedInstance.execute('a b c d e f g');

        expect(result.count).toBeLessThanOrEqual(2);
    });
});
`;
    }

    public getGeneratedFiles(): IGeneratedFile[] {
        return this._generatedFiles;
    }

    public cancelGeneration(): void {
        this._cancelRequested = true;
    }
}
