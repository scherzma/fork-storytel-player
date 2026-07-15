export type TranscriptionStatus =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'listening'
    | 'processing'
    | 'unsupported'
    | 'error';

export interface TranscriptSegment {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

export interface TranscriptionWorkerMessage {
    status: 'loading' | 'progress' | 'ready' | 'start' | 'complete' | 'error';
    message?: string;
    progress?: number;
    output?: string;
}
