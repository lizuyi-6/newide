/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isStandalone } from '../../base/browser/browser.js';
import { mainWindow } from '../../base/browser/window.js';
import { isLinux, isMacintosh, isNative, isWeb, isWindows } from '../../base/common/platform.js';
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions, ConfigurationScope, IConfigurationRegistry } from '../../platform/configuration/common/configurationRegistry.js';
import product from '../../platform/product/common/product.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { ConfigurationKeyValuePairs, ConfigurationMigrationWorkbenchContribution, DynamicWindowConfiguration, DynamicWorkbenchSecurityConfiguration, Extensions, IConfigurationMigrationRegistry, problemsConfigurationNodeBase, windowConfigurationNodeBase, workbenchConfigurationNodeBase } from '../common/configuration.js';
import { WorkbenchPhase, registerWorkbenchContribution2 } from '../common/contributions.js';
import { CustomEditorLabelService } from '../services/editor/common/customEditorLabelService.js';
import { ActivityBarPosition, EditorActionsLocation, EditorTabsMode, LayoutSettings } from '../services/layout/browser/layoutService.js';
import { defaultWindowTitle, defaultWindowTitleSeparator } from './parts/titlebar/windowTitle.js';
import { Action2, registerAction2 } from '../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../platform/instantiation/common/instantiation.js';

const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

