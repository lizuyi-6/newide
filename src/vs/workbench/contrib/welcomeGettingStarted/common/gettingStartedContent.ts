/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import themePickerContent from './media/theme_picker.js';
import themePickerSmallContent from './media/theme_picker_small.js';
import notebookProfileContent from './media/notebookProfile.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { URI } from '../../../../base/common/uri.js';
import product from '../../../../platform/product/common/product.js';

interface IGettingStartedContentProvider {
	(): string;
}

const defaultChat = {
	documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
	manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
	provider: product.defaultChatAgent?.provider ?? { default: { name: '' } },
	publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
	termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
	privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? ''
};

export const copilotSettingsMessage = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "{0} Copilot may show [public code]({1}) suggestions and use your data to improve the product. You can change these [settings]({2}) anytime.", defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);

class GettingStartedContentProviderRegistry {

	private readonly providers = new Map<string, IGettingStartedContentProvider>();

	registerProvider(moduleId: string, provider: IGettingStartedContentProvider): void {
		this.providers.set(moduleId, provider);
	}

	getProvider(moduleId: string): IGettingStartedContentProvider | undefined {
		return this.providers.get(moduleId);
	}
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();

export async function moduleToContent(resource: URI): Promise<string> {
	if (!resource.query) {
		throw new Error('Getting Started: invalid resource');
	}

	const query = JSON.parse(resource.query);
	if (!query.moduleId) {
		throw new Error('Getting Started: invalid resource');
	}

	const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
	if (!provider) {
		throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
	}

	return provider();
}

gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker_small', themePickerSmallContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);
// Register empty media for accessibility walkthrough
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/empty', () => '');

const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize('getting-started-setup-icon', "Icon used for the setup category of welcome page"));
const beginnerIcon = registerIcon('getting-started-beginner', Codicon.lightbulb, localize('getting-started-beginner-icon', "Icon used for the beginner category of welcome page"));

export type BuiltinGettingStartedStep = {
	id: string;
	title: string;
	description: string;
	completionEvents?: string[];
	when?: string;
	media:
	| { type: 'image'; path: string | { hc: string; hcLight?: string; light: string; dark: string }; altText: string }
	| { type: 'svg'; path: string; altText: string }
	| { type: 'markdown'; path: string }
	| { type: 'video'; path: string | { hc: string; hcLight?: string; light: string; dark: string }; poster?: string | { hc: string; hcLight?: string; light: string; dark: string }; altText: string };
};

export type BuiltinGettingStartedCategory = {
	id: string;
	title: string;
	description: string;
	isFeatured: boolean;
	next?: string;
	icon: ThemeIcon;
	when?: string;
	content:
	| { type: 'steps'; steps: BuiltinGettingStartedStep[] };
	walkthroughPageTitle: string;
};

export type BuiltinGettingStartedStartEntry = {
	id: string;
	title: string;
	description: string;
	icon: ThemeIcon;
	when?: string;
	content:
	| { type: 'startEntry'; command: string };
};

type GettingStartedWalkthroughContent = BuiltinGettingStartedCategory[];
type GettingStartedStartEntryContent = BuiltinGettingStartedStartEntry[];

