/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BreadcrumbsWidget } from '../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as glob from '../../../../base/common/glob.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationOverrides, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, IConfigurationRegistry, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { GroupIdentifier, IEditorPartOptions } from '../../../common/editor.js';

export const IBreadcrumbsService = createDecorator<IBreadcrumbsService>('IEditorBreadcrumbsService');

export interface IBreadcrumbsService {

	readonly _serviceBrand: undefined;

	register(group: GroupIdentifier, widget: BreadcrumbsWidget): IDisposable;

	getWidget(group: GroupIdentifier): BreadcrumbsWidget | undefined;
}


export class BreadcrumbsService implements IBreadcrumbsService {

	declare readonly _serviceBrand: undefined;

	private readonly _map = new Map<number, BreadcrumbsWidget>();

	register(group: number, widget: BreadcrumbsWidget): IDisposable {
		if (this._map.has(group)) {
			throw new Error(`group (${group}) has already a widget`);
		}
		this._map.set(group, widget);
		return {
			dispose: () => this._map.delete(group)
		};
	}

	getWidget(group: number): BreadcrumbsWidget | undefined {
		return this._map.get(group);
	}
}

registerSingleton(IBreadcrumbsService, BreadcrumbsService, InstantiationType.Delayed);


//#region config

export abstract class BreadcrumbsConfig<T> {

	abstract get name(): string;
	abstract get onDidChange(): Event<void>;

	abstract getValue(overrides?: IConfigurationOverrides): T;
	abstract updateValue(value: T, overrides?: IConfigurationOverrides): Promise<void>;
	abstract dispose(): void;

	private constructor() {
		// internal
	}

	static readonly IsEnabled = BreadcrumbsConfig._stub<boolean>('breadcrumbs.enabled');
	static readonly UseQuickPick = BreadcrumbsConfig._stub<boolean>('breadcrumbs.useQuickPick');
	static readonly FilePath = BreadcrumbsConfig._stub<'on' | 'off' | 'last'>('breadcrumbs.filePath');
	static readonly SymbolPath = BreadcrumbsConfig._stub<'on' | 'off' | 'last'>('breadcrumbs.symbolPath');
	static readonly SymbolSortOrder = BreadcrumbsConfig._stub<'position' | 'name' | 'type'>('breadcrumbs.symbolSortOrder');
	static readonly SymbolPathSeparator = BreadcrumbsConfig._stub<string>('breadcrumbs.symbolPathSeparator');
	static readonly Icons = BreadcrumbsConfig._stub<boolean>('breadcrumbs.icons');
	static readonly TitleScrollbarSizing = BreadcrumbsConfig._stub<IEditorPartOptions['titleScrollbarSizing']>('workbench.editor.titleScrollbarSizing');
	static readonly TitleScrollbarVisibility = BreadcrumbsConfig._stub<IEditorPartOptions['titleScrollbarVisibility']>('workbench.editor.titleScrollbarVisibility');

	static readonly FileExcludes = BreadcrumbsConfig._stub<glob.IExpression>('files.exclude');

