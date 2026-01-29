/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from '../../../../nls.js';
import { sep } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope, IConfigurationPropertySchema } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IFileEditorInput, IEditorFactoryRegistry, EditorExtensions } from '../../../common/editor.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, FILES_READONLY_FROM_PERMISSIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { SortOrder, LexicographicOptions, FILE_EDITOR_INPUT_ID, BINARY_TEXT_FILE_MODE, UndoConfirmLevel, IFilesConfiguration } from '../common/files.js';
import { TextFileEditorTracker } from './editors/textFileEditorTracker.js';
import { TextFileSaveErrorHandler } from './editors/textFileSaveErrorHandler.js';
import { FileEditorInput } from './editors/fileEditorInput.js';
import { BinaryFileEditor } from './editors/binaryFileEditor.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { isNative, isWeb, isWindows } from '../../../../base/common/platform.js';
import { ExplorerViewletViewsContribution } from './explorerViewlet.js';
import { IEditorPaneRegistry, EditorPaneDescriptor } from '../../../browser/editor.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExplorerService, UNDO_REDO_SOURCE } from './explorerService.js';
import { GUESSABLE_ENCODINGS, SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkspaceWatcher } from './workspaceWatcher.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { DirtyFilesIndicator } from '../common/dirtyFilesIndicator.js';
import { UndoCommand, RedoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IExplorerService } from './files.js';
import { FileEditorInputSerializer, FileEditorWorkingCopyEditorHandler } from './editors/fileEditorHandler.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextFileEditor } from './editors/textFileEditor.js';

class FileUriLabelContribution implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.fileUriLabel';

	constructor(@ILabelService labelService: ILabelService) {
		labelService.registerFormatter({
			scheme: Schemas.file,
			formatting: {
				label: '${authority}${path}',
				separator: sep,
				tildify: !isWindows,
				normalizeDriveLetter: isWindows,
				authorityPrefix: sep + sep,
				workspaceSuffix: ''
			}
		});
	}
}

registerSingleton(IExplorerService, ExplorerService, InstantiationType.Delayed);

// Register file editors

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		TextFileEditor,
		TextFileEditor.ID,
		nls.localize('textFileEditor', "文本编辑器")
	),
	[
		new SyncDescriptor(FileEditorInput)
	]
);

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		BinaryFileEditor,
		BinaryFileEditor.ID,
		nls.localize('binaryFileEditor', "二进制文件编辑器")
	),
	[
		new SyncDescriptor(FileEditorInput)
	]
);

// Register default file input factory
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerFileEditorFactory({

	typeId: FILE_EDITOR_INPUT_ID,

	createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService): IFileEditorInput => {
		return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
	},

	isFileEditor: (obj): obj is IFileEditorInput => {
		return obj instanceof FileEditorInput;
	}
});

// Register Editor Input Serializer & Handler
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(FILE_EDITOR_INPUT_ID, FileEditorInputSerializer);
registerWorkbenchContribution2(FileEditorWorkingCopyEditorHandler.ID, FileEditorWorkingCopyEditorHandler, WorkbenchPhase.BlockRestore);

// Register Explorer views
registerWorkbenchContribution2(ExplorerViewletViewsContribution.ID, ExplorerViewletViewsContribution, WorkbenchPhase.BlockStartup);

// Register Text File Editor Tracker
registerWorkbenchContribution2(TextFileEditorTracker.ID, TextFileEditorTracker, WorkbenchPhase.BlockStartup);

// Register Text File Save Error Handler
registerWorkbenchContribution2(TextFileSaveErrorHandler.ID, TextFileSaveErrorHandler, WorkbenchPhase.BlockStartup);

// Register uri display for file uris
registerWorkbenchContribution2(FileUriLabelContribution.ID, FileUriLabelContribution, WorkbenchPhase.BlockStartup);

// Register Workspace Watcher
registerWorkbenchContribution2(WorkspaceWatcher.ID, WorkspaceWatcher, WorkbenchPhase.AfterRestored);

// Register Dirty Files Indicator
registerWorkbenchContribution2(DirtyFilesIndicator.ID, DirtyFilesIndicator, WorkbenchPhase.BlockStartup);

// Configuration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