export const startEntries: GettingStartedStartEntryContent = [
	{
		id: 'welcome.showNewFileEntries',
		title: localize('gettingStarted.newFile.title', "新建文件..."),
		description: localize('gettingStarted.newFile.description', "新建文本文件、笔记本或自定义编辑器。"),
		icon: Codicon.newFile,
		content: {
			type: 'startEntry',
			command: 'command:welcome.showNewFileEntries',
		}
	},
	{
		id: 'topLevelOpenMac',
		title: localize('gettingStarted.openMac.title', "打开..."),
		description: localize('gettingStarted.openMac.description', "打开文件或文件夹以开始工作"),
		icon: Codicon.folderOpened,
		when: '!isWeb && isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFileFolder',
		}
	},
	{
		id: 'topLevelOpenFile',
		title: localize('gettingStarted.openFile.title', "打开文件..."),
		description: localize('gettingStarted.openFile.description', "打开文件以开始工作"),
		icon: Codicon.goToFile,
		when: 'isWeb || !isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFile',
		}
	},
	{
		id: 'topLevelOpenFolder',
		title: localize('gettingStarted.openFolder.title', "打开文件夹..."),
		description: localize('gettingStarted.openFolder.description', "打开文件夹以开始工作"),
		icon: Codicon.folderOpened,
		when: '!isWeb && !isMac',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFolder',
		}
	},
	{
		id: 'topLevelOpenFolderWeb',
		title: localize('gettingStarted.openFolder.title', "打开文件夹..."),
		description: localize('gettingStarted.openFolder.description', "打开文件夹以开始工作"),
		icon: Codicon.folderOpened,
		when: '!openFolderWorkspaceSupport && workbenchState == \'workspace\'',
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.files.openFolderViaWorkspace',
		}
	},
	{
		id: 'topLevelGitClone',
		title: localize('gettingStarted.topLevelGitClone.title', "克隆 Git 仓库..."),
		description: localize('gettingStarted.topLevelGitClone.description', "克隆远程仓库到本地"),
		when: 'config.git.enabled && !git.missing',
		icon: Codicon.sourceControl,
		content: {
			type: 'startEntry',
			command: 'command:git.clone',
		}
	},
	{
		id: 'topLevelGitOpen',
		title: localize('gettingStarted.topLevelGitOpen.title', "打开仓库..."),
		description: localize('gettingStarted.topLevelGitOpen.description', "连接到远程仓库或 PR 以浏览、搜索、编辑和提交"),
		when: 'workspacePlatform == \'webworker\'',
		icon: Codicon.sourceControl,
		content: {
			type: 'startEntry',
			command: 'command:remoteHub.openRepository',
		}
	},
	{
		id: 'topLevelRemoteOpen',
		title: localize('gettingStarted.topLevelRemoteOpen.title', "连接到..."),
		description: localize('gettingStarted.topLevelRemoteOpen.description', "连接到远程开发工作区。"),
		when: '!isWeb',
		icon: Codicon.remote,
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.remote.showMenu',
		}
	},
	{
		id: 'topLevelOpenTunnel',
		title: localize('gettingStarted.topLevelOpenTunnel.title', "打开隧道..."),
		description: localize('gettingStarted.topLevelOpenTunnel.description', "通过隧道连接到远程机器"),
		when: 'isWeb && showRemoteStartEntryInWeb',
		icon: Codicon.remote,
		content: {
			type: 'startEntry',
			command: 'command:workbench.action.remote.showWebStartEntryActions',
		}
	},
	{
		id: 'topLevelNewWorkspaceChat',
		title: localize('gettingStarted.newWorkspaceChat.title', "生成新工作区..."),
		description: localize('gettingStarted.newWorkspaceChat.description', "对话以创建新工作区"),
		icon: Codicon.chatSparkle,
		when: '!isWeb && !chatSetupHidden',
		content: {
			type: 'startEntry',
			command: 'command:welcome.newWorkspaceChat',
		}
	},
];

const Button = (title: string, href: string) => `[${title}](${href})`;

