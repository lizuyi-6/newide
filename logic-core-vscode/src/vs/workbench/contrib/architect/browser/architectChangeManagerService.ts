/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { URI } from '../../../../base/common/uri.js';

export const IArchitectChangeManagerService = createDecorator<IArchitectChangeManagerService>('architectChangeManagerService');

export type ChangeType = 'new' | 'modified' | 'deleted';
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface IFileChange {
    id: string;
    filePath: string;
    fileName: string;
    changeType: ChangeType;
    status: ChangeStatus;
    originalContent: string | null;
    newContent: string;
    addedLines: number;
    removedLines: number;
    summary: string;
}

export interface IArchitectChangeManagerService {
    readonly _serviceBrand: undefined;

    readonly onChangesUpdated: Event<IFileChange[]>;
    readonly onChangeApplied: Event<IFileChange>;
    readonly onAllChangesApplied: Event<void>;

    addChange(change: Omit<IFileChange, 'id' | 'status'>): IFileChange;
    approveChange(changeId: string): void;
    rejectChange(changeId: string): void;
    applyChange(changeId: string): Promise<void>;
    applyAllApproved(): Promise<void>;
    rejectAll(): void;
    getChanges(): IFileChange[];
    getPendingChanges(): IFileChange[];
    clearChanges(): void;
}

export class ArchitectChangeManagerService extends Disposable implements IArchitectChangeManagerService {

    readonly _serviceBrand: undefined;

    private readonly _onChangesUpdated = this._register(new Emitter<IFileChange[]>());
    readonly onChangesUpdated: Event<IFileChange[]> = this._onChangesUpdated.event;

    private readonly _onChangeApplied = this._register(new Emitter<IFileChange>());
    readonly onChangeApplied: Event<IFileChange> = this._onChangeApplied.event;

    private readonly _onAllChangesApplied = this._register(new Emitter<void>());
    readonly onAllChangesApplied: Event<void> = this._onAllChangesApplied.event;

    private _changes: IFileChange[] = [];
    private _idCounter: number = 0;

    constructor(
        @IFileService private readonly fileService: IFileService,
        @IWorkspaceContextService private readonly contextService: IWorkspaceContextService
    ) {
        super();
    }

    public addChange(change: Omit<IFileChange, 'id' | 'status'>): IFileChange {
        const newChange: IFileChange = {
            ...change,
            id: `change-${++this._idCounter}`,
            status: 'pending'
        };

        this._changes.push(newChange);
        this._onChangesUpdated.fire(this._changes);

        return newChange;
    }

    public approveChange(changeId: string): void {
        const change = this._changes.find(c => c.id === changeId);
        if (change && change.status === 'pending') {
            change.status = 'approved';
            this._onChangesUpdated.fire(this._changes);
        }
    }

    public rejectChange(changeId: string): void {
        const change = this._changes.find(c => c.id === changeId);
        if (change && change.status === 'pending') {
            change.status = 'rejected';
            this._onChangesUpdated.fire(this._changes);
        }
    }

    public async applyChange(changeId: string): Promise<void> {
        const change = this._changes.find(c => c.id === changeId);
        if (!change || change.status === 'applied') {
            return;
        }

        const workspaceFolders = this.contextService.getWorkspace().folders;
        if (workspaceFolders.length === 0) {
            console.warn('No workspace folder to write changes to');
            return;
        }

        const rootUri = workspaceFolders[0].uri;
        const targetUri = URI.joinPath(rootUri, change.filePath);

        try {
            // Ensure content is written to disk
            await this.fileService.writeFile(targetUri, VSBuffer.fromString(change.newContent));

            change.status = 'applied';
            this._onChangeApplied.fire(change);
            this._onChangesUpdated.fire(this._changes);
        } catch (error) {
            console.error(`Failed to write file ${change.filePath}:`, error);
            // Optionally handle error state
        }
    }

    public async applyAllApproved(): Promise<void> {
        const approvedChanges = this._changes.filter(c => c.status === 'approved');

        for (const change of approvedChanges) {
            await this.applyChange(change.id);
        }

        this._onAllChangesApplied.fire();
    }

    public rejectAll(): void {
        for (const change of this._changes) {
            if (change.status === 'pending') {
                change.status = 'rejected';
            }
        }
        this._onChangesUpdated.fire(this._changes);
    }

    public getChanges(): IFileChange[] {
        return [...this._changes];
    }

    public getPendingChanges(): IFileChange[] {
        return this._changes.filter(c => c.status === 'pending');
    }

    public clearChanges(): void {
        this._changes = [];
        this._idCounter = 0;
        this._onChangesUpdated.fire(this._changes);
    }
}
