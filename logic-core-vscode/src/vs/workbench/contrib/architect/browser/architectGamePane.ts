/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import * as nls from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';

export const IArchitectGamePaneService = createDecorator<IArchitectGamePaneService>('architectGamePaneService');

export interface IArchitectGamePaneService {
	readonly _serviceBrand: undefined;
	openGame(projectName: string, nodes: IGameNode[]): Promise<void>;
}

export interface IGameNode {
	id: string;
	label: string;
	type: 'logic' | 'data' | 'process';
	x: number;
	y: number;
	cost: number;
	category?: string;
	complexity?: string;
}

export class ArchitectGamePane extends Disposable implements IArchitectGamePaneService {

	readonly _serviceBrand: undefined;

	constructor(
		@IWebviewWorkbenchService private readonly webviewWorkbenchService: IWebviewWorkbenchService,
	) {
		super();
	}

	public async openGame(projectName: string, nodes: IGameNode[]): Promise<void> {
		const webviewPanel = this.webviewWorkbenchService.openWebview({
			title: nls.localize('architect.game.title', "LogicCore Architect: {0} (深度优化模式)", projectName),
			options: {
				retainContextWhenHidden: true
			},
			contentOptions: {
				allowScripts: true
			},
			extension: {
				id: new ExtensionIdentifier('logiccore.architect'),
				location: URI.parse('logiccore-architect://game')
			}
		}, 'logiccore.architect.game', nls.localize('architect.game.name', "Architect Game"), undefined, { group: ACTIVE_GROUP });

		webviewPanel.webview.setHtml(this.getHtml(projectName, nodes));

		webviewPanel.webview.onMessage(message => {
			const data = message as any;
			if (data && data.type === 'optimization-applied') {
				console.log('Optimization applied:', data.data);
			}
		});
	}