const CopilotStepTitle = localize('gettingStarted.copilotSetup.title', "Use AI features with Copilot for free");
const CopilotDescription = localize({ key: 'gettingStarted.copilotSetup.description', comment: ['{Locked="["}', '{Locked="]({0})"}'] }, "You can use [Copilot]({0}) to generate code across multiple files, fix errors, ask questions about your code, and much more using natural language.", defaultChat.documentationUrl ?? '');
const CopilotTermsString = localize({ key: 'gettingStarted.copilotSetup.terms', comment: ['{Locked="]({2})"}', '{Locked="]({3})"}'] }, "By continuing with {0} Copilot, you agree to {1}'s [Terms]({2}) and [Privacy Statement]({3})", defaultChat.provider.default.name, defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
const CopilotAnonymousButton = Button(localize('setupCopilotButton.setup', "Use AI Features"), `command:workbench.action.chat.triggerSetupAnonymousWithoutDialog`);
const CopilotSignedOutButton = Button(localize('setupCopilotButton.setup', "Use AI Features"), `command:workbench.action.chat.triggerSetup`);
const CopilotSignedInButton = Button(localize('setupCopilotButton.setup', "Use AI Features"), `command:workbench.action.chat.triggerSetup`);
const CopilotCompleteButton = Button(localize('setupCopilotButton.chatWithCopilot', "Start to Chat"), 'command:workbench.action.chat.open');

function createCopilotSetupStep(id: string, button: string, when: string, includeTerms: boolean): BuiltinGettingStartedStep {
	const description = includeTerms ?
		`${CopilotDescription}\n${CopilotTermsString}\n${button}` :
		`${CopilotDescription}\n${button}`;

	return {
		id,
		title: CopilotStepTitle,
		description,
		when: `${when} && !chatSetupHidden`,
		media: {
			type: 'svg', altText: 'VS Code Copilot multi file edits', path: 'multi-file-edits.svg'
		},
	};
}

export const walkthroughs: GettingStartedWalkthroughContent = [
	{
		id: 'Setup',
		title: localize('gettingStarted.setup.title', "开始使用 LogicCore"),
		description: localize('gettingStarted.setup.description', "自定义您的编辑器，学习基础知识，并开始编码"),
		isFeatured: true,
		icon: setupIcon,
		when: '!isWeb',
		walkthroughPageTitle: localize('gettingStarted.setup.walkthroughPageTitle', 'LogicCore 设置向导'),
		next: 'Beginner',
		content: {
			type: 'steps',
			steps: [
				createCopilotSetupStep('CopilotSetupAnonymous', CopilotAnonymousButton, 'chatAnonymous && !chatSetupInstalled', true),
				createCopilotSetupStep('CopilotSetupSignedOut', CopilotSignedOutButton, 'chatEntitlementSignedOut && !chatAnonymous', false),
				createCopilotSetupStep('CopilotSetupComplete', CopilotCompleteButton, 'chatSetupInstalled && !chatSetupDisabled && (chatAnonymous || chatPlanPro || chatPlanProPlus || chatPlanBusiness || chatPlanEnterprise || chatPlanFree)', false),
				createCopilotSetupStep('CopilotSetupSignedIn', CopilotSignedInButton, '!chatEntitlementSignedOut && (!chatSetupInstalled || chatSetupDisabled || chatPlanCanSignUp)', false),
				{
					id: 'pickColorTheme',
					title: localize('gettingStarted.pickColor.title', "选择您的主题"),
					description: localize('gettingStarted.pickColor.description.interpolated', "合适的主题能帮您更专注，保护眼睛，让编程更有趣。\n{0}", Button(localize('titleID', "浏览颜色主题"), 'command:workbench.action.selectTheme')),
					completionEvents: [
						'onSettingChanged:workbench.colorTheme',
						'onCommand:workbench.action.selectTheme'
					],
					media: { type: 'markdown', path: 'theme_picker', }
				},
				{
					id: 'videoTutorial',
					title: localize('gettingStarted.videoTutorial.title', "观看视频教程"),
					description: localize('gettingStarted.videoTutorial.description.interpolated', "观看一系列简短实用的 LogicCore 核心功能视频教程。\n{0}", Button(localize('watch', "观看教程"), 'https://aka.ms/vscode-getting-started-video')),
					media: { type: 'svg', altText: 'LogicCore 设置', path: 'learn.svg' },
				}
			]
		}
	},

	{
		id: 'SetupWeb',
		title: localize('gettingStarted.setupWeb.title', "开始使用 LogicCore 网页版"),
		description: localize('gettingStarted.setupWeb.description', "自定义您的编辑器，学习基础知识，并开始编码"),
		isFeatured: true,
		icon: setupIcon,
		when: 'isWeb',
		next: 'Beginner',
		walkthroughPageTitle: localize('gettingStarted.setupWeb.walkthroughPageTitle', 'LogicCore 网页版设置'),
		content: {
			type: 'steps',
			steps: [
				{
					id: 'pickColorThemeWeb',
					title: localize('gettingStarted.pickColor.title', "选择您的主题"),
					description: localize('gettingStarted.pickColor.description.interpolated', "合适的主题能帮您更专注，保护眼睛，让编程更有趣。\n{0}", Button(localize('titleID', "浏览颜色主题"), 'command:workbench.action.selectTheme')),
					completionEvents: [
						'onSettingChanged:workbench.colorTheme',
						'onCommand:workbench.action.selectTheme'
					],
					media: { type: 'markdown', path: 'theme_picker', }
				},
				{
					id: 'menuBarWeb',
					title: localize('gettingStarted.menuBar.title', "恰到好处的界面"),
					description: localize('gettingStarted.menuBar.description.interpolated', "完整的菜单栏已收纳到下拉菜单中，为代码腾出更多空间。您可以随时切换其显示状态。\n{0}", Button(localize('toggleMenuBar', "切换菜单栏"), 'command:workbench.action.toggleMenuBar')),
					when: 'isWeb',
					media: {
						type: 'svg', altText: '对比菜单下拉与可见菜单栏', path: 'menuBar.svg'
					},
				},
				{
					id: 'extensionsWebWeb',
					title: localize('gettingStarted.extensions.title', "使用扩展编程"),
					description: localize('gettingStarted.extensionsWeb.description.interpolated', "扩展是 LogicCore 的超能力。越来越多的扩展已支持网页版。\n{0}", Button(localize('browsePopularWeb', "浏览热门网页扩展"), 'command:workbench.extensions.action.showPopularExtensions')),
					when: 'workspacePlatform == \'webworker\'',
					media: {
						type: 'svg', altText: 'LogicCore 扩展市场', path: 'extensions-web.svg'
					},
				},
				{
					id: 'findLanguageExtensionsWeb',
					title: localize('gettingStarted.findLanguageExts.title', "支持所有语言"),
					description: localize('gettingStarted.findLanguageExts.description.interpolated', "通过语法高亮、内联建议、Lint 和调试更智能地编程。除了内置语言外，还可以通过扩展支持更多语言。\n{0}", Button(localize('browseLangExts', "浏览语言扩展"), 'command:workbench.extensions.action.showLanguageExtensions')),
					when: 'workspacePlatform != \'webworker\'',
					media: {
						type: 'svg', altText: '语言扩展', path: 'languages.svg'
					},
				},
				{
					id: 'settingsSyncWeb',
					title: localize('gettingStarted.settingsSync.title', "多设备同步设置"),
					description: localize('gettingStarted.settingsSync.description.interpolated', "在所有设备上备份并同步您的关键自定义设置。\n{0}", Button(localize('enableSync', "备份并同步设置"), 'command:workbench.userDataSync.actions.turnOn')),
					when: 'syncStatus != uninitialized',
					completionEvents: ['onEvent:sync-enabled'],
					media: {
						type: 'svg', altText: '设置菜单中的开启同步选项', path: 'settingsSync.svg'
					},
				},
				{
					id: 'commandPaletteTaskWeb',
					title: localize('gettingStarted.commandPalette.title', "命令面板提升效率"),
					description: localize('gettingStarted.commandPalette.description.interpolated', "无需鼠标，在 LogicCore 中完成任何任务。\n{0}", Button(localize('commandPalette', "打开命令面板"), 'command:workbench.action.showCommands')),
					media: { type: 'svg', altText: '用于搜索和执行命令的命令面板', path: 'commandPalette.svg' },
				},
				{
					id: 'pickAFolderTask-WebWeb',
					title: localize('gettingStarted.setup.OpenFolder.title', "打开代码"),
					description: localize('gettingStarted.setup.OpenFolderWeb.description.interpolated', "准备好开始编码了吗？您可以打开本地项目或远程仓库。\n{0}\n{1}", Button(localize('openFolder', "打开文件夹"), 'command:workbench.action.addRootFolder'), Button(localize('openRepository', "打开仓库"), 'command:remoteHub.openRepository')),
					when: 'workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: '资源管理器视图显示打开文件夹和克隆仓库按钮', path: 'openFolder.svg'
					}
				},
				{
					id: 'quickOpenWeb',
					title: localize('gettingStarted.quickOpen.title', "快速文件导航"),
					description: localize('gettingStarted.quickOpen.description.interpolated', "一键在文件间瞬间切换。小贴士：按右箭头键打开多个文件。\n{0}", Button(localize('quickOpen', "快速打开文件"), 'command:toSide:workbench.action.quickOpen')),
					when: 'workspaceFolderCount != 0',
					media: {
						type: 'svg', altText: '在快速搜索中跳转文件', path: 'search.svg'
					}
				}
			]
		}
	},
	{
		id: 'SetupAccessibility',
		title: localize('gettingStarted.setupAccessibility.title', "无障碍功能入门"),
		description: localize('gettingStarted.setupAccessibility.description', "了解让 LogicCore 更易用的工具和快捷键。"),
		isFeatured: true,
		icon: setupIcon,
		when: CONTEXT_ACCESSIBILITY_MODE_ENABLED.key,
		next: 'Setup',
		walkthroughPageTitle: localize('gettingStarted.setupAccessibility.walkthroughPageTitle', 'LogicCore 无障碍设置'),
		content: {
			type: 'steps',
			steps: [
				{
					id: 'accessibilityHelp',
					title: localize('gettingStarted.accessibilityHelp.title', "使用无障碍帮助对话框了解功能"),
					description: localize('gettingStarted.accessibilityHelp.description.interpolated', "无障碍帮助对话框提供功能说明及操作快捷键。\n 当焦点在编辑器、终端、笔记本、聊天响应、评论或调试控制台时，可打开相关对话框。\n{0}", Button(localize('openAccessibilityHelp', "打开无障碍帮助"), 'command:editor.action.accessibilityHelp')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'accessibleView',
					title: localize('gettingStarted.accessibleView.title', "屏幕阅读器用户可逐行逐字检查内容"),
					description: localize('gettingStarted.accessibleView.description.interpolated', "无障碍视图适用于终端、悬停、通知、评论、笔记本输出、聊天响应、内联补全和调试控制台。\n 当焦点在这些功能上时，可打开无障碍视图。\n{0}", Button(localize('openAccessibleView', "打开无障碍视图"), 'command:editor.action.accessibleView')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'verbositySettings',
					title: localize('gettingStarted.verbositySettings.title', "控制 Aria 标签的详细程度"),
					description: localize('gettingStarted.verbositySettings.description.interpolated', "屏幕阅读器详细程度设置可避免重复听到已熟悉功能的操作提示。\n 这些设置可通过“打开无障碍设置”命令配置。\n{0}", Button(localize('openVerbositySettings', "打开无障碍设置"), 'command:workbench.action.openAccessibilitySettings')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'commandPaletteTaskAccessibility',
					title: localize('gettingStarted.commandPaletteAccessibility.title', "命令面板提升效率"),
					description: localize('gettingStarted.commandPaletteAccessibility.description.interpolated', "无需鼠标，在 LogicCore 中完成任何任务。\n{0}", Button(localize('commandPalette', "打开命令面板"), 'command:workbench.action.showCommands')),
					media: { type: 'markdown', path: 'empty' },
				},
				{
					id: 'keybindingsAccessibility',
					title: localize('gettingStarted.keyboardShortcuts.title', "自定义快捷键"),
					description: localize('gettingStarted.keyboardShortcuts.description.interpolated', "发现常用命令后，创建自定义快捷键以快速访问。\n{0}", Button(localize('keyboardShortcuts', "键盘快捷键"), 'command:toSide:workbench.action.openGlobalKeybindings')),
					media: {
						type: 'markdown', path: 'empty',
					}
				},
				{
					id: 'accessibilitySignals',
					title: localize('gettingStarted.accessibilitySignals.title', "微调音频或盲文设备的无障碍信号"),
					description: localize('gettingStarted.accessibilitySignals.description.interpolated', "工作台各类事件会播放无障碍声音和公告。\n 可通过列表命令查看和配置。\n{0}\n{1}", Button(localize('listSignalSounds', "列出信号声音"), 'command:signals.sounds.help'), Button(localize('listSignalAnnouncements', "列出信号公告"), 'command:accessibility.announcement.help')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'hover',
					title: localize('gettingStarted.hover.title', "在编辑器中悬停查看变量或符号详情"),
					description: localize('gettingStarted.hover.description.interpolated', "编辑器中聚焦变量或符号时，可使用“显示或聚焦悬停”命令。\n{0}", Button(localize('showOrFocusHover', "显示或聚焦悬停"), 'command:editor.action.showHover')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'goToSymbol',
					title: localize('gettingStarted.goToSymbol.title', "在文件中导航符号"),
					description: localize('gettingStarted.goToSymbol.description.interpolated', "“转到符号”命令可用于在文档重要路标间导航。\n{0}", Button(localize('openGoToSymbol', "转到符号"), 'command:editor.action.goToSymbol')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'codeFolding',
					title: localize('gettingStarted.codeFolding.title', "使用代码折叠聚焦关注区域"),
					description: localize('gettingStarted.codeFolding.description.interpolated', "使用“切换折叠”命令折叠代码段。\n{0}\n 或使用“递归切换折叠”\n{1}\n", Button(localize('toggleFold', "切换折叠"), 'command:editor.toggleFold'), Button(localize('toggleFoldRecursively', "递归切换折叠"), 'command:editor.toggleFoldRecursively')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'intellisense',
					title: localize('gettingStarted.intellisense.title', "使用智能感知提高编码效率"),
					description: localize('gettingStarted.intellisense.description.interpolated', "使用“触发智能感知”命令打开建议。\n{0}\n 使用“触发内联建议”触发内联补全\n{1}\n 相关设置包括 editor.inlineCompletionsAccessibilityVerbose 和 editor.screenReaderAnnounceInlineSuggestion。", Button(localize('triggerIntellisense', "触发智能感知"), 'command:editor.action.triggerSuggest'), Button(localize('triggerInlineSuggestion', '触发内联建议'), 'command:editor.action.inlineSuggest.trigger')),
					media: {
						type: 'markdown', path: 'empty'
					}
				},
				{
					id: 'accessibilitySettings',
					title: localize('gettingStarted.accessibilitySettings.title', "配置无障碍设置"),
					description: localize('gettingStarted.accessibilitySettings.description.interpolated', "运行“打开无障碍设置”命令进行配置。\n{0}", Button(localize('openAccessibilitySettings', "打开无障碍设置"), 'command:workbench.action.openAccessibilitySettings')),
					media: { type: 'markdown', path: 'empty' }
				},
				{
					id: 'dictation',
					title: localize('gettingStarted.dictation.title', "使用听写功能编写代码和文本"),
					description: localize('gettingStarted.dictation.description.interpolated', "听写允许您通过语音输入。在编辑器中使用“语音：开始听写”命令激活。\n{0}\n 在终端中，使用“语音：在终端开始听写”和“语音：在终端停止听写”命令。\n{1}\n{2}", Button(localize('toggleDictation', "语音：在编辑器开始听写"), 'command:workbench.action.editorDictation.start'), Button(localize('terminalStartDictation', "终端：开始听写"), 'command:workbench.action.terminal.startVoice'), Button(localize('terminalStopDictation', "终端：停止听写"), 'command:workbench.action.terminal.stopVoice')),
					when: 'hasSpeechProvider',
					media: { type: 'markdown', path: 'empty' }
				}
			]
		}
	},
	{
		id: 'Beginner',
		isFeatured: false,
		title: localize('gettingStarted.beginner.title', "学习基础知识"),
		icon: beginnerIcon,
		description: localize('gettingStarted.beginner.description', "迅速了解最核心功能"),
		walkthroughPageTitle: localize('gettingStarted.beginner.walkthroughPageTitle', '核心功能'),
		content: {
			type: 'steps',
			steps: [
				{
					id: 'settingsAndSync',
					title: localize('gettingStarted.settings.title', "调整设置"),
					description: localize('gettingStarted.settingsAndSync.description.interpolated', "自定义 LogicCore 的方方面面，并在设备间[同步](command:workbench.userDataSync.actions.turnOn)设置。\n{0}", Button(localize('tweakSettings', "打开设置"), 'command:toSide:workbench.action.openSettings')),
					when: 'workspacePlatform != \'webworker\' && syncStatus != uninitialized',
					completionEvents: ['onEvent:sync-enabled'],
					media: {
						type: 'svg', altText: 'LogicCore 设置', path: 'settings.svg'
					},
				},
				{
					id: 'extensions',
					title: localize('gettingStarted.extensions.title', "使用扩展编程"),
					description: localize('gettingStarted.extensions.description.interpolated', "扩展是 LogicCore 的超能力。从生产力工具到全新功能，应有尽有。\n{0}", Button(localize('browsePopular', "浏览热门扩展"), 'command:workbench.extensions.action.showPopularExtensions')),
					when: 'workspacePlatform != \'webworker\'',
					media: {
						type: 'svg', altText: '扩展市场与精选语言扩展', path: 'extensions.svg'
					},
				},
				{
					id: 'terminal',
					title: localize('gettingStarted.terminal.title', "内置终端"),
					description: localize('gettingStarted.terminal.description.interpolated', "在代码旁快速运行 Shell 命令并监控构建输出。\n{0}", Button(localize('showTerminal', "打开终端"), 'command:workbench.action.terminal.toggleTerminal')),
					when: 'workspacePlatform != \'webworker\' && remoteName != codespaces && !terminalIsOpen',
					media: {
						type: 'svg', altText: '运行 npm 命令的集成终端', path: 'terminal.svg'
					},
				},
				{
					id: 'debugging',
					title: localize('gettingStarted.debug.title', "实时调试代码"),
					description: localize('gettingStarted.debug.description.interpolated', "通过设置启动配置，加速编辑、构建、测试和调试循环。\n{0}", Button(localize('runProject', "运行项目"), 'command:workbench.action.debug.selectandstart')),
					when: 'workspacePlatform != \'webworker\' && workspaceFolderCount != 0',
					media: {
						type: 'svg', altText: '运行和调试视图', path: 'debug.svg',
					},
				},
				{
					id: 'scmClone',
					title: localize('gettingStarted.scm.title', "使用 Git 追踪代码"),
					description: localize('gettingStarted.scmClone.description.interpolated', "设置内置版本控制以追踪更改并与他人协作。\n{0}", Button(localize('cloneRepo', "克隆仓库"), 'command:git.clone')),
					when: 'config.git.enabled && !git.missing && workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: '源代码管理视图', path: 'git.svg',
					},
				},
				{
					id: 'scmSetup',
					title: localize('gettingStarted.scm.title', "使用 Git 追踪代码"),
					description: localize('gettingStarted.scmSetup.description.interpolated', "设置内置版本控制以追踪更改并与他人协作。\n{0}", Button(localize('initRepo', "初始化 Git 仓库"), 'command:git.init')),
					when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount == 0',
					media: {
						type: 'svg', altText: '源代码管理视图', path: 'git.svg',
					},
				},
				{
					id: 'scm',
					title: localize('gettingStarted.scm.title', "使用 Git 追踪代码"),
					description: localize('gettingStarted.scm.description.interpolated', "无需查阅 Git 命令！Git 和 GitHub 工作流已无缝集成。\n{0}", Button(localize('openSCM', "打开源代码管理"), 'command:workbench.view.scm')),
					when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount != 0 && activeViewlet != \'workbench.view.scm\'',
					media: {
						type: 'svg', altText: '源代码管理视图', path: 'git.svg',
					},
				},
				{
					id: 'installGit',
					title: localize('gettingStarted.installGit.title', "安装 Git"),
					description: localize({ key: 'gettingStarted.installGit.description.interpolated', comment: ['The placeholders are command link items should not be translated'] }, "安装 Git 以追踪项目变更。\n{0}\n{1}重载窗口{2} 以完成设置。", Button(localize('installGit', "安装 Git"), 'https://aka.ms/vscode-install-git'), '[', '](command:workbench.action.reloadWindow)'),
					when: 'git.missing',
					media: {
						type: 'svg', altText: '安装 Git', path: 'git.svg',
					},
					completionEvents: [
						'onContext:git.state == initialized'
					]
				},
				{
					id: 'tasks',
					title: localize('gettingStarted.tasks.title', "自动化项目任务"),
					when: 'workspaceFolderCount != 0 && workspacePlatform != \'webworker\'',
					description: localize('gettingStarted.tasks.description.interpolated', "为您的一般工作流创建任务，享受运行脚本和自动检查结果的集成体验。\n{0}", Button(localize('runTasks', "运行自动检测的任务"), 'command:workbench.action.tasks.runTask')),
					media: {
						type: 'svg', altText: '任务运行器', path: 'runTask.svg',
					},
				},
				{
					id: 'shortcuts',
					title: localize('gettingStarted.shortcuts.title', "自定义快捷键"),
					description: localize('gettingStarted.shortcuts.description.interpolated', "发现常用命令后，创建自定义快捷键以快速访问。\n{0}", Button(localize('keyboardShortcuts', "键盘快捷键"), 'command:toSide:workbench.action.openGlobalKeybindings')),
					media: {
						type: 'svg', altText: '交互式快捷键', path: 'shortcuts.svg',
					}
				},
				{
					id: 'workspaceTrust',
					title: localize('gettingStarted.workspaceTrust.title', "安全浏览和编辑代码"),
					description: localize('gettingStarted.workspaceTrust.description.interpolated', "{0} 让您决定项目文件夹是否允许自动执行代码（扩展、调试等必需）。\n打开文件/文件夹时会提示是否信任。此后您可以{1}。", Button(localize('workspaceTrust', "工作区信任"), 'https://code.visualstudio.com/docs/editor/workspace-trust'), Button(localize('enableTrust', "管理信任"), 'command:toSide:workbench.trust.manage')),
					when: 'workspacePlatform != \'webworker\' && !isWorkspaceTrusted && workspaceFolderCount == 0',
					media: {
						type: 'svg', altText: '受限模式下的工作区信任编辑器', path: 'workspaceTrust.svg'
					},
				},
			]
		}
	},
	{
		id: 'notebooks',
		title: localize('gettingStarted.notebook.title', "自定义笔记本"),
		description: '',
		icon: setupIcon,
		isFeatured: false,
		when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
		walkthroughPageTitle: localize('gettingStarted.notebook.walkthroughPageTitle', '笔记本'),
		content: {
			type: 'steps',
			steps: [
				{
					completionEvents: ['onCommand:notebook.setProfile'],
					id: 'notebookProfile',
					title: localize('gettingStarted.notebookProfile.title', "选择笔记本布局"),
					description: localize('gettingStarted.notebookProfile.description', "让笔记本符合您的使用习惯"),
					when: 'userHasOpenedNotebook',
					media: {
						type: 'markdown', path: 'notebookProfile'
					}
				},
			]
		}
	}
];
