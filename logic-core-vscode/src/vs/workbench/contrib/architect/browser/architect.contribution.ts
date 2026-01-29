/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import { IViewContainersRegistry, ViewContainerLocation, Extensions as ViewExtensions, IViewsRegistry, IViewDescriptor } from '../../../common/views.js';
import { ARCHITECT_CONTAINER_ID, ARCHITECT_VIEW_ID } from '../common/architect.js';
import { architectViewIcon } from './architectIcons.js';
import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ArchitectView } from './architectView.js';
import { IArchitectGamePaneService, ArchitectGamePane } from './architectGamePane.js';
import { IArchitectClarificationService, ArchitectClarificationService } from './architectClarificationService.js';
import { IArchitectCodeGeneratorService, ArchitectCodeGeneratorService } from './architectCodeGeneratorService.js';
import { IArchitectChangeManagerService, ArchitectChangeManagerService } from './architectChangeManagerService.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// Register All Architect Services
registerSingleton(IArchitectGamePaneService, ArchitectGamePane, InstantiationType.Delayed);
registerSingleton(IArchitectClarificationService, ArchitectClarificationService, InstantiationType.Delayed);
registerSingleton(IArchitectCodeGeneratorService, ArchitectCodeGeneratorService, InstantiationType.Delayed);
registerSingleton(IArchitectChangeManagerService, ArchitectChangeManagerService, InstantiationType.Delayed);


// 1. Register View Container (Activity Bar Item)
const viewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: ARCHITECT_CONTAINER_ID,
    title: nls.localize2('architect', "LogicCore Architect"),
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [ARCHITECT_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
    icon: architectViewIcon,
    order: 10, // After standard views
}, ViewContainerLocation.AuxiliaryBar);

// 2. Register View (Sidebar Pane)
const viewDescriptor: IViewDescriptor = {
    id: ARCHITECT_VIEW_ID,
    name: nls.localize2('architect.builder', "构思与构建"),
    ctorDescriptor: new SyncDescriptor(ArchitectView),
    canToggleVisibility: false,
    canMoveView: true
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);