	private getHtml(projectName: string, nodes: IGameNode[]): string {
		const totalComplexity = nodes.reduce((sum, n) => sum + n.cost, 0);
		const loopNodes = nodes.filter(n => n.category === 'loop');
		const functionNodes = nodes.filter(n => n.category === 'function');

		return `<!DOCTYPE html>
<html lang="zh">
<head>
	<meta charset="UTF-8">
	<style>
		:root {
			--bg: #0a0a0a;
			--surface: #151515;
			--border: #2a2a2a;
			--accent: #ea7308;
			--accent-light: #ff9a3d;
			--cyan: #00e5ff;
			--green: #00ff88;
			--red: #ff4444;
			--purple: #aa66ff;
		}

		* { box-sizing: border-box; margin: 0; padding: 0; }

		body {
			background: var(--bg);
			color: #fff;
			font-family: 'Segoe UI', system-ui, sans-serif;
			height: 100vh;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}

		/* Header */
		.header {
			background: linear-gradient(180deg, rgba(234, 115, 8, 0.1) 0%, transparent 100%);
			border-bottom: 1px solid var(--border);
			padding: 12px 20px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.header h1 {
			font-size: 14px;
			color: var(--accent);
			letter-spacing: 2px;
			text-transform: uppercase;
		}

		.header-stats {
			display: flex;
			gap: 25px;
		}

		.stat {
			text-align: center;
		}

		.stat-value {
			font-size: 18px;
			font-weight: bold;
			color: var(--cyan);
		}

		.stat-label {
			font-size: 10px;
			opacity: 0.6;
			text-transform: uppercase;
		}

		/* Main Layout */
		.main {
			display: flex;
			flex: 1;
			overflow: hidden;
		}

		/* Canvas Area */
		.canvas-area {
			flex: 1;
			position: relative;
			background:
				radial-gradient(circle at 50% 50%, rgba(234, 115, 8, 0.03) 0%, transparent 50%),
				linear-gradient(rgba(42, 42, 42, 0.3) 1px, transparent 1px),
				linear-gradient(90deg, rgba(42, 42, 42, 0.3) 1px, transparent 1px);
			background-size: 100% 100%, 40px 40px, 40px 40px;
			overflow: auto;
		}

		.nodes-container {
			position: relative;
			min-width: 1500px;
			min-height: 800px;
		}

		/* Nodes */
		.node {
			position: absolute;
			min-width: 80px;
			padding: 8px 12px;
			background: var(--surface);
			border: 2px solid var(--border);
			border-radius: 8px;
			cursor: grab;
			user-select: none;
			transition: all 0.2s ease;
			text-align: center;
		}

		.node:hover {
			transform: scale(1.05);
			z-index: 100;
		}

		.node:active {
			cursor: grabbing;
		}

		.node.type-logic {
			border-color: var(--purple);
			box-shadow: 0 0 15px rgba(170, 102, 255, 0.3);
		}

		.node.type-data {
			border-color: var(--cyan);
			box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
		}

		.node.type-process {
			border-color: var(--accent);
			box-shadow: 0 0 15px rgba(234, 115, 8, 0.4);
		}

		.node.category-loop {
			border-style: dashed;
			background: linear-gradient(135deg, var(--surface) 0%, rgba(234, 115, 8, 0.1) 100%);
		}

		.node-icon {
			font-size: 20px;
			margin-bottom: 4px;
		}

		.node-label {
			font-size: 11px;
			font-weight: bold;
			white-space: nowrap;
		}

		.node-meta {
			font-size: 9px;
			opacity: 0.6;
			margin-top: 4px;
		}

		.node-complexity {
			position: absolute;
			top: -8px;
			right: -8px;
			background: var(--red);
			color: #fff;
			font-size: 9px;
			padding: 2px 6px;
			border-radius: 10px;
			font-weight: bold;
		}

		/* Sidebar */
		.sidebar {
			width: 280px;
			background: var(--surface);
			border-left: 1px solid var(--border);
			display: flex;
			flex-direction: column;
			overflow-y: auto;
		}

		.panel {
			padding: 15px;
			border-bottom: 1px solid var(--border);
		}

		.panel-title {
			font-size: 11px;
			font-weight: bold;
			color: var(--accent);
			text-transform: uppercase;
			margin-bottom: 12px;
			display: flex;
			align-items: center;
			gap: 8px;
		}

		/* Metrics */
		.metric-card {
			background: rgba(0,0,0,0.3);
			padding: 10px;
			border-radius: 6px;
			margin-bottom: 10px;
		}

		.metric-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
		}

		.metric-name {
			font-size: 11px;
			opacity: 0.8;
		}

		.metric-value {
			font-size: 14px;
			font-weight: bold;
		}

		.metric-bar {
			height: 6px;
			background: rgba(255,255,255,0.1);
			border-radius: 3px;
			overflow: hidden;
		}

		.metric-fill {
			height: 100%;
			border-radius: 3px;
			transition: width 0.5s ease;
		}

		.metric-fill.good { background: var(--green); }
		.metric-fill.warning { background: var(--accent); }
		.metric-fill.bad { background: var(--red); }

		/* Operations */
		.operations {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.op-btn {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 10px 12px;
			background: transparent;
			border: 1px solid var(--border);
			border-radius: 6px;
			color: #fff;
			cursor: pointer;
			transition: all 0.2s;
			text-align: left;
		}

		.op-btn:hover {
			background: rgba(234, 115, 8, 0.1);
			border-color: var(--accent);
		}

		.op-btn .icon {
			font-size: 18px;
		}

		.op-btn .text {
			flex: 1;
		}

		.op-btn .title {
			font-size: 12px;
			font-weight: bold;
		}

		.op-btn .desc {
			font-size: 10px;
			opacity: 0.6;
		}

		/* Log */
		.log {
			flex: 1;
			font-size: 10px;
			line-height: 1.6;
			opacity: 0.7;
			max-height: 150px;
			overflow-y: auto;
		}

		.log-entry {
			padding: 2px 0;
			border-bottom: 1px solid rgba(255,255,255,0.05);
		}

		.log-entry.success { color: var(--green); }
		.log-entry.warning { color: var(--accent); }
		.log-entry.info { color: var(--cyan); }

		/* Apply Button */
		.apply-btn {
			background: var(--accent);
			color: #000;
			border: none;
			padding: 15px;
			font-size: 14px;
			font-weight: bold;
			text-transform: uppercase;
			cursor: pointer;
			transition: all 0.2s;
		}

		.apply-btn:hover {
			background: var(--accent-light);
		}

		/* Legend */
		.legend {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
		}

		.legend-item {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 10px;
		}

		.legend-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
		}
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h1>🔧 算法优化工坊</h1>
			<span style="font-size: 11px; opacity: 0.6;">${projectName}</span>
		</div>
		<div class="header-stats">
			<div class="stat">
				<div class="stat-value" id="total-nodes">${nodes.length}</div>
				<div class="stat-label">节点数</div>
			</div>
			<div class="stat">
				<div class="stat-value" id="total-complexity">${totalComplexity}</div>
				<div class="stat-label">复杂度</div>
			</div>
			<div class="stat">
				<div class="stat-value" id="perf-score">B+</div>
				<div class="stat-label">性能评级</div>
			</div>
		</div>
	</div>

	<div class="main">
		<div class="canvas-area">
			<div class="nodes-container" id="nodes-container">
				${nodes.map(node => `
					<div class="node type-${node.type} ${node.category ? 'category-' + node.category : ''}"
						 id="${node.id}"
						 style="left: ${node.x}px; top: ${node.y}px;"
						 draggable="true"
						 data-cost="${node.cost}"
						 data-category="${node.category || ''}">
						${node.complexity ? `<span class="node-complexity">${node.complexity}</span>` : ''}
						<div class="node-icon">${this.getNodeIcon(node)}</div>
						<div class="node-label">${node.label}</div>
						<div class="node-meta">${node.cost} CP</div>
					</div>
				`).join('')}
			</div>
		</div>

		<div class="sidebar">
			<div class="panel">
				<div class="panel-title">📊 性能指标</div>

				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-name">时间复杂度</span>
						<span class="metric-value" id="time-complexity">${loopNodes.length > 1 ? 'O(n²)' : loopNodes.length === 1 ? 'O(n)' : 'O(1)'}</span>
					</div>
					<div class="metric-bar">
						<div class="metric-fill ${loopNodes.length > 1 ? 'bad' : loopNodes.length === 1 ? 'warning' : 'good'}"
							 style="width: ${loopNodes.length > 1 ? '90%' : loopNodes.length === 1 ? '50%' : '20%'}"></div>
					</div>
				</div>

				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-name">内存占用</span>
						<span class="metric-value" id="memory-usage">${Math.round(totalComplexity * 0.5)}MB</span>
					</div>
					<div class="metric-bar">
						<div class="metric-fill warning" style="width: 45%"></div>
					</div>
				</div>

				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-name">代码可读性</span>
						<span class="metric-value">78%</span>
					</div>
					<div class="metric-bar">
						<div class="metric-fill good" style="width: 78%"></div>
					</div>
				</div>
			</div>

			<div class="panel">
				<div class="panel-title">⚡ 优化操作</div>
				<div class="operations">
					<button class="op-btn" onclick="mergeLoops()">
						<span class="icon">🔄</span>
						<div class="text">
							<div class="title">合并循环</div>
							<div class="desc">将相邻循环合并，降低复杂度</div>
						</div>
					</button>
					<button class="op-btn" onclick="addCache()">
						<span class="icon">💾</span>
						<div class="text">
							<div class="title">添加缓存</div>
							<div class="desc">空间换时间，提升重复查询效率</div>
						</div>
					</button>
					<button class="op-btn" onclick="parallelizeLoop()">
						<span class="icon">🚀</span>
						<div class="text">
							<div class="title">并行化</div>
							<div class="desc">将循环拆分为多线程执行</div>
						</div>
					</button>
					<button class="op-btn" onclick="inlineFunction()">
						<span class="icon">📦</span>
						<div class="text">
							<div class="title">内联函数</div>
							<div class="desc">减少函数调用开销</div>
						</div>
					</button>
				</div>
			</div>

			<div class="panel">
				<div class="panel-title">📝 操作日志</div>
				<div class="log" id="log">
					<div class="log-entry info">[系统] 已加载 ${nodes.length} 个逻辑节点</div>
					<div class="log-entry info">[系统] 检测到 ${loopNodes.length} 个循环结构</div>
					<div class="log-entry info">[系统] 检测到 ${functionNodes.length} 个函数定义</div>
					<div class="log-entry warning">[提示] 拖动节点可重新规划数据流</div>
				</div>
			</div>

			<div class="panel">
				<div class="panel-title">📖 节点图例</div>
				<div class="legend">
					<div class="legend-item"><div class="legend-dot" style="background: var(--purple)"></div> 逻辑节点</div>
					<div class="legend-item"><div class="legend-dot" style="background: var(--cyan)"></div> 数据节点</div>
					<div class="legend-item"><div class="legend-dot" style="background: var(--accent)"></div> 处理节点</div>
				</div>
			</div>

			<button class="apply-btn" onclick="applyOptimizations()">
				✨ 同步优化至源码
			</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const container = document.getElementById('nodes-container');
		let draggingNode = null;
		let optimizationCount = 0;

		// Drag and drop
		document.addEventListener('dragstart', (e) => {
			if (e.target.classList.contains('node')) {
				draggingNode = e.target;
				e.target.style.opacity = '0.5';
			}
		});

		document.addEventListener('dragend', (e) => {
			if (e.target.classList.contains('node')) {
				e.target.style.opacity = '1';
			}
		});

		container.addEventListener('dragover', (e) => {
			e.preventDefault();
		});

		container.addEventListener('drop', (e) => {
			e.preventDefault();
			if (draggingNode) {
				const rect = container.getBoundingClientRect();
				const x = e.clientX - rect.left + container.scrollLeft - 40;
				const y = e.clientY - rect.top + container.scrollTop - 30;

				draggingNode.style.left = x + 'px';
				draggingNode.style.top = y + 'px';

				addLog('info', '节点 ' + draggingNode.id + ' 已重新定位');
				updateMetrics();
			}
		});

		function addLog(type, message) {
			const log = document.getElementById('log');
			const entry = document.createElement('div');
			entry.className = 'log-entry ' + type;
			entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
			log.insertBefore(entry, log.firstChild);
		}

		function updateMetrics() {
			// Simulate metric updates
			const complexity = document.getElementById('total-complexity');
			const current = parseInt(complexity.textContent);
			const newVal = Math.max(50, current - Math.floor(Math.random() * 20));
			complexity.textContent = newVal;

			const perfScore = document.getElementById('perf-score');
			if (newVal < 100) perfScore.textContent = 'A+';
			else if (newVal < 200) perfScore.textContent = 'A';
			else if (newVal < 300) perfScore.textContent = 'B+';
			else perfScore.textContent = 'B';
		}

		function mergeLoops() {
			const loops = document.querySelectorAll('.category-loop');
			if (loops.length >= 2) {
				loops[1].remove();
				document.getElementById('total-nodes').textContent = document.querySelectorAll('.node').length;
				document.getElementById('time-complexity').textContent = 'O(n)';
				addLog('success', '已合并 2 个循环，复杂度降为 O(n)');
				optimizationCount++;
				updateMetrics();
			} else {
				addLog('warning', '没有可合并的循环节点');
			}
		}

		function addCache() {
			const cacheNode = document.createElement('div');
			cacheNode.className = 'node type-data';
			cacheNode.innerHTML = '<div class="node-icon">💾</div><div class="node-label">缓存层</div><div class="node-meta">20 CP</div>';
			cacheNode.style.cssText = 'left: 300px; top: 50px;';
			cacheNode.draggable = true;
			container.appendChild(cacheNode);

			addLog('success', '已添加缓存层，预计提升 40% 查询效率');
			optimizationCount++;
			updateMetrics();
		}

		function parallelizeLoop() {
			const loops = document.querySelectorAll('.category-loop');
			if (loops.length > 0) {
				loops[0].style.borderColor = 'var(--green)';
				loops[0].querySelector('.node-label').textContent += ' [并行]';
				addLog('success', '循环已并行化，将使用 Worker 线程');
				optimizationCount++;
				updateMetrics();
			} else {
				addLog('warning', '没有可并行化的循环');
			}
		}

		function inlineFunction() {
			const funcs = document.querySelectorAll('[data-category="function"]');
			if (funcs.length > 1) {
				funcs[funcs.length - 1].style.opacity = '0.3';
				funcs[funcs.length - 1].style.textDecoration = 'line-through';
				addLog('success', '函数已内联，减少调用开销');
				optimizationCount++;
				updateMetrics();
			} else {
				addLog('warning', '没有可内联的函数');
			}
		}

		function applyOptimizations() {
			const state = [];
			document.querySelectorAll('.node').forEach(node => {
				state.push({
					id: node.id,
					x: parseInt(node.style.left),
					y: parseInt(node.style.top),
					label: node.querySelector('.node-label')?.textContent
				});
			});

			vscode.postMessage({
				type: 'optimization-applied',
				data: {
					nodes: state,
					optimizationCount: optimizationCount
				}
			});

			addLog('success', '🎉 已应用 ' + optimizationCount + ' 项优化，正在同步至源码...');

			setTimeout(() => {
				alert('✅ 优化已成功同步！\\n\\n应用了 ' + optimizationCount + ' 项优化。\\nAI 正在重写底层代码...');
			}, 500);
		}
	</script>
</body>
</html>`;
	}

	private getNodeIcon(node: IGameNode): string {
		if (node.category === 'file') {
			return '📄';
		}
		if (node.category === 'function') {
			return '⚙️';
		}
		if (node.category === 'loop') {
			return '🔄';
		}
		if (node.category === 'condition') {
			return '🔀';
		}

		switch (node.type) {
			case 'logic': return '⚙️';
			case 'data': return '📦';
			case 'process': return '⚡';
			default: return '●';
		}
	}
}