const hotExitConfiguration: IConfigurationPropertySchema = isNative ?
	{
		'type': 'string',
		'scope': ConfigurationScope.APPLICATION,
		'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
		'default': HotExitConfiguration.ON_EXIT,
		'markdownEnumDescriptions': [
			nls.localize('hotExit.off', '禁用热退出。尝试关闭包含未保存更改的编辑器的窗口时，将显示提示。'),
			nls.localize('hotExit.onExit', '当在 Windows/Linux 上关闭最后一个窗口或触发 `workbench.action.quit` 命令（命令面板、键绑定、菜单）时，将触发热退出。下次启动时将恢复所有未打开文件夹的窗口。可以通过 `文件 > 打开最近的文件 > 更多...` 访问包含未保存文件的先前打开窗口的列表。'),
			nls.localize('hotExit.onExitAndWindowClose', '当在 Windows/Linux 上关闭最后一个窗口或触发 `workbench.action.quit` 命令（命令面板、键绑定、菜单）时，以及对于任何打开了文件夹的窗口（无论是否为最后一个窗口），都将触发热退出。下次启动时将恢复所有未打开文件夹的窗口。可以通过 `文件 > 打开最近的文件 > 更多...` 访问包含未保存文件的先前打开窗口的列表。')
		],
		'markdownDescription': nls.localize('hotExit', "[热退出](https://aka.ms/vscode-hot-exit)控制是否在会话之间记住未保存的文件，从而允许在退出编辑器时跳过保存提示。", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
	} : {
		'type': 'string',
		'scope': ConfigurationScope.APPLICATION,
		'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
		'default': HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
		'markdownEnumDescriptions': [
			nls.localize('hotExit.off', '禁用热退出。尝试关闭包含未保存更改的编辑器的窗口时，将显示提示。'),
			nls.localize('hotExit.onExitAndWindowCloseBrowser', '当浏览器退出或窗口或选项卡关闭时，将触发热退出。')
		],
		'markdownDescription': nls.localize('hotExit', "[热退出](https://aka.ms/vscode-hot-exit)控制是否在会话之间记住未保存的文件，从而允许在退出编辑器时跳过保存提示。", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
	};

configurationRegistry.registerConfiguration({
	'id': 'files',
	'order': 9,
	'title': nls.localize('filesConfigurationTitle', "Files"),
	'type': 'object',
	'properties': {
		[FILES_EXCLUDE_CONFIG]: {
			'type': 'object',
			'markdownDescription': nls.localize('exclude', "配置用于排除文件和文件夹的 [glob 模式](https://aka.ms/vscode-glob-patterns)。例如，文件资源管理器根据此设置决定显示或隐藏哪些文件和文件夹。请参阅 `#search.exclude#` 设置以定义特定于搜索的排除项。请参阅 `#explorer.excludeGitIgnore#` 设置以根据您的 `.gitignore` 忽略文件。"),
			'default': {
				...{ '**/.git': true, '**/.svn': true, '**/.hg': true, '**/.DS_Store': true, '**/Thumbs.db': true },
				...(isWeb ? { '**/*.crswap': true /* filter out swap files used for local file access */ } : undefined)
			},
			'scope': ConfigurationScope.RESOURCE,
			'additionalProperties': {
				'anyOf': [
					{
						'type': 'boolean',
						'enum': [true, false],
						'enumDescriptions': [nls.localize('trueDescription', "启用模式。"), nls.localize('falseDescription', "禁用模式。")],
						'description': nls.localize('files.exclude.boolean', "用于匹配文件路径的 glob 模式。设置为 true 或 false 以启用或禁用模式。"),
					},
					{
						'type': 'object',
						'properties': {
							'when': {
								'type': 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
								'pattern': '\\w*\\$\\(basename\\)\\w*',
								'default': '$(basename).ext',
								'markdownDescription': nls.localize({ key: 'files.exclude.when', comment: ['\\$(basename) should not be translated'] }, "对匹配文件的同级文件进行额外检查。使用 \\$(basename) 作为匹配文件名的变量。")
							}
						}
					}
				]
			}
		},
		[FILES_ASSOCIATIONS_CONFIG]: {
			'type': 'object',
			'markdownDescription': nls.localize('associations', "配置语言的文件关联 [glob 模式](https://aka.ms/vscode-glob-patterns)（例如 `\"*.extension\": \"html\"`）。如果模式包含路径分隔符，则将匹配文件的绝对路径，否则将匹配文件名。这些优先于已安装语言的默认关联。"),
			'additionalProperties': {
				'type': 'string'
			}
		},
		'files.encoding': {
			'type': 'string',
			'enum': Object.keys(SUPPORTED_ENCODINGS),
			'default': 'utf8',
			'description': nls.localize('encoding', "读取和写入文件时使用的默认字符集编码。此设置也可以按语言进行配置。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
			'enumDescriptions': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong),
			'enumItemLabels': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong)
		},
		'files.autoGuessEncoding': {
			'type': 'boolean',
			'default': false,
			'markdownDescription': nls.localize('autoGuessEncoding', "启用时，编辑器将在打开文件时尝试猜测字符集编码。此设置也可以按语言进行配置。请注意，文本搜索不遵循此设置。仅遵循 {0}。", '`#files.encoding#`'),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.candidateGuessEncodings': {
			'type': 'array',
			'items': {
				'type': 'string',
				'enum': Object.keys(GUESSABLE_ENCODINGS),
				'enumDescriptions': Object.keys(GUESSABLE_ENCODINGS).map(key => GUESSABLE_ENCODINGS[key].labelLong)
			},
			'default': [],
			'markdownDescription': nls.localize('candidateGuessEncodings', "编辑器应尝试按顺序列出的猜测字符集编码列表。如果无法确定，则遵循 {0}", '`#files.encoding#`'),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.eol': {
			'type': 'string',
			'enum': [
				'\n',
				'\r\n',
				'auto'
			],
			'enumDescriptions': [
				nls.localize('eol.LF', "LF"),
				nls.localize('eol.CRLF', "CRLF"),
				nls.localize('eol.auto', "使用操作系统特定的行尾字符。")
			],
			'default': 'auto',
			'description': nls.localize('eol', "默认行尾字符。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.enableTrash': {
			'type': 'boolean',
			'default': true,
			'description': nls.localize('useTrash', "删除时将文件/文件夹移动到操作系统回收站（在 Windows 上为回收站）。禁用此项将永久删除文件/文件夹。")
		},
		'files.trimTrailingWhitespace': {
			'type': 'boolean',
			'default': false,
			'description': nls.localize('trimTrailingWhitespace', "启用时，保存文件时将修剪尾随空格。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.trimTrailingWhitespaceInRegexAndStrings': {
			'type': 'boolean',
			'default': true,
			'description': nls.localize('trimTrailingWhitespaceInRegexAndStrings', "启用时，将在保存时或执行“editor.action.trimTrailingWhitespace”时从多行字符串和正则表达式中删除尾随空格。这可能会导致未从没有最新标记信息的行中修剪空格。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.insertFinalNewline': {
			'type': 'boolean',
			'default': false,
			'description': nls.localize('insertFinalNewline', "启用时，保存文件时在文件末尾插入最后的换行符。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.trimFinalNewlines': {
			'type': 'boolean',
			'default': false,
			'description': nls.localize('trimFinalNewlines', "启用时，保存文件时将修剪文件末尾最后一行之后的所有新行。"),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
		'files.autoSave': {
			'type': 'string',
			'enum': [AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE],
			'markdownEnumDescriptions': [
				nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.off' }, "具有更改的编辑器永远不会自动保存。"),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.afterDelay' }, "具有更改的编辑器在配置的 `#files.autoSaveDelay#` 后自动保存。"),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onFocusChange' }, "当编辑器失去焦点时，具有更改的编辑器将自动保存。"),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onWindowChange' }, "当窗口失去焦点时，具有更改的编辑器将自动保存。")
			],
			'default': isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
			'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSave' }, "控制具有未保存更改的编辑器的[自动保存](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save)。", AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.autoSaveDelay': {
			'type': 'number',
			'default': 1000,
			'minimum': 0,
			'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSaveDelay' }, "控制在多少毫秒后自动保存具有未保存更改的编辑器。仅在 `#files.autoSave#` 设置为 `{0}` 时适用。", AutoSaveConfiguration.AFTER_DELAY),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.autoSaveWorkspaceFilesOnly': {
			'type': 'boolean',
			'default': false,
			'markdownDescription': nls.localize('autoSaveWorkspaceFilesOnly', "启用时，将编辑器的[自动保存](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save)限制为打开的工作区内的文件。仅当 {0} 启用时适用。", '`#files.autoSave#`'),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.autoSaveWhenNoErrors': {
			'type': 'boolean',
			'default': false,
			'markdownDescription': nls.localize('autoSaveWhenNoErrors', "启用时，将编辑器的[自动保存](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save)限制为在触发自动保存时没有报告错误的文件。仅当 {0} 启用时适用。", '`#files.autoSave#`'),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.watcherExclude': {
			'type': 'object',
			'patternProperties': {
				'.*': { 'type': 'boolean' }
			},
			'default': { '**/.git/objects/**': true, '**/.git/subtree-cache/**': true, '**/.hg/store/**': true },
			'markdownDescription': nls.localize('watcherExclude', "配置要从文件监视中排除的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。路径可以是相对于被监视文件夹的路径，也可以是绝对路径。Glob 模式是相对于被监视文件夹进行匹配的。当您遇到文件监视程序进程消耗大量 CPU 时，请确保排除不太感兴趣的大型文件夹（例如构建输出文件夹）。"),
			'scope': ConfigurationScope.RESOURCE
		},
		'files.watcherInclude': {
			'type': 'array',
			'items': {
				'type': 'string'
			},
			'default': [],
			'description': nls.localize('watcherInclude', "配置要在工作区内监视更改的额外路径。默认情况下，将递归监视所有工作区文件夹，但符号链接文件夹除外。您可以显式添加绝对或相对路径以支持监视作为符号链接的文件夹。相对路径将使用当前打开的工作区解析为绝对路径。"),
			'scope': ConfigurationScope.RESOURCE
		},
		'files.hotExit': hotExitConfiguration,
		'files.defaultLanguage': {
			'type': 'string',
			'markdownDescription': nls.localize('defaultLanguage', "分配给新文件的默认语言标识符。如果配置为 `${activeEditorLanguage}`，将使用当前活动文本编辑器（如果有）的语言标识符。")
		},
		[FILES_READONLY_INCLUDE_CONFIG]: {
			'type': 'object',
			'patternProperties': {
				'.*': { 'type': 'boolean' }
			},
			'default': {},
			'markdownDescription': nls.localize('filesReadonlyInclude', "配置要标记为只读的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非是绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行评估。您可以通过 `#files.readonlyExclude#` 设置排除匹配路径。来自只读文件系统提供程序的文件将始终为只读，与此设置无关。"),
			'scope': ConfigurationScope.RESOURCE
		},
		[FILES_READONLY_EXCLUDE_CONFIG]: {
			'type': 'object',
			'patternProperties': {
				'.*': { 'type': 'boolean' }
			},
			'default': {},
			'markdownDescription': nls.localize('filesReadonlyExclude', "配置如果要根据 `#files.readonlyInclude#` 设置匹配，则排除在只读标记之外的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非是绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行评估。来自只读文件系统提供程序的文件将始终为只读，与此设置无关。"),
			'scope': ConfigurationScope.RESOURCE
		},
		[FILES_READONLY_FROM_PERMISSIONS_CONFIG]: {
			'type': 'boolean',
			'markdownDescription': nls.localize('filesReadonlyFromPermissions', "当文件权限指示为只读时，将文件标记为只读。这可以通过 `#files.readonlyInclude#` 和 `#files.readonlyExclude#` 设置进行覆盖。"),
			'default': false
		},
		'files.restoreUndoStack': {
			'type': 'boolean',
			'description': nls.localize('files.restoreUndoStack', "重新打开文件时恢复撤消堆栈。"),
			'default': true
		},
		'files.saveConflictResolution': {
			'type': 'string',
			'enum': [
				'askUser',
				'overwriteFileOnDisk'
			],
			'enumDescriptions': [
				nls.localize('askUser', "将拒绝保存并要求手动解决保存冲突。"),
				nls.localize('overwriteFileOnDisk', "将使用编辑器中的更改覆盖磁盘上的文件来解决保存冲突。")
			],
			'description': nls.localize('files.saveConflictResolution', "当保存已在此时被另一个程序更改的文件到磁盘时，可能会发生保存冲突。为了防止数据丢失，将要求用户将编辑器中的更改与磁盘上的版本进行比较。仅当您经常遇到保存冲突错误时才应更改此设置，如果不谨慎使用可能会导致数据丢失。"),
			'default': 'askUser',
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.dialog.defaultPath': {
			'type': 'string',
			'pattern': '^((\\/|\\\\\\\\|[a-zA-Z]:\\\\).*)?$', // slash OR UNC-root OR drive-root OR undefined
			'patternErrorMessage': nls.localize('defaultPathErrorMessage', "文件对话框的默认路径必须是绝对路径（例如 C:\\\\myFolder 或 /myFolder）。"),
			'description': nls.localize('fileDialogDefaultPath', "文件对话框的默认路径，覆盖用户的主路径。仅在没有特定于上下文的路径（例如最近打开的文件或文件夹）的情况下使用。"),
			'scope': ConfigurationScope.MACHINE
		},
		'files.simpleDialog.enable': {
			'type': 'boolean',
			'description': nls.localize('files.simpleDialog.enable', "启用用于打开和保存文件和文件夹的简单文件对话框。启用后，简单文件对话框将替换系统文件对话框。"),
			'default': false
		},
		'files.participants.timeout': {
			type: 'number',
			default: 60000,
			markdownDescription: nls.localize('files.participants.timeout', "取消创建、重命名和删除的文件参与者之前的超时（以毫秒为单位）。使用 `0` 禁用参与者。"),
		}
	}
});