	private static _stub<T>(name: string): { bindTo(service: IConfigurationService): BreadcrumbsConfig<T> } {
		return {
			bindTo(service) {
				const onDidChange = new Emitter<void>();

				const listener = service.onDidChangeConfiguration(e => {
					if (e.affectsConfiguration(name)) {
						onDidChange.fire(undefined);
					}
				});

				return new class implements BreadcrumbsConfig<T> {
					readonly name = name;
					readonly onDidChange = onDidChange.event;
					getValue(overrides?: IConfigurationOverrides): T {
						if (overrides) {
							return service.getValue(name, overrides);
						} else {
							return service.getValue(name);
						}
					}
					updateValue(newValue: T, overrides?: IConfigurationOverrides): Promise<void> {
						if (overrides) {
							return service.updateValue(name, newValue, overrides);
						} else {
							return service.updateValue(name, newValue);
						}
					}
					dispose(): void {
						listener.dispose();
						onDidChange.dispose();
					}
				};
			}
		};
	}
}

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	id: 'breadcrumbs',
	title: localize('title', "导航路径 (Breadcrumbs)"),
	order: 101,
	type: 'object',
	properties: {
		'breadcrumbs.enabled': {
			description: localize('enabled', "启用/禁用 顶部导航路径 (Breadcrumbs)。"),
			type: 'boolean',
			default: true
		},
		'breadcrumbs.filePath': {
			description: localize('filepath', "控制文件路径在导航路径视图中的显示方式。"),
			type: 'string',
			default: 'on',
			enum: ['on', 'off', 'last'],
			enumDescriptions: [
				localize('filepath.on', "在导航路径中显示完整文件路径。"),
				localize('filepath.off', "在导航路径中不显示文件路径。"),
				localize('filepath.last', "在导航路径中仅显示文件名的最后一部分。"),
			]
		},
		'breadcrumbs.symbolPath': {
			description: localize('symbolpath', "控制符号 (Symbols) 在导航路径视图中的显示方式。"),
			type: 'string',
			default: 'on',
			enum: ['on', 'off', 'last'],
			enumDescriptions: [
				localize('symbolpath.on', "在导航路径中显示所有符号。"),
				localize('symbolpath.off', "在导航路径中不显示符号。"),
				localize('symbolpath.last', "仅在导航路径中显示当前符号。"),
			]
		},
		'breadcrumbs.symbolSortOrder': {
			description: localize('symbolSortOrder', "控制符号在导航路径大纲视图中的排序方式。"),
			type: 'string',
			default: 'position',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			enum: ['position', 'name', 'type'],
			enumDescriptions: [
				localize('symbolSortOrder.position', "按文件位置排序符号大纲。"),
				localize('symbolSortOrder.name', "按字母顺序排序符号大纲。"),
				localize('symbolSortOrder.type', "按符号类型排序符号大纲。"),
			]
		},
		'breadcrumbs.icons': {
			description: localize('icons', "在导航路径项目中使用图标渲染。"),
			type: 'boolean',
			default: true
		},
		'breadcrumbs.symbolPathSeparator': {
			description: localize('symbolPathSeparator', "复制导航路径符号路径时使用的分隔符。"),
			type: 'string',
			default: '.',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'breadcrumbs.showFiles': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.file', "启用时，导航路径显示 `文件` 符号。")
		},
		'breadcrumbs.showModules': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.module', "启用时，导航路径显示 `模块` 符号。")
		},
		'breadcrumbs.showNamespaces': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.namespace', "启用时，导航路径显示 `命名空间` 符号。")
		},
		'breadcrumbs.showPackages': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.package', "启用时，导航路径显示 `包` 符号。")
		},
		'breadcrumbs.showClasses': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.class', "启用时，导航路径显示 `类` 符号。")
		},
		'breadcrumbs.showMethods': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.method', "启用时，导航路径显示 `方法` 符号。")
		},
		'breadcrumbs.showProperties': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.property', "启用时，导航路径显示 `属性` 符号。")
		},
		'breadcrumbs.showFields': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.field', "启用时，导航路径显示 `字段` 符号。")
		},
		'breadcrumbs.showConstructors': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constructor', "启用时，导航路径显示 `构造函数` 符号。")
		},
		'breadcrumbs.showEnums': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.enum', "启用时，导航路径显示 `枚举` 符号。")
		},
		'breadcrumbs.showInterfaces': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.interface', "启用时，导航路径显示 `接口` 符号。")
		},
		'breadcrumbs.showFunctions': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.function', "启用时，导航路径显示 `函数` 符号。")
		},
		'breadcrumbs.showVariables': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.variable', "启用时，导航路径显示 `变量` 符号。")
		},
		'breadcrumbs.showConstants': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constant', "启用时，导航路径显示 `常量` 符号。")
		},
		'breadcrumbs.showStrings': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.string', "启用时，导航路径显示 `字符串` 符号。")
		},
		'breadcrumbs.showNumbers': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.number', "启用时，导航路径显示 `数字` 符号。")
		},
		'breadcrumbs.showBooleans': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.boolean', "启用时，导航路径显示 `布尔值` 符号。")
		},
		'breadcrumbs.showArrays': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.array', "启用时，导航路径显示 `数组` 符号。")
		},
		'breadcrumbs.showObjects': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.object', "启用时，导航路径显示 `对象` 符号。")
		},
		'breadcrumbs.showKeys': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.key', "启用时，导航路径显示 `键` 符号。")
		},
		'breadcrumbs.showNull': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.null', "启用时，导航路径显示 `null` 符号。")
		},
		'breadcrumbs.showEnumMembers': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.enumMember', "启用时，导航路径显示 `枚举成员` 符号。")
		},
		'breadcrumbs.showStructs': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.struct', "启用时，导航路径显示 `结构` 符号。")
		},
		'breadcrumbs.showEvents': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.event', "启用时，导航路径显示 `事件` 符号。")
		},
		'breadcrumbs.showOperators': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.operator', "启用时，导航路径显示 `操作符` 符号。")
		},
		'breadcrumbs.showTypeParameters': {
			type: 'boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.typeParameter', "启用时，导航路径显示 `类型参数` 符号。")
		}
	}
});

//#endregion