// Configuration
(function registerConfiguration(): void {

	// Migration support
	registerWorkbenchContribution2(ConfigurationMigrationWorkbenchContribution.ID, ConfigurationMigrationWorkbenchContribution, WorkbenchPhase.Eventually);

	// Dynamic Configuration
	registerWorkbenchContribution2(DynamicWorkbenchSecurityConfiguration.ID, DynamicWorkbenchSecurityConfiguration, WorkbenchPhase.AfterRestored);

	// Workbench
	registry.registerConfiguration({
		...workbenchConfigurationNodeBase,
		'properties': {
			'workbench.externalBrowser': {
				type: 'string',
				markdownDescription: localize('browser', "配置用于在外部打开 http 或 https 链接的浏览器。这可以是浏览器的名称（`edge`、`chrome`、`firefox`）或浏览器可执行文件的绝对路径。如果未设置，将使用系统默认浏览器。"),
				included: isNative,
				restricted: true
			},
			'workbench.editor.titleScrollbarSizing': {
				type: 'string',
				enum: ['default', 'large'],
				enumDescriptions: [
					localize('workbench.editor.titleScrollbarSizing.default', "默认尺寸。"),
					localize('workbench.editor.titleScrollbarSizing.large', "增加尺寸，以便更容易用鼠标抓取。")
				],
				description: localize('tabScrollbarHeight', "控制编辑器标题区域中用于选项卡和导航路径的滚动条高度。"),
				default: 'default',
			},
			'workbench.editor.titleScrollbarVisibility': {
				type: 'string',
				enum: ['auto', 'visible', 'hidden'],
				enumDescriptions: [
					localize('workbench.editor.titleScrollbarVisibility.auto', "水平滚动条仅在必要时可见。"),
					localize('workbench.editor.titleScrollbarVisibility.visible', "水平滚动条始终可见。"),
					localize('workbench.editor.titleScrollbarVisibility.hidden', "水平滚动条始终隐藏。")
				],
				description: localize('titleScrollbarVisibility', "控制编辑器标题区域中用于选项卡和导航路径的滚动条可见性。"),
				default: 'auto',
			},
			[LayoutSettings.EDITOR_TABS_MODE]: {
				'type': 'string',
				'enum': [EditorTabsMode.MULTIPLE, EditorTabsMode.SINGLE, EditorTabsMode.NONE],
				'enumDescriptions': [
					localize('workbench.editor.showTabs.multiple', "每个编辑器在编辑器标题区域中显示为一个选项卡。"),
					localize('workbench.editor.showTabs.single', "活动编辑器在编辑器标题区域中显示为单个大选项卡。"),
					localize('workbench.editor.showTabs.none', "不显示编辑器标题区域。"),
				],
				'description': localize('showEditorTabs', "控制打开的编辑器是显示为单独的选项卡、单个大选项卡，還是不显示标题区域。"),
				'default': 'multiple'
			},
			[LayoutSettings.EDITOR_ACTIONS_LOCATION]: {
				'type': 'string',
				'enum': [EditorActionsLocation.DEFAULT, EditorActionsLocation.TITLEBAR, EditorActionsLocation.HIDDEN],
				'markdownEnumDescriptions': [
					localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'workbench.editor.editorActionsLocation.default' }, "当 {0} 设置为 {1} 时，在窗口标题栏中显示编辑器操作。否则，编辑器操作显示在编辑器选项卡栏中。", '`#workbench.editor.showTabs#`', '`none`'),
					localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'workbench.editor.editorActionsLocation.titleBar' }, "在窗口标题栏中显示编辑器操作。如果 {0} 设置为 {1}，则隐藏编辑器操作。", '`#window.customTitleBarVisibility#`', '`never`'),
					localize('workbench.editor.editorActionsLocation.hidden', "不显示编辑器操作。"),
				],
				'markdownDescription': localize('editorActionsLocation', "控制编辑器操作显示的位置。"),
				'default': 'default'
			},
			'workbench.editor.alwaysShowEditorActions': {
				'type': 'boolean',
				'markdownDescription': localize('alwaysShowEditorActions', "控制是否始终显示编辑器操作，即使编辑器组未处于活动状态。"),
				'default': false
			},
			'workbench.editor.wrapTabs': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'wrapTabs' }, "控制当超出可用空间时，选项卡是换行到多行还是显示滚动条。当 {0} 未设置为 '{1}' 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`'),
				'default': false
			},
			'workbench.editor.scrollToSwitchTabs': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'scrollToSwitchTabs' }, "控制是否通过滚动选项卡来切换它们。默认情况下，滚动只会显示选项卡，而不会切换。您可以按住 Shift 键并滚动来临时更改此行为。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`'),
				'default': false
			},
			'workbench.editor.highlightModifiedTabs': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'highlightModifiedTabs' }, "控制是否对具有未保存更改的编辑器选项卡绘制顶部边框。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', `multiple`),
				'default': false
			},
			'workbench.editor.decorations.badges': {
				'type': 'boolean',
				'markdownDescription': localize('decorations.badges', "控制编辑器文件装饰是否使用徽章。"),
				'default': true
			},
			'workbench.editor.decorations.colors': {
				'type': 'boolean',
				'markdownDescription': localize('decorations.colors', "控制编辑器文件装饰是否使用颜色。"),
				'default': true
			},
			[CustomEditorLabelService.SETTING_ID_ENABLED]: {
				'type': 'boolean',
				'markdownDescription': localize('workbench.editor.label.enabled', "控制是否应应用自定义工作台编辑器标签。"),
				'default': true,
			},
			[CustomEditorLabelService.SETTING_ID_PATTERNS]: {
				'type': 'object',
				'markdownDescription': (() => {
					let customEditorLabelDescription = localize('workbench.editor.label.patterns', "控制编辑器标签的渲染。 每个 __Item__ 是一个匹配文件路径的模式。支持相对和绝对文件路径。相对路径必须包含 WORKSPACE_FOLDER（例如 `WORKSPACE_FOLDER/src/**.tsx` 或 `*/src/**.tsx`）。绝对模式必须以 `/` 开头。如果有多个模式匹配，将选取最长的匹配路经。每个 __Value__ 是当 __Item__ 匹配时渲染编辑器的模板。变量根据上下文进行替换：");
					customEditorLabelDescription += '\n- ' + [
						localize('workbench.editor.label.dirname', "`${dirname}`：文件所在文件夹的名称（例如 `WORKSPACE_FOLDER/folder/file.txt -> folder`）。"),
						localize('workbench.editor.label.nthdirname', "`${dirname(N)}`：文件所在的第 N 个父文件夹的名称（例如 `N=2: WORKSPACE_FOLDER/static/folder/file.txt -> WORKSPACE_FOLDER`）。可以使用负数从路径的起始位置选取文件夹（例如 `N=-1: WORKSPACE_FOLDER/folder/file.txt -> WORKSPACE_FOLDER`）。如果 __Item__ 是绝对模式路径，则第一个文件夹（`N=-1`）引用绝对路径中的第一个文件夹，否则它对应于工作区文件夹。"),
						localize('workbench.editor.label.filename', "`${filename}`：不带扩展名的文件名（例如 `WORKSPACE_FOLDER/folder/file.txt -> file`）。"),
						localize('workbench.editor.label.extname', "`${extname}`：文件扩展名（例如 `WORKSPACE_FOLDER/folder/file.txt -> txt`）。"),
						localize('workbench.editor.label.nthextname', "`${extname(N)}`：以 '.' 分隔的文件的第 N 个扩展名（例如 `N=2: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext1`）。可以使用负数从扩展名的起始位置选取扩展名（例如 `N=-1: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext2`）。"),
					].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
					customEditorLabelDescription += '\n\n' + localize('customEditorLabelDescriptionExample', "示例：`\"**/static/**/*.html\": \"${filename} - ${dirname} (${extname})\"` 将把文件 `WORKSPACE_FOLDER/static/folder/file.html` 渲染为 `file - folder (html)`。");

					return customEditorLabelDescription;
				})(),
				additionalProperties:
				{
					type: ['string', 'null'],
					markdownDescription: localize('workbench.editor.label.template', "模式匹配时应渲染的模板。可以包含变量 ${dirname}、${filename} 和 ${extname}。"),
					minLength: 1,
					pattern: '.*[a-zA-Z0-9].*'
				},
				'default': {}
			},
			'workbench.editor.labelFormat': {
				'type': 'string',
				'enum': ['default', 'short', 'medium', 'long'],
				'enumDescriptions': [
					localize('workbench.editor.labelFormat.default', "显示文件名。启用选项卡时，如果一个组中有两个文件名相同，则添加每个文件路径的区别部分。禁用选项卡时，如果编辑器处于活动状态，则显示相对于工作区文件夹的路径。"),
					localize('workbench.editor.labelFormat.short', "显示文件名，后跟目录名。"),
					localize('workbench.editor.labelFormat.medium', "显示文件名，后跟相对于工作区文件夹的路径。"),
					localize('workbench.editor.labelFormat.long', "显示文件名，后跟绝对路径。")
				],
				'default': 'default',
				'description': localize('tabDescription', "控制编辑器标签的格式。"),
			},
			'workbench.editor.untitled.labelFormat': {
				'type': 'string',
				'enum': ['content', 'name'],
				'enumDescriptions': [
					localize('workbench.editor.untitled.labelFormat.content', "无标题文件的名称源自其第一行的内容，除非它有相关的关联文件路径。如果该行为空或不包含单词字符，则回退到名称。"),
					localize('workbench.editor.untitled.labelFormat.name', "无标题文件的名称不源自文件的内容。"),
				],
				'default': 'content',
				'description': localize('untitledLabelFormat', "控制无标题编辑器的标签格式。"),
			},
			'workbench.editor.empty.hint': {
				'type': 'string',
				'enum': ['text', 'hidden'],
				'default': 'text',
				'markdownDescription': localize("workbench.editor.empty.hint", "控制是否在编辑器中显示空编辑器文本提示。")
			},
			'workbench.editor.languageDetection': {
				type: 'boolean',
				default: true,
				description: localize('workbench.editor.languageDetection', "控制是否自动检测文本编辑器中的语言，除非语言选择器已明确设置了语言。这也可以按语言进行范围限定，以便您指定不想关闭的语言。这对于像 Markdown 这样经常包含其他语言的语言很有用，因为这可能会欺骗语言检测，使其认为它是嵌入式语言而不是 Markdown。"),
				scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
			},
			'workbench.editor.historyBasedLanguageDetection': {
				type: 'boolean',
				default: true,
				description: localize('workbench.editor.historyBasedLanguageDetection', "启用在语言检测中使用编辑器历史记录。这会导致自动语言检测偏向于最近打开的语言，并允许自动语言检测在较小的输入下运行。"),
			},
			'workbench.editor.preferHistoryBasedLanguageDetection': {
				type: 'boolean',
				default: false,
				description: localize('workbench.editor.preferBasedLanguageDetection', "启用时，将优先考虑考虑编辑器历史记录的语言检测模型。"),
			},
			'workbench.editor.languageDetectionHints': {
				type: 'object',
				default: { 'untitledEditors': true, 'notebookEditors': true },
				description: localize('workbench.editor.showLanguageDetectionHints', "启用时，当编辑器语言与检测到的内容语言不匹配时，显示状态栏快速修复。"),
				additionalProperties: false,
				properties: {
					untitledEditors: {
						type: 'boolean',
						description: localize('workbench.editor.showLanguageDetectionHints.editors', "在无标题文本编辑器中显示"),
					},
					notebookEditors: {
						type: 'boolean',
						description: localize('workbench.editor.showLanguageDetectionHints.notebook', "在笔记本编辑器中显示"),
					}
				}
			},
			'workbench.editor.tabActionLocation': {
				type: 'string',
				enum: ['left', 'right'],
				default: 'right',
				markdownDescription: localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'tabActionLocation' }, "控制编辑器选项卡操作按钮（关闭、取消固定）的位置。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.tabActionCloseVisibility': {
				type: 'boolean',
				default: true,
				description: localize('workbench.editor.tabActionCloseVisibility', "控制选项卡关闭操作按钮的可见性。")
			},
			'workbench.editor.tabActionUnpinVisibility': {
				type: 'boolean',
				default: true,
				description: localize('workbench.editor.tabActionUnpinVisibility', "控制选项卡取消固定操作按钮的可见性。")
			},
			'workbench.editor.showTabIndex': {
				'type': 'boolean',
				'default': false,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'showTabIndex' }, "启用时，将显示选项卡索引。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.tabSizing': {
				'type': 'string',
				'enum': ['fit', 'shrink', 'fixed'],
				'default': 'fit',
				'enumDescriptions': [
					localize('workbench.editor.tabSizing.fit', "始终保持选项卡足够大，以显示完整的编辑器标签。"),
					localize('workbench.editor.tabSizing.shrink', "允许选项卡在可用空间不足以一次显示所有选项卡时变小。"),
					localize('workbench.editor.tabSizing.fixed', "使所有选项卡大小相同，同时允许它们在可用空间不足以一次显示所有选项卡时变小。")
				],
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'tabSizing' }, "控制编辑器选项卡的大小。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.tabSizingFixedMinWidth': {
				'type': 'number',
				'default': 50,
				'minimum': 38,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMinWidth' }, "控制当 {0} 大小设置为 {1} 时选项卡的最小宽度。", '`#workbench.editor.tabSizing#`', '`fixed`')
			},
			'workbench.editor.tabSizingFixedMaxWidth': {
				'type': 'number',
				'default': 160,
				'minimum': 38,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabSizingFixedMaxWidth' }, "控制当 {0} 大小设置为 {1} 时选项卡的最大宽度。", '`#workbench.editor.tabSizing#`', '`fixed`')
			},
			'window.density.editorTabHeight': {
				'type': 'string',
				'enum': ['default', 'compact'],
				'default': 'default',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.tabHeight' }, "控制编辑器选项卡的高度。当 {0} 未设置为 {1} 时，这也可以应用于标题控制栏。", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.pinnedTabSizing': {
				'type': 'string',
				'enum': ['normal', 'compact', 'shrink'],
				'default': 'normal',
				'enumDescriptions': [
					localize('workbench.editor.pinnedTabSizing.normal', "固定选项卡继承非固定选项卡的外观。"),
					localize('workbench.editor.pinnedTabSizing.compact', "固定选项卡以紧凑形式显示，仅显示图标或编辑器名称的首字母。"),
					localize('workbench.editor.pinnedTabSizing.shrink', "固定选项卡缩小到紧凑的固定大小，显示部分编辑器名称。")
				],
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'pinnedTabSizing' }, "控制固定编辑器选项卡的大小。固定选项卡排序到所有打开选项卡的开头，通常在取消固定之前不关闭。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`')
			},
			'workbench.editor.pinnedTabsOnSeparateRow': {
				'type': 'boolean',
				'default': false,
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'workbench.editor.pinnedTabsOnSeparateRow' }, "启用时，在所有其他选项卡上方的单独行中显示固定选项卡。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`'),
			},
			'workbench.editor.preventPinnedEditorClose': {
				'type': 'string',
				'enum': ['keyboardAndMouse', 'keyboard', 'mouse', 'never'],
				'default': 'keyboardAndMouse',
				'enumDescriptions': [
					localize('workbench.editor.preventPinnedEditorClose.always', "在使用鼠标中键单击或键盘关闭时，始终防止关闭固定编辑器。"),
					localize('workbench.editor.preventPinnedEditorClose.onlyKeyboard', "在使用键盘关闭时，防止关闭固定编辑器。"),
					localize('workbench.editor.preventPinnedEditorClose.onlyMouse', "在使用鼠标中键单击关闭时，防止关闭固定编辑器。"),
					localize('workbench.editor.preventPinnedEditorClose.never', "从不防止关闭固定编辑器。")
				],
				description: localize('workbench.editor.preventPinnedEditorClose', "控制当使用键盘或鼠标中键单击关闭时，是否应关闭固定编辑器。"),
			},
			'workbench.editor.splitSizing': {
				'type': 'string',
				'enum': ['auto', 'distribute', 'split'],
				'default': 'auto',
				'enumDescriptions': [
					localize('workbench.editor.splitSizingAuto', "将活动编辑器组拆分为相等的部分，除非所有编辑器组已经处于相等的部分。在这种情况下，将所有编辑器组拆分为相等的部分。"),
					localize('workbench.editor.splitSizingDistribute', "将所有编辑器组拆分为相等的部分。"),
					localize('workbench.editor.splitSizingSplit', "将活动编辑器组拆分为相等的部分。")
				],
				'description': localize('splitSizing', "控制拆分编辑器组时的大小。")
			},
			'workbench.editor.splitOnDragAndDrop': {
				'type': 'boolean',
				'default': true,
				'description': localize('splitOnDragAndDrop', "控制是否可以通过将编辑器或文件拖放到编辑器区域的边缘来从拖放操作中拆分编辑器组。")
			},
			'workbench.editor.dragToOpenWindow': {
				'type': 'boolean',
				'default': true,
				'markdownDescription': localize('dragToOpenWindow', "控制是否可以将编辑器拖出窗口以在新窗口中打开它们。在拖动时按住 `Alt` 键可动态切换此功能。")
			},
			'workbench.editor.focusRecentEditorAfterClose': {
				'type': 'boolean',
				'description': localize('focusRecentEditorAfterClose', "控制在关闭编辑器时，是否选择最近使用的编辑器而不是下一个编辑器。"),
				'default': true
			},
			'workbench.editor.showIcons': {
				'type': 'boolean',
				'description': localize('showIcons', "控制是否在编辑器选项卡中显示文件图标。"),
				'default': true
			},
			'workbench.editor.enablePreview': {
				'type': 'boolean',
				'description': localize('enablePreview', "控制打开的编辑器是否显示为预览编辑器。预览编辑器且未保持打开状态，在打开另一个文件时会被重用。"),
				'default': true
			},
			'workbench.editor.enablePreviewFromQuickOpen': {
				'type': 'boolean',
				'description': localize('enablePreviewFromQuickOpen', "控制从快速打开打开的编辑器是否显示为预览编辑器。预览编辑器且未保持打开状态，在打开另一个文件时会被重用。"),
				'default': false
			},
			'workbench.editor.enablePreviewFromCodeNavigation': {
				'type': 'boolean',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'enablePreviewFromCodeNavigation' }, "Controls whether editors remain in preview when a code navigation is started from them. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). This value is ignored when {0} is not set to {1}.", '`#workbench.editor.showTabs#`', '`multiple`'),
				'default': false
			},
			'workbench.editor.closeOnFileDelete': {
				'type': 'boolean',
				'description': localize('closeOnFileDelete', "控制当文件从资源管理器中删除时，是否自动关闭编辑器。"),
				'default': false
			},
			'workbench.editor.openPositioning': {
				'type': 'string',
				'enum': ['left', 'right', 'first', 'last'],
				'default': 'right',
				'markdownDescription': localize({ comment: ['{0}, {1}, {2}, {3} will be a setting name rendered as a link'], key: 'editorOpenPositioning' }, "控制新编辑器打开的位置。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`'),
				'enumDescriptions': [
					localize('workbench.editor.openPositioning.left', "在活动编辑器的左侧打开新编辑器。"),
					localize('workbench.editor.openPositioning.right', "在活动编辑器的右侧打开新编辑器。"),
					localize('workbench.editor.openPositioning.first', "在所有编辑器的开头打开新编辑器。"),
					localize('workbench.editor.openPositioning.last', "在所有编辑器的末尾打开新编辑器。")
				]
			},
			'workbench.editor.openSideBySideDirection': {
				'type': 'string',
				'enum': ['right', 'down'],
				'default': 'right',
				'markdownDescription': localize('editorOpenSideBySideDirection', "控制在侧面打开编辑器时的默认方向（默认及使用 `^Enter`）。"),
				'enumDescriptions': [
					localize('workbench.editor.openSideBySideDirection.right', "在当前编辑器的右侧打开新编辑器。"),
					localize('workbench.editor.openSideBySideDirection.down', "在当前编辑器的下方打开新编辑器。")
				]
			},
			'workbench.editor.closeEmptyGroups': {
				'type': 'boolean',
				'description': localize('closeEmptyGroups', "控制当编辑器组中的最后一个编辑器关闭时，编辑器组的行为。如果启用，编辑器组将自动关闭。"),
				'default': true
			},
			'workbench.editor.revealIfOpen': {
				'type': 'boolean',
				'description': localize('revealIfOpen', "控制当打开一个已在其他组中打开的文件时，是否显示该组。如果禁用，将始终打开一个新编辑器。"),
				'default': false
			},
			'workbench.editor.swipeToNavigate': {
				'type': 'boolean',
				'description': localize('swipeToNavigate', "Navigate between open files using three-finger swipe horizontally. Note that System Preferences > Trackpad > More Gestures > 'Swipe between pages' must be set to 'Swipe with two or three fingers'."),
				'default': false,
				'included': isMacintosh && !isWeb
			},
			'workbench.editor.mouseBackForwardToNavigate': {
				'type': 'boolean',
				'description': localize('mouseBackForwardToNavigate', "如果鼠标按钮 4 和 5 未受到其他阻碍，则使用它们进行导航。"),
				'default': true
			},
			'workbench.editor.navigationScope': {
				'type': 'string',
				'enum': ['default', 'editorGroup', 'editor'],
				'default': 'default',
				'markdownDescription': localize('navigationScope', "控制编辑器导航命令（如 `Go Back` 和 `Go Forward`）的范围。"),
				'enumDescriptions': [
					localize('workbench.editor.navigationScope.default', "导航遍及所有编辑器组。"),
					localize('workbench.editor.navigationScope.editorGroup', "导航仅限于当前编辑器组。"),
					localize('workbench.editor.navigationScope.editor', "导航仅限于当前编辑器。")
				]
			},
			'workbench.editor.restoreViewState': {
				'type': 'boolean',
				'markdownDescription': localize('restoreViewState', "重新打开已关闭的编辑器时，恢复之前的视图状态（例如滚动位置）。"),
				'default': true,
				'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
			},
			'workbench.editor.sharedViewState': {
				'type': 'boolean',
				'description': localize('sharedViewState', "在所有编辑器组中保留最近的编辑器视图状态（例如滚动位置），并在未找到编辑器组的特定编辑器视图状态时恢复该状态。"),
				'default': false
			},
			'workbench.editor.restoreEditors': {
				'type': 'boolean',
				'description': localize('restoreOnStartup', "控制启动时是否恢复编辑器。禁用时，仅从上一个会话恢复有未保存更改的编辑器。"),
				'default': true
			},
			'workbench.editor.splitInGroupLayout': {
				'type': 'string',
				'enum': ['vertical', 'horizontal'],
				'default': 'horizontal',
				'markdownDescription': localize('splitInGroupLayout', "控制在编辑器组中拆分编辑器时的布局是垂直还是水平。"),
				'enumDescriptions': [
					localize('workbench.editor.splitInGroupLayoutVertical', "编辑器从上到下定位。"),
					localize('workbench.editor.splitInGroupLayoutHorizontal', "编辑器从左到右定位。")
				]
			},
			'workbench.editor.centeredLayoutAutoResize': {
				'type': 'boolean',
				'default': true,
				'description': localize('centeredLayoutAutoResize', "控制当打开多个组时，居中布局是否应自动调整为最大宽度。一旦只剩下一个组打开，它将调整回原来的居中宽度。")
			},
			'workbench.editor.centeredLayoutFixedWidth': {
				'type': 'boolean',
				'default': false,
				'description': localize('centeredLayoutDynamicWidth', "控制居中布局在调整窗口大小时是否尝试保持恒定宽度。")
			},
			'workbench.editor.doubleClickTabToToggleEditorGroupSizes': {
				'type': 'string',
				'enum': ['maximize', 'expand', 'off'],
				'default': 'expand',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'doubleClickTabToToggleEditorGroupSizes' }, "控制双击选项卡时如何调整编辑器组的大小。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.editor.showTabs#`', '`multiple`'),
				'enumDescriptions': [
					localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.maximize', "所有其他编辑器组都被隐藏，当前编辑器组最大化以占据整个编辑器区域。"),
					localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.expand', "编辑器组通过使所有其他编辑器组尽可能小来占用尽可能多的空间。"),
					localize('workbench.editor.doubleClickTabToToggleEditorGroupSizes.off', "双击选项卡时不调整任何编辑器组的大小。")
				]
			},
			'workbench.editor.limit.enabled': {
				'type': 'boolean',
				'default': false,
				'description': localize('limitEditorsEnablement', "控制是否限制打开的编辑器数量。启用时，最近最少使用的编辑器将关闭，以便为新打开的编辑器腾出空间。")
			},
			'workbench.editor.limit.value': {
				'type': 'number',
				'default': 10,
				'exclusiveMinimum': 0,
				'markdownDescription': localize('limitEditorsMaximum', "控制打开的编辑器的最大数量。使用 {0} 设置来控制每个编辑器组或跨所有组的此限制。", '`#workbench.editor.limit.perEditorGroup#`')
			},
			'workbench.editor.limit.excludeDirty': {
				'type': 'boolean',
				'default': false,
				'description': localize('limitEditorsExcludeDirty', "控制计算最大打开编辑器数量时是否排除脏编辑器（有未保存更改的编辑器）。")
			},
			'workbench.editor.limit.perEditorGroup': {
				'type': 'boolean',
				'default': false,
				'description': localize('perEditorGroup', "控制最大打开编辑器限制是应用于每个编辑器组还是跨所有编辑器组。")
			},
			'workbench.localHistory.enabled': {
				'type': 'boolean',
				'default': true,
				'description': localize('localHistoryEnabled', "控制是否启用本地文件历史记录。启用时，已保存的编辑器的文件内容将存储到备份位置，以便稍后恢复或查看内容。更改此设置对此设置生效前的现有本地文件历史记录条目没有影响。"),
				'scope': ConfigurationScope.RESOURCE
			},
			'workbench.localHistory.maxFileSize': {
				'type': 'number',
				'default': 256,
				'minimum': 1,
				'description': localize('localHistoryMaxFileSize', "控制考虑进行本地文件历史记录的文件的最大大小 (KB)。较大的文件将不会添加到本地文件历史记录中。更改此设置对此设置生效前的现有本地文件历史记录条目没有影响。"),
				'scope': ConfigurationScope.RESOURCE
			},
			'workbench.localHistory.maxFileEntries': {
				'type': 'number',
				'default': 50,
				'minimum': 0,
				'description': localize('localHistoryMaxFileEntries', "控制每个文件的本地文件历史记录条目的最大数量。当文件的本地文件历史记录条目数超过此数量时，最旧的条目将被丢弃。"),
				'scope': ConfigurationScope.RESOURCE
			},
			'workbench.localHistory.exclude': {
				'type': 'object',
				'patternProperties': {
					'.*': { 'type': 'boolean' }
				},
				'markdownDescription': localize('exclude', "配置用于从本地文件历史记录中排除文件的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非是绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行评估。更改此设置对此设置生效前的现有本地文件历史记录条目没有影响。"),
				'scope': ConfigurationScope.RESOURCE
			},
			'workbench.localHistory.mergeWindow': {
				'type': 'number',
				'default': 10,
				'minimum': 1,
				'markdownDescription': localize('mergeWindow', "配置以秒为单位的间隔，在此期间，本地文件历史记录中的最后一个条目将被正在添加的条目替换。这有助于减少添加的条目总数，例如当启用自动保存时。此设置仅应用于具有相同来源的条目。更改此设置对此设置生效前的现有本地文件历史记录条目没有影响。"),
				'scope': ConfigurationScope.RESOURCE
			},
			'workbench.commandPalette.history': {
				'type': 'number',
				'description': localize('commandHistory', "控制命令面板历史记录中保留的最近使用的命令数量。设置为 0 可禁用命令历史记录。"),
				'default': 50,
				'minimum': 0
			},
			'workbench.commandPalette.preserveInput': {
				'type': 'boolean',
				'description': localize('preserveInput', "控制在下次打开命令面板时是否应恢复上次输入的输入。"),
				'default': false
			},
			'workbench.commandPalette.experimental.suggestCommands': {
				'type': 'boolean',
				tags: ['experimental'],
				'description': localize('suggestCommands', "控制命令面板是否有常用命令列表。"),
				'default': false
			},
			'workbench.commandPalette.experimental.askChatLocation': {
				'type': 'string',
				tags: ['experimental'],
				'description': localize('askChatLocation', "控制命令面板应在何处询问聊天问题。"),
				'default': 'chatView',
				enum: ['chatView', 'quickChat'],
				enumDescriptions: [
					localize('askChatLocation.chatView', "在聊天视图中询问聊天问题。"),
					localize('askChatLocation.quickChat', "在快速聊天中询问聊天问题。")
				]
			},
			'workbench.commandPalette.showAskInChat': {
				'type': 'boolean',
				tags: ['experimental'],
				'description': localize('showAskInChat', "控制命令面板是否在底部显示“在聊天中提问”选项。"),
				'default': true
			},
			'workbench.commandPalette.experimental.enableNaturalLanguageSearch': {
				'type': 'boolean',
				tags: ['experimental'],
				'description': localize('enableNaturalLanguageSearch', "控制命令面板是否应包含相似命令。您必须安装提供自然语言支持的扩展。"),
				'default': true
			},
			'workbench.quickOpen.closeOnFocusLost': {
				'type': 'boolean',
				'description': localize('closeOnFocusLost', "控制快速打开是否在失去焦点后自动关闭。"),
				'default': true
			},
			'workbench.quickOpen.preserveInput': {
				'type': 'boolean',
				'description': localize('workbench.quickOpen.preserveInput', "控制在下次打开快速打开时是否应恢复上次输入的输入。"),
				'default': false
			},
			'workbench.settings.openDefaultSettings': {
				'type': 'boolean',
				'description': localize('openDefaultSettings', "控制打开设置时是否也打开显示所有默认设置的编辑器。"),
				'default': false
			},
			'workbench.settings.useSplitJSON': {
				'type': 'boolean',
				'markdownDescription': localize('useSplitJSON', "控制在将设置作为 JSON 编辑时是否使用拆分 JSON 编辑器。"),
				'default': false
			},
			'workbench.settings.openDefaultKeybindings': {
				'type': 'boolean',
				'description': localize('openDefaultKeybindings', "控制打开键绑定设置时是否也打开显示所有默认键绑定的编辑器。"),
				'default': false
			},
			'workbench.settings.alwaysShowAdvancedSettings': {
				'type': 'boolean',
				'description': localize('alwaysShowAdvancedSettings', "控制高级设置是否始终显示在设置编辑器中，而无需 `@tag:advanced` 过滤器。"),
				'default': product.quality !== 'stable'
			},
			'workbench.sideBar.location': {
				'type': 'string',
				'enum': ['left', 'right'],
				'default': 'left',
				'description': localize('sideBarLocation', "控制主侧边栏和活动栏的位置。它们可以显示在工作台的左侧或右侧。辅助侧栏将显示在工作台的另一侧。")
			},
			'workbench.panel.showLabels': {
				'type': 'boolean',
				'default': true,
				'description': localize('panelShowLabels', "控制面板标题中的活动项是显示为标签还是图标。"),
			},
			'workbench.panel.defaultLocation': {
				'type': 'string',
				'enum': ['left', 'bottom', 'top', 'right'],
				'default': 'bottom',
				'description': localize('panelDefaultLocation', "控制新工作区中面板（终端、调试控制台、输出、问题）的默认位置。它可以显示在编辑器区域的底部、顶部、右侧或左侧。"),
			},
			'workbench.panel.opensMaximized': {
				'type': 'string',
				'enum': ['always', 'never', 'preserve'],
				'default': 'preserve',
				'description': localize('panelOpensMaximized', "控制面板是否最大化打开。它可以始终最大化打开、从不最大化打开，或打开到关闭前的最后一个状态。"),
				'enumDescriptions': [
					localize('workbench.panel.opensMaximized.always', "打开时始终最大化面板。"),
					localize('workbench.panel.opensMaximized.never', "打开时从不最大化面板。"),
					localize('workbench.panel.opensMaximized.preserve', "将面板打开到关闭前的状态。")
				]
			},
			'workbench.secondarySideBar.defaultVisibility': {
				'type': 'string',
				'enum': ['hidden', 'visibleInWorkspace', 'visible', 'maximizedInWorkspace', 'maximized'],
				'default': 'visibleInWorkspace',
				'description': localize('secondarySideBarDefaultVisibility', "控制在首次打开的工作区或空窗口中辅助侧边栏的默认可见性。"),
				'enumDescriptions': [
					localize('workbench.secondarySideBar.defaultVisibility.hidden', "辅助侧边栏默认隐藏。"),
					localize('workbench.secondarySideBar.defaultVisibility.visibleInWorkspace', "如果打开了工作区，辅助侧边栏默认可见。"),
					localize('workbench.secondarySideBar.defaultVisibility.visible', "辅助侧边栏默认可见。"),
					localize('workbench.secondarySideBar.defaultVisibility.maximizedInWorkspace', "如果打开了工作区，辅助侧边栏默认可见并最大化。"),
					localize('workbench.secondarySideBar.defaultVisibility.maximized', "辅助侧边栏默认可见并最大化。")
				]
			},
			'workbench.secondarySideBar.forceMaximized': {
				'type': 'boolean',
				'default': false,
				tags: ['experimental'],
				'description': localize('secondarySideBarForceMaximized', "控制是否强制辅助侧边栏始终最大化显示，除非显示其他部分或编辑器。"),
			},
			'workbench.secondarySideBar.showLabels': {
				'type': 'boolean',
				'default': true,
				'markdownDescription': localize('secondarySideBarShowLabels', "控制辅助侧边栏标题中的活动项是显示为标签还是图标。此设置仅在 {0} 未设置为 {1} 时有效。", '`#workbench.activityBar.location#`', '`top`'),
			},
			'workbench.statusBar.visible': {
				'type': 'boolean',
				'default': true,
				'description': localize('statusBarVisibility', "控制工作台底部状态栏的可见性。")
			},
			[LayoutSettings.ACTIVITY_BAR_LOCATION]: {
				'type': 'string',
				'enum': ['default', 'top', 'bottom', 'hidden'],
				'default': 'default',
				'markdownDescription': localize({ comment: ['This is the description for a setting'], key: 'activityBarLocation' }, "控制活动栏相对于主侧边栏和辅助侧边栏的位置。"),
				'enumDescriptions': [
					localize('workbench.activityBar.location.default', "在主侧边栏的一侧和辅助侧边栏的上方显示活动栏。"),
					localize('workbench.activityBar.location.top', "在主侧边栏和辅助侧边栏的上方显示活动栏。"),
					localize('workbench.activityBar.location.bottom', "在主侧边栏和辅助侧边栏的底部显示活动栏。"),
					localize('workbench.activityBar.location.hide', "在主侧边栏和辅助侧边栏中隐藏活动栏。")
				],
			},
			'workbench.activityBar.iconClickBehavior': {
				'type': 'string',
				'enum': ['toggle', 'focus'],
				'default': 'toggle',
				'markdownDescription': localize({ comment: ['{0}, {1} will be a setting name rendered as a link'], key: 'activityBarIconClickBehavior' }, "控制单击工作台中活动栏图标的行为。当 {0} 未设置为 {1} 时，忽略此值。", '`#workbench.activityBar.location#`', '`default`'),
				'enumDescriptions': [
					localize('workbench.activityBar.iconClickBehavior.toggle', "如果单击的项目已可见，则隐藏主侧边栏。"),
					localize('workbench.activityBar.iconClickBehavior.focus', "如果单击的项目已可见，则聚焦主侧边栏。")
				]
			},
			'workbench.view.alwaysShowHeaderActions': {
				'type': 'boolean',
				'default': false,
				'description': localize('viewVisibility', "控制视图标题操作的可见性。视图标题操作可以始终可见，或者仅在聚焦或悬停在该视图上时可见。")
			},
			'workbench.view.showQuietly': {
				'type': 'object',
				'description': localize('workbench.view.showQuietly', "如果扩展请求显示隐藏视图，则显示可点击的状态栏指示器。"),
				'scope': ConfigurationScope.WINDOW,
				'properties': {
					'workbench.panel.output': {
						'type': 'boolean',
						'description': localize('workbench.panel.output', "输出视图")
					}
				},
				'additionalProperties': false
			},
			'workbench.fontAliasing': {
				'type': 'string',
				'enum': ['default', 'antialiased', 'none', 'auto'],
				'default': 'default',
				'description':
					localize('fontAliasing', "控制工作台中的字体抗锯齿方法。"),
				'enumDescriptions': [
					localize('workbench.fontAliasing.default', "亚像素字体平滑。在大多数非视网膜显示器上，这将提供最清晰的文本。"),
					localize('workbench.fontAliasing.antialiased', "在像素级别平滑字体，而不是亚像素。可以使字体整体看起来更轻。"),
					localize('workbench.fontAliasing.none', "禁用字体平滑。文本将显示为锯齿状边缘。"),
					localize('workbench.fontAliasing.auto', "根据显示器的 DPI 自动应用 `default` 或 `antialiased`。")
				],
				'included': isMacintosh
			},
			'workbench.settings.editor': {
				'type': 'string',
				'enum': ['ui', 'json'],
				'enumDescriptions': [
					localize('settings.editor.ui', "使用设置 UI 编辑器。"),
					localize('settings.editor.json', "使用 JSON 文件编辑器。"),
				],
				'description': localize('settings.editor.desc', "确定默认使用哪个设置编辑器。"),
				'default': 'ui',
				'scope': ConfigurationScope.WINDOW
			},
			'workbench.settings.showAISearchToggle': {
				'type': 'boolean',
				'default': true,
				'description': localize('settings.showAISearchToggle', "控制在搜索后且 AI 搜索结果可用时，是否在设置编辑器的搜索栏中显示 AI 搜索结果切换开关。"),
			},
			'workbench.hover.delay': {
				'type': 'number',
				'description': localize('workbench.hover.delay', "控制悬停显示工作台项（例如某些扩展提供的树视图项）之前的延迟（以毫秒为单位）。已显示的项可能需要刷新才能反映此设置更改。"),
				// Testing has indicated that on Windows and Linux 500 ms matches the native hovers most closely.
				// On Mac, the delay is 1500.
				'default': isMacintosh ? 1500 : 500,
				'minimum': 0
			},
			'workbench.reduceMotion': {
				type: 'string',
				description: localize('workbench.reduceMotion', "控制工作台是否应减少动画渲染。"),
				'enumDescriptions': [
					localize('workbench.reduceMotion.on', "始终以减少的动画渲染。"),
					localize('workbench.reduceMotion.off', "不以减少的动画渲染。"),
					localize('workbench.reduceMotion.auto', "根据操作系统配置以减少的动画渲染。"),
				],
				default: 'auto',
				tags: ['accessibility'],
				enum: ['on', 'off', 'auto']
			},
			'workbench.navigationControl.enabled': {
				'type': 'boolean',
				'default': true,
				'markdownDescription': isWeb ?
					localize('navigationControlEnabledWeb', "控制是否显示标题栏中的导航控件。") :
					localize({ key: 'navigationControlEnabled', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "控制是否在自定义标题栏中显示导航控件。此设置仅在 {0} 未设置为 {1} 时有效。", '`#window.customTitleBarVisibility#`', '`never`')
			},
			[LayoutSettings.LAYOUT_ACTIONS]: {
				'type': 'boolean',
				'default': true,
				'markdownDescription': isWeb ?
					localize('layoutControlEnabledWeb', "控制是否显示标题栏中的布局控件。") :
					localize({ key: 'layoutControlEnabled', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "控制是否在自定义标题栏中显示布局控件。此设置仅在 {0} 未设置为 {1} 时有效。", '`#window.customTitleBarVisibility#`', '`never`')
			},
			'workbench.layoutControl.type': {
				'type': 'string',
				'enum': ['menu', 'toggles', 'both'],
				'enumDescriptions': [
					localize('layoutcontrol.type.menu', "显示带有布局选项下拉菜单的单个按钮。"),
					localize('layoutcontrol.type.toggles', "显示用于切换面板和侧边栏可见性的多个按钮。"),
					localize('layoutcontrol.type.both', "同时显示下拉菜单和切换按钮。"),
				],
				'default': 'both',
				'description': localize('layoutControlType', "控制自定义标题栏中的布局控件是显示为单个菜单按钮还是多个 UI 切换开关。"),
			},
			'workbench.tips.enabled': {
				'type': 'boolean',
				'default': true,
				'description': localize('tips.enabled', "启用时，当没有打开编辑器时，将显示水印提示。")
			},
		}
	});

	// Window

	let windowTitleDescription = localize('windowTitle', "根据当前上下文（例如打开的工作区或活动编辑器）控制窗口标题。变量根据上下文进行替换：");
	windowTitleDescription += '\n- ' + [
		localize('activeEditorShort', "`${activeEditorShort}`：文件名（例如 myFile.txt）。"),
		localize('activeEditorMedium', "`${activeEditorMedium}`：文件相对于工作区文件夹的路径（例如 myFolder/myFileFolder/myFile.txt）。"),
		localize('activeEditorLong', "`${activeEditorLong}`：文件的完整路径（例如 /Users/Development/myFolder/myFileFolder/myFile.txt）。"),
		localize('activeEditorLanguageId', "`${activeEditorLanguageId}`：活动编辑器的语言标识符（例如 typescript）。"),
		localize('activeFolderShort', "`${activeFolderShort}`：文件所在文件夹的名称（例如 myFileFolder）。"),
		localize('activeFolderMedium', "`${activeFolderMedium}`：文件所在文件夹相对于工作区文件夹的路径（例如 myFolder/myFileFolder）。"),
		localize('activeFolderLong', "`${activeFolderLong}`：文件所在文件夹的完整路径（例如 /Users/Development/myFolder/myFileFolder）。"),
		localize('folderName', "`${folderName}`：文件所在工作区文件夹的名称（例如 myFolder）。"),
		localize('folderPath', "`${folderPath}`：文件所在工作区文件夹的文件路径（例如 /Users/Development/myFolder）。"),
		localize('rootName', "`${rootName}`：工作区的名称，如果适用，带有可选的远程名称和工作区指示符（例如 myFolder, myRemoteFolder [SSH] 或 myWorkspace (Workspace)）。"),
		localize('rootNameShort', "`${rootNameShort}`：不带后缀的工作区缩写名称（例如 myFolder, myRemoteFolder 或 myWorkspace）。"),
		localize('rootPath', "`${rootPath}`：打开的工作区或文件夹的文件路径（例如 /Users/Development/myWorkspace）。"),
		localize('profileName', "`${profileName}`：打开工作区的配置文件的名称（例如 Data Science (Profile)）。如果使用默认配置文件，则忽略。"),
		localize('appName', "`${appName}`：例如 VS Code。"),
		localize('remoteName', "`${remoteName}`：例如 SSH"),
		localize('dirty', "`${dirty}`：当活动编辑器有未保存的更改时的指示符。"),
		localize('focusedView', "`${focusedView}`：当前聚焦视图的名称。"),
		localize('activeRepositoryName', "`${activeRepositoryName}`：活动存储库的名称（例如 vscode）。"),
		localize('activeRepositoryBranchName', "`${activeRepositoryBranchName}`：活动存储库中活动分支的名称（例如 main）。"),
		localize('activeEditorState', "`${activeEditorState}`：提供有关活动编辑器状态的信息（例如已修改）。当启用 {0} 时，默认在屏幕阅读器模式下追加此信息。", '`accessibility.windowTitleOptimized`'),
		localize('separator', "`${separator}`：仅当被具有值或静态文本的变量包围时才显示的条件分隔符（“ - ”）。")
	].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations

	registry.registerConfiguration({
		...windowConfigurationNodeBase,
		'properties': {
			'window.title': {
				'type': 'string',
				'default': defaultWindowTitle,
				'markdownDescription': windowTitleDescription
			},
			'window.titleSeparator': {
				'type': 'string',
				'default': defaultWindowTitleSeparator,
				'markdownDescription': localize("window.titleSeparator", "{0} 使用的分隔符。", '`#window.title#`')
			},
			[LayoutSettings.COMMAND_CENTER]: {
				type: 'boolean',
				default: true,
				markdownDescription: isWeb ?
					localize('window.commandCenterWeb', "与窗口标题一起显示命令启动器。") :
					localize({ key: 'window.commandCenter', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "与窗口标题一起显示命令启动器。此设置仅在 {0} 未设置为 {1} 时有效。", '`#window.customTitleBarVisibility#`', '`never`')
			},
			'window.menuBarVisibility': {
				'type': 'string',
				'enum': ['classic', 'visible', 'toggle', 'hidden', 'compact'],
				'markdownEnumDescriptions': [
					localize('window.menuBarVisibility.classic', "菜单显示在窗口顶部，仅在全屏模式下隐藏。"),
					localize('window.menuBarVisibility.visible', "即使在全屏模式下，菜单也始终显示在窗口顶部。"),
					isMacintosh ?
						localize('window.menuBarVisibility.toggle.mac', "菜单被隐藏，但可以通过执行 `Focus Application Menu` 命令显示在窗口顶部。") :
						localize('window.menuBarVisibility.toggle', "菜单被隐藏，但可以通过 Alt 键显示在窗口顶部。"),
					localize('window.menuBarVisibility.hidden', "菜单始终隐藏。"),
					isWeb ?
						localize('window.menuBarVisibility.compact.web', "菜单在侧边栏中显示为紧凑按钮。") :
						localize({ key: 'window.menuBarVisibility.compact', comment: ['{0}, {1} is a placeholder for a setting identifier.'] }, "菜单在侧边栏中显示为紧凑按钮。当 {0} 为 {1} 且 {2} 为 {3} 或 {4} 时，将忽略此值。", '`#window.titleBarStyle#`', '`native`', '`#window.menuStyle#`', '`native`', '`inherit`')
				],
				'default': isWeb ? 'compact' : 'classic',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': isMacintosh ?
					localize('menuBarVisibility.mac', "控制菜单栏的可见性。设置“toggle”意味着菜单栏被隐藏，执行 `Focus Application Menu` 将显示它。设置“compact”将把菜单移动到侧边栏。") :
					localize('menuBarVisibility', "控制菜单栏的可见性。设置“toggle”意味着菜单栏被隐藏，按一次 Alt 键将显示它。设置“compact”将把菜单移动到侧边栏。"),
				'included': isWindows || isLinux || isWeb
			},
			'window.enableMenuBarMnemonics': {
				'type': 'boolean',
				'default': true,
				'scope': ConfigurationScope.APPLICATION,
				'description': localize('enableMenuBarMnemonics', "控制是否可以通过 Alt 键快捷方式打开主菜单。禁用助记符允许将这些 Alt 键快捷方式绑定到编辑器命令。"),
				'included': isWindows || isLinux
			},
			'window.customMenuBarAltFocus': {
				'type': 'boolean',
				'default': true,
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': localize('customMenuBarAltFocus', "控制按 Alt 键是否聚焦菜单栏。此设置对使用 Alt 键切换菜单栏没有影响。"),
				'included': isWindows || isLinux
			},
			'window.openFilesInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'default'],
				'enumDescriptions': [
					localize('window.openFilesInNewWindow.on', "文件将在新窗口中打开。"),
					localize('window.openFilesInNewWindow.off', "文件将在已打开文件文件夹的窗口或上一个活动窗口中打开。"),
					isMacintosh ?
						localize('window.openFilesInNewWindow.defaultMac', "除非通过 Dock 或 Finder 打开，否则文件将在已打开文件文件夹的窗口或上一个活动窗口中打开。") :
						localize('window.openFilesInNewWindow.default', "除非在应用程序内选择（例如通过文件菜单），否则文件将在新窗口中打开。")
				],
				'default': 'off',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription':
					isMacintosh ?
						localize('openFilesInNewWindowMac', "控制在使用命令行或文件对话框时是否应在新窗口中打开文件。\n请注意，在某些情况下可能会忽略此设置（例如，使用 `--new-window` 或 `--reuse-window` 命令行选项时）。") :
						localize('openFilesInNewWindow', "控制在使用命令行或文件对话框时是否应在新窗口中打开文件。\n请注意，在某些情况下可能会忽略此设置（例如，使用 `--new-window` 或 `--reuse-window` 命令行选项时）。")
			},
			'window.openFoldersInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'default'],
				'enumDescriptions': [
					localize('window.openFoldersInNewWindow.on', "文件夹将在新窗口中打开。"),
					localize('window.openFoldersInNewWindow.off', "文件夹将替换上一个活动窗口。"),
					localize('window.openFoldersInNewWindow.default', "除非在应用程序内选择文件夹（例如通过文件菜单），否则文件夹将在新窗口中打开。")
				],
				'default': 'default',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': localize('openFoldersInNewWindow', "控制文件夹是应在新窗口中打开还是替换上一个活动窗口。\n请注意，在某些情况下可能会忽略此设置（例如，使用 `--new-window` 或 `--reuse-window` 命令行选项时）。")
			},
			'window.confirmBeforeClose': {
				'type': 'string',
				'enum': ['always', 'keyboardOnly', 'never'],
				'enumDescriptions': [
					isWeb ?
						localize('window.confirmBeforeClose.always.web', "始终尝试请求确认。请注意，浏览器仍可能决定在不确认的情况下关闭选项卡或窗口。") :
						localize('window.confirmBeforeClose.always', "始终请求确认。"),
					isWeb ?
						localize('window.confirmBeforeClose.keyboardOnly.web', "仅当使用键绑定关闭窗口时才请求确认。请注意，在某些情况下可能无法检测到。") :
						localize('window.confirmBeforeClose.keyboardOnly', "仅当使用键绑定时才请求确认。"),
					isWeb ?
						localize('window.confirmBeforeClose.never.web', "除非数据丢失迫在眉睫，否则从不显式请求确认。") :
						localize('window.confirmBeforeClose.never', "从不显式请求确认。")
				],
				'default': (isWeb && !isStandalone()) ? 'keyboardOnly' : 'never', // on by default in web, unless PWA, never on desktop
				'markdownDescription': isWeb ?
					localize('confirmBeforeCloseWeb', "控制在关闭浏览器选项卡 or 窗口之前是否显示确认对话框。请注意，即使启用，浏览器仍可能决定在不确认的情况下关闭选项卡或窗口，并且此设置仅是一个可能在所有情况下都不起作用的提示。") :
					localize('confirmBeforeClose', "控制在关闭窗口或退出应用程序之前是否显示确认对话框。"),
				'scope': ConfigurationScope.APPLICATION
			}
		}
	});

	// Dynamic Window Configuration
	registerWorkbenchContribution2(DynamicWindowConfiguration.ID, DynamicWindowConfiguration, WorkbenchPhase.Eventually);

	// Problems
	registry.registerConfiguration({
		...problemsConfigurationNodeBase,
		'properties': {
			'problems.visibility': {
				'type': 'boolean',
				'default': true,
				'description': localize('problems.visibility', "控制问题是否在整个编辑器和工作台中可见。"),
			},
		}
	});

	// Zen Mode
	registry.registerConfiguration({
		'id': 'zenMode',
		'order': 9,
		'title': localize('zenModeConfigurationTitle', "Zen 模式"),
		'type': 'object',
		'properties': {
			'zenMode.fullScreen': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.fullScreen', "控制开启 Zen 模式是否也将工作台置于全屏模式。")
			},
			'zenMode.centerLayout': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.centerLayout', "控制开启 Zen 模式是否也使布局居中。")
			},
			'zenMode.showTabs': {
				'type': 'string',
				'enum': ['multiple', 'single', 'none'],
				'description': localize('zenMode.showTabs', "控制开启 Zen 模式时是显示多个编辑器选项卡、单个编辑器选项卡，还是完全隐藏编辑器标题区域。"),
				'enumDescriptions': [
					localize('zenMode.showTabs.multiple', "每个编辑器在编辑器标题区域中显示为一个选项卡。"),
					localize('zenMode.showTabs.single', "活动编辑器在编辑器标题区域中显示为单个大选项卡。"),
					localize('zenMode.showTabs.none', "不显示编辑器标题区域。"),
				],
				'default': 'multiple'
			},
			'zenMode.hideStatusBar': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.hideStatusBar', "控制开启 Zen 模式是否也隐藏工作台底部的状态栏。")
			},
			'zenMode.hideActivityBar': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.hideActivityBar', "控制开启 Zen 模式是否也隐藏工作台左侧或右侧的活动栏。")
			},
			'zenMode.hideLineNumbers': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.hideLineNumbers', "控制开启 Zen 模式是否也隐藏编辑器行号。")
			},
			'zenMode.restore': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.restore', "控制如果窗口在 Zen 模式下退出，是否应恢复到 Zen 模式。")
			},
			'zenMode.silentNotifications': {
				'type': 'boolean',
				'default': true,
				'description': localize('zenMode.silentNotifications', "控制在 Zen 模式下是否应启用通知勿扰模式。如果为 true，则仅弹出错误通知。")
			}
		}
	});
})();