configurationRegistry.registerConfiguration({
	...editorConfigurationBaseNode,
	properties: {
		'editor.formatOnSave': {
			'type': 'boolean',
			'markdownDescription': nls.localize('formatOnSave', "保存时格式化文件。必须有可用的格式化程序，且编辑器不能正在关闭。当 {0} 设置为 `afterDelay` 时，文件仅在显式保存时格式化。", '`#files.autoSave#`'),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
		'editor.formatOnSaveMode': {
			'type': 'string',
			'default': 'file',
			'enum': [
				'file',
				'modifications',
				'modificationsIfAvailable'
			],
			'enumDescriptions': [
				nls.localize({ key: 'everything', comment: ['This is the description of an option'] }, "格式化整个文件。"),
				nls.localize({ key: 'modification', comment: ['This is the description of an option'] }, "格式化修改内容。需要源代码控制和支持“格式化选定内容”的格式化程序。"),
				nls.localize({ key: 'modificationIfAvailable', comment: ['This is the description of an option'] }, "将尝试仅格式化修改内容（需要源代码控制和支持“格式化选定内容”的格式化程序）。如果无法使用源代码控制，则将格式化整个文件。"),
			],
			'markdownDescription': nls.localize('formatOnSaveMode', "控制保存格式化时是格式化整个文件还是仅格式化修改内容。仅当启用 `#editor.formatOnSave#` 时适用。"),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
	}
});

configurationRegistry.registerConfiguration({
	'id': 'explorer',
	'order': 10,
	'title': nls.localize('explorerConfigurationTitle', "资源管理器"),
	'type': 'object',
	'properties': {
		'explorer.openEditors.visible': {
			'type': 'number',
			'description': nls.localize({ key: 'openEditorsVisible', comment: ['Open is an adjective'] }, "“打开的编辑器”窗格中显示的初始最大编辑器数量。超出此限制将显示滚动条，并允许调整窗格大小以显示更多项目。"),
			'default': 9,
			'minimum': 1
		},
		'explorer.openEditors.minVisible': {
			'type': 'number',
			'description': nls.localize({ key: 'openEditorsVisibleMin', comment: ['Open is an adjective'] }, "“打开的编辑器”窗格中预分配的最小编辑器插槽数。如果设置为 0，“打开的编辑器”窗格将根据编辑器数量动态调整大小。"),
			'default': 0,
			'minimum': 0
		},
		'explorer.openEditors.sortOrder': {
			'type': 'string',
			'enum': ['editorOrder', 'alphabetical', 'fullPath'],
			'description': nls.localize({ key: 'openEditorsSortOrder', comment: ['Open is an adjective'] }, "控制“打开的编辑器”窗格中编辑器的排序顺序。"),
			'enumDescriptions': [
				nls.localize('sortOrder.editorOrder', '编辑器按编辑器选项卡显示的相同顺序排序。'),
				nls.localize('sortOrder.alphabetical', '编辑器在每个编辑器组内按选项卡名称按字母顺序排序。'),
				nls.localize('sortOrder.fullPath', '编辑器在每个编辑器组内按完整路径按字母顺序排序。')
			],
			'default': 'editorOrder'
		},
		'explorer.autoReveal': {
			'type': ['boolean', 'string'],
			'enum': [true, false, 'focusNoScroll'],
			'default': true,
			'enumDescriptions': [
				nls.localize('autoReveal.on', '文件将被显示并选中。'),
				nls.localize('autoReveal.off', '文件将不会被显示并选中。'),
				nls.localize('autoReveal.focusNoScroll', '文件不会滚动到视图中，但仍会被聚焦。'),
			],
			'description': nls.localize('autoReveal', "控制资源管理器在打开文件时是否应自动显示并选中文件。")
		},
		'explorer.autoRevealExclude': {
			'type': 'object',
			'markdownDescription': nls.localize('autoRevealExclude', "配置要从资源管理器打开时的显示和选中中排除的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非是绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行评估。"),
			'default': { '**/node_modules': true, '**/bower_components': true },
			'additionalProperties': {
				'anyOf': [
					{
						'type': 'boolean',
						'description': nls.localize('explorer.autoRevealExclude.boolean', "用于匹配文件路径的 glob 模式。设置为 true 或 false 以启用或禁用模式。"),
					},
					{
						type: 'object',
						properties: {
							when: {
								type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
								pattern: '\\w*\\$\\(basename\\)\\w*',
								default: '$(basename).ext',
								description: nls.localize('explorer.autoRevealExclude.when', '对匹配文件的同级文件进行额外检查。使用 $(basename) 作为匹配文件名的变量。')
							}
						}
					}
				]
			}
		},
		'explorer.enableDragAndDrop': {
			'type': 'boolean',
			'description': nls.localize('enableDragAndDrop', "控制资源管理器是否应允许通过拖放移动文件和文件夹。此设置仅影响从资源管理器内部进行的拖放。"),
			'default': true
		},
		'explorer.confirmDragAndDrop': {
			'type': 'boolean',
			'description': nls.localize('confirmDragAndDrop', "控制资源管理器是否应要求确认才能通过拖放移动文件和文件夹。"),
			'default': true
		},
		'explorer.confirmPasteNative': {
			'type': 'boolean',
			'description': nls.localize('confirmPasteNative', "控制资源管理器是否应在粘贴本机文件和文件夹时要求确认。"),
			'default': true
		},
		'explorer.confirmDelete': {
			'type': 'boolean',
			'description': nls.localize('confirmDelete', "控制资源管理器在删除文件和文件夹时是否应要求确认。"),
			'default': true
		},
		'explorer.enableUndo': {
			'type': 'boolean',
			'description': nls.localize('enableUndo', "控制资源管理器是否应支持撤消文件和文件夹操作。"),
			'default': true
		},
		'explorer.confirmUndo': {
			'type': 'string',
			'enum': [UndoConfirmLevel.Verbose, UndoConfirmLevel.Default, UndoConfirmLevel.Light],
			'description': nls.localize('confirmUndo', "控制资源管理器是否应在撤消时要求确认。"),
			'default': UndoConfirmLevel.Default,
			'enumDescriptions': [
				nls.localize('enableUndo.verbose', '资源管理器将在所有撤消操作之前提示。'),
				nls.localize('enableUndo.default', '资源管理器将在破坏性撤消操作之前提示。'),
				nls.localize('enableUndo.light', '聚焦时，资源管理器不会在撤消操作之前提示。'),
			],
		},
		'explorer.expandSingleFolderWorkspaces': {
			'type': 'boolean',
			'description': nls.localize('expandSingleFolderWorkspaces', "控制资源管理器是否应在初始化期间展开仅包含一个文件夹的多根工作区。"),
			'default': true
		},
		'explorer.sortOrder': {
			'type': 'string',
			'enum': [SortOrder.Default, SortOrder.Mixed, SortOrder.FilesFirst, SortOrder.Type, SortOrder.Modified, SortOrder.FoldersNestsFiles],
			'default': SortOrder.Default,
			'enumDescriptions': [
				nls.localize('sortOrder.default', '文件和文件夹按名称排序。文件夹显示在文件之前。'),
				nls.localize('sortOrder.mixed', '文件和文件夹按名称排序。文件与文件夹交织在一起。'),
				nls.localize('sortOrder.filesFirst', '文件和文件夹按名称排序。文件显示在文件夹之前。'),
				nls.localize('sortOrder.type', '文件和文件夹按扩展名类型分组，然后按名称排序。文件夹显示在文件之前。'),
				nls.localize('sortOrder.modified', '文件和文件夹按最后修改日期降序排序。文件夹显示在文件之前。'),
				nls.localize('sortOrder.foldersNestsFiles', '文件和文件夹按名称排序。文件夹显示在文件之前。具有嵌套子项的文件显示在其他文件之前。')
			],
			'markdownDescription': nls.localize('sortOrder', "控制资源管理器中文件和文件夹的基于属性的排序。启用 `#explorer.fileNesting.enabled#` 时，还控制嵌套文件的排序。")
		},
		'explorer.sortOrderLexicographicOptions': {
			'type': 'string',
			'enum': [LexicographicOptions.Default, LexicographicOptions.Upper, LexicographicOptions.Lower, LexicographicOptions.Unicode],
			'default': LexicographicOptions.Default,
			'enumDescriptions': [
				nls.localize('sortOrderLexicographicOptions.default', '大写和小写名称混合在一起。'),
				nls.localize('sortOrderLexicographicOptions.upper', '大写名称分组在小写名称之前。'),
				nls.localize('sortOrderLexicographicOptions.lower', '小写名称分组在大写名称之前。'),
				nls.localize('sortOrderLexicographicOptions.unicode', '名称按 Unicode 顺序排序。')
			],
			'description': nls.localize('sortOrderLexicographicOptions', "控制资源管理器中文件和文件夹名称的字典排序。")
		},
		'explorer.sortOrderReverse': {
			'type': 'boolean',
			'description': nls.localize('sortOrderReverse', "控制文件和文件夹的排序顺序是否应反转。"),
			'default': false,
		},
		'explorer.decorations.colors': {
			type: 'boolean',
			description: nls.localize('explorer.decorations.colors', "控制文件修饰是否应使用颜色。"),
			default: true
		},
		'explorer.decorations.badges': {
			type: 'boolean',
			description: nls.localize('explorer.decorations.badges', "控制文件修饰是否应使用徽章。"),
			default: true
		},
		'explorer.incrementalNaming': {
			'type': 'string',
			enum: ['simple', 'smart', 'disabled'],
			enumDescriptions: [
				nls.localize('simple', "在重复名称的末尾附加单词“copy”，后面可能跟一个数字。"),
				nls.localize('smart', "在重复名称的末尾添加一个数字。如果名称中已包含某个数字，则尝试增加该数字。"),
				nls.localize('disabled', "禁用增量命名。如果存在同名文件，系统将提示您覆盖现有文件。")
			],
			description: nls.localize('explorer.incrementalNaming', "控制粘贴时给重复的资源管理器项命名时使用的命名策略。"),
			default: 'simple'
		},
		'explorer.autoOpenDroppedFile': {
			'type': 'boolean',
			'description': nls.localize('autoOpenDroppedFile', "控制资源管理器在将文件拖入其中时是否应自动打开文件。"),
			'default': true
		},
		'explorer.compactFolders': {
			'type': 'boolean',
			'description': nls.localize('compressSingleChildFolders', "控制资源管理器是否应以紧凑形式呈现文件夹。在这种形式下，单个子文件夹将被压缩在组合树元素中。例如，这对于 Java 包结构很有用。"),
			'default': true
		},
		'explorer.copyRelativePathSeparator': {
			'type': 'string',
			'enum': [
				'/',
				'\\',
				'auto'
			],
			'enumDescriptions': [
				nls.localize('copyRelativePathSeparator.slash', "使用斜杠作为路径分隔符。"),
				nls.localize('copyRelativePathSeparator.backslash', "使用反斜杠作为路径分隔符。"),
				nls.localize('copyRelativePathSeparator.auto', "使用操作系统特定的路径分隔符。"),
			],
			'description': nls.localize('copyRelativePathSeparator', "复制相对文件路径时使用的路径分隔符。"),
			'default': 'auto'
		},
		'explorer.copyPathSeparator': {
			'type': 'string',
			'enum': [
				'/',
				'\\',
				'auto'
			],
			'enumDescriptions': [
				nls.localize('copyPathSeparator.slash', "使用斜杠作为路径分隔符。"),
				nls.localize('copyPathSeparator.backslash', "使用反斜杠作为路径分隔符。"),
				nls.localize('copyPathSeparator.auto', "使用操作系统特定的路径分隔符。"),
			],
			'description': nls.localize('copyPathSeparator', "复制文件路径时使用的路径分隔符。"),
			'default': 'auto'
		},
		'explorer.excludeGitIgnore': {
			type: 'boolean',
			markdownDescription: nls.localize('excludeGitignore', "控制 .gitignore 中的条目是否应被解析并从资源管理器中排除。类似于 {0}。", '`#files.exclude#`'),
			default: false,
			scope: ConfigurationScope.RESOURCE
		},
		'explorer.fileNesting.enabled': {
			'type': 'boolean',
			scope: ConfigurationScope.RESOURCE,
			'markdownDescription': nls.localize('fileNestingEnabled', "控制资源管理器中是否启用文件嵌套。文件嵌套允许将目录中的相关文件在单个父文件下直观地分组。"),
			'default': false,
		},
		'explorer.fileNesting.expand': {
			'type': 'boolean',
			'markdownDescription': nls.localize('fileNestingExpand', "控制是否自动展开文件嵌套。必须设置 {0} 才能生效。", '`#explorer.fileNesting.enabled#`'),
			'default': true,
		},
		'explorer.fileNesting.patterns': {
			'type': 'object',
			scope: ConfigurationScope.RESOURCE,
			'markdownDescription': nls.localize('fileNestingPatterns', "控制资源管理器中的文件嵌套。必须设置 {0} 才能生效。每个 __Item__ 代表一个父模式，并且可以包含一个匹配任何字符串的 `*` 字符。每个 __Value__ 代表逗号分隔的子模式列表，这些子模式应在给定的父模式下嵌套显示。子模式可以包含几个特殊标记：\n- `${capture}`：匹配父模式中 `*` 的解析值\n- `${basename}`：匹配父文件的基本名称，即 `file.ts` 中的 `file`\n- `${extname}`：匹配父文件的扩展名，即 `file.ts` 中的 `ts`\n- `${dirname}`：匹配父文件的目录名称，即 `src/file.ts` 中的 `src`\n- `*`：匹配任何字符串，每个子模式仅可使用一次", '`#explorer.fileNesting.enabled#`'),
			patternProperties: {
				'^[^*]*\\*?[^*]*$': {
					markdownDescription: nls.localize('fileNesting.description', "每个键模式可以包含一个 `*` 字符，该字符将匹配任何字符串。"),
					type: 'string',
					pattern: '^([^,*]*\\*?[^,*]*)(, ?[^,*]*\\*?[^,*]*)*$',
				}
			},
			additionalProperties: false,
			'default': {
				'*.ts': '${capture}.js',
				'*.js': '${capture}.js.map, ${capture}.min.js, ${capture}.d.ts',
				'*.jsx': '${capture}.js',
				'*.tsx': '${capture}.ts',
				'tsconfig.json': 'tsconfig.*.json',
				'package.json': 'package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, bun.lock',
			}
		}
	}
});

UndoCommand.addImplementation(110, 'explorer', (accessor: ServicesAccessor) => {
	const undoRedoService = accessor.get(IUndoRedoService);
	const explorerService = accessor.get(IExplorerService);
	const configurationService = accessor.get(IConfigurationService);

	const explorerCanUndo = configurationService.getValue<IFilesConfiguration>().explorer.enableUndo;
	if (explorerService.hasViewFocus() && undoRedoService.canUndo(UNDO_REDO_SOURCE) && explorerCanUndo) {
		undoRedoService.undo(UNDO_REDO_SOURCE);
		return true;
	}

	return false;
});

RedoCommand.addImplementation(110, 'explorer', (accessor: ServicesAccessor) => {
	const undoRedoService = accessor.get(IUndoRedoService);
	const explorerService = accessor.get(IExplorerService);
	const configurationService = accessor.get(IConfigurationService);

	const explorerCanUndo = configurationService.getValue<IFilesConfiguration>().explorer.enableUndo;
	if (explorerService.hasViewFocus() && undoRedoService.canRedo(UNDO_REDO_SOURCE) && explorerCanUndo) {
		undoRedoService.redo(UNDO_REDO_SOURCE);
		return true;
	}

	return false;
});

ModesRegistry.registerLanguage({
	id: BINARY_TEXT_FILE_MODE,
	aliases: ['Binary'],
	mimetypes: ['text/x-code-binary']
});
