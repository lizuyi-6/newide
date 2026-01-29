/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';

export const ARCHITECT_VIEW_ID = 'workbench.view.architect';
export const ARCHITECT_CONTAINER_ID = 'workbench.view.architect.container';

export const ARCHITECT_CONTEXT_IN_BUILD = new RawContextKey<boolean>('architectInBuild', false);
