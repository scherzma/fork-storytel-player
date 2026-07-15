export type ListeningHistoryReason =
    | 'seek'
    | 'skipForward'
    | 'skipBackward'
    | 'goto'
    | 'chapter'
    | 'bookmark'
    | 'history'
    | 'deviceSync';

export interface ListeningHistoryEntry {
    id: string;
    fromPosition: number;
    toPosition: number;
    createdAt: string;
    reason: ListeningHistoryReason;
    remoteUpdatedAt?: string;
}
