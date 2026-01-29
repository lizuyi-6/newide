/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';

// Using Codicon.beaker as the base for the LogicCore Architect icon
export const architectViewIcon = registerIcon('architect-view-icon', Codicon.beaker, localize('architectViewIcon', 'View icon of the LogicCore Architect.'));