Registry.as<IConfigurationMigrationRegistry>(Extensions.ConfigurationMigration)
	.registerConfigurationMigrations([{
		key: 'workbench.activityBar.visible', migrateFn: (value: unknown) => {
			const result: ConfigurationKeyValuePairs = [];
			if (value !== undefined) {
				result.push(['workbench.activityBar.visible', { value: undefined }]);
			}
			if (value === false) {
				result.push([LayoutSettings.ACTIVITY_BAR_LOCATION, { value: ActivityBarPosition.HIDDEN }]);
			}
			return result;
		}
	}]);

Registry.as<IConfigurationMigrationRegistry>(Extensions.ConfigurationMigration)
	.registerConfigurationMigrations([{
		key: LayoutSettings.ACTIVITY_BAR_LOCATION, migrateFn: (value: unknown) => {
			const results: ConfigurationKeyValuePairs = [];
			if (value === 'side') {
				results.push([LayoutSettings.ACTIVITY_BAR_LOCATION, { value: ActivityBarPosition.DEFAULT }]);
			}
			return results;
		}
	}]);

Registry.as<IConfigurationMigrationRegistry>(Extensions.ConfigurationMigration)
	.registerConfigurationMigrations([{
		key: 'workbench.editor.doubleClickTabToToggleEditorGroupSizes', migrateFn: (value: unknown) => {
			const results: ConfigurationKeyValuePairs = [];
			if (typeof value === 'boolean') {
				value = value ? 'expand' : 'off';
				results.push(['workbench.editor.doubleClickTabToToggleEditorGroupSizes', { value }]);
			}
			return results;
		}
	}, {
		key: LayoutSettings.EDITOR_TABS_MODE, migrateFn: (value: unknown) => {
			const results: ConfigurationKeyValuePairs = [];
			if (typeof value === 'boolean') {
				value = value ? EditorTabsMode.MULTIPLE : EditorTabsMode.SINGLE;
				results.push([LayoutSettings.EDITOR_TABS_MODE, { value }]);
			}
			return results;
		}
	}, {
		key: 'workbench.editor.tabCloseButton', migrateFn: (value: unknown) => {
			const result: ConfigurationKeyValuePairs = [];
			if (value === 'left' || value === 'right') {
				result.push(['workbench.editor.tabActionLocation', { value }]);
			} else if (value === 'off') {
				result.push(['workbench.editor.tabActionCloseVisibility', { value: false }]);
			}
			return result;
		}
	}, {
		key: 'zenMode.hideTabs', migrateFn: (value: unknown) => {
			const result: ConfigurationKeyValuePairs = [['zenMode.hideTabs', { value: undefined }]];
			if (value === true) {
				result.push(['zenMode.showTabs', { value: 'single' }]);
			}
			return result;
		}
	}]);
// LogicCore: Quantum Scanner Action
class ToggleScannerAction extends Action2 {
	constructor() {
		super({
			id: 'logiccore.toggleScanner',
			title: { value: 'LogicCore: 切换量子扫描 (Odradek)', original: 'LogicCore: Toggle Quantum Scanner' },
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const body = mainWindow.document.body;
		if (body.classList.contains('odradek-scan')) {
			body.classList.remove('odradek-scan');
		} else {
			body.classList.add('odradek-scan');
		}
	}
}
registerAction2(ToggleScannerAction);
