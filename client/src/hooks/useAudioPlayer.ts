import {useCallback, useEffect, useRef, useState} from 'react';
import api, {trackAction} from '../utils/api';
import storage from '../utils/storage';
import {BookmarkPositional} from '../interfaces/bookmarks';
import {ListeningHistoryEntry, ListeningHistoryReason} from '../interfaces/listeningHistory';

interface LocalPosition {
    position: number;
    updatedAt: string;
}

interface RemotePosition {
    position: number;
    updatedAt: string | null;
}

const MAX_HISTORY_ENTRIES = 50;
const REMOTE_JUMP_THRESHOLD_SECONDS = 30;
const REMOTE_CHECK_INTERVAL_MS = 60_000;
const positionStorageKey = (consumableId: string) => `pos:${consumableId}`;
const historyStorageKey = (consumableId: string) => `listening-history:${consumableId}`;

const parseStoredValue = <T,>(raw: unknown): T | null => {
    if (!raw) return null;
    try {
        return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
    } catch {
        return null;
    }
};

const parseTimestamp = (value: string | null | undefined) => {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const readLocalPosition = async (consumableId: string): Promise<LocalPosition | null> => {
    const parsed = parseStoredValue<LocalPosition>(await storage.get(positionStorageKey(consumableId)));
    return typeof parsed?.position === 'number' && typeof parsed?.updatedAt === 'string' ? parsed : null;
};

const writeLocalPosition = async (consumableId: string, position: number, updatedAt = new Date().toISOString()) => {
    try {
        await storage.set(positionStorageKey(consumableId), JSON.stringify({position, updatedAt} satisfies LocalPosition));
    } catch {
        // The local cache is best effort; Storytel sync is attempted separately.
    }
};

const readHistory = async (consumableId: string): Promise<ListeningHistoryEntry[]> => {
    try {
        const parsed = parseStoredValue<ListeningHistoryEntry[]>(await storage.get(historyStorageKey(consumableId)));
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(entry =>
            typeof entry?.id === 'string'
            && typeof entry?.fromPosition === 'number'
            && typeof entry?.toPosition === 'number'
            && typeof entry?.createdAt === 'string',
        ).slice(0, MAX_HISTORY_ENTRIES);
    } catch {
        return [];
    }
};

const writeHistory = async (consumableId: string, entries: ListeningHistoryEntry[]) => {
    try {
        await storage.set(historyStorageKey(consumableId), JSON.stringify(entries));
    } catch {
        // History should never prevent playback if local storage is unavailable.
    }
};

interface UseAudioPlayerProps {
    bookId: string | undefined;
    consumableId: string;
    playbackRate: number;
    onLoadError: (error: string) => void;
}

export const useAudioPlayer = ({bookId, consumableId, playbackRate, onLoadError}: UseAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const positionUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const loadedConsumableIdRef = useRef('');
    const streamRequestRef = useRef(0);
    const scrubStartRef = useRef<number | null>(null);
    const historyRef = useRef<ListeningHistoryEntry[]>([]);
    const historyBookRef = useRef('');
    const lastRemoteCheckRef = useRef(0);

    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1);
    const [history, setHistory] = useState<ListeningHistoryEntry[]>([]);
    const [externalSyncEntry, setExternalSyncEntry] = useState<ListeningHistoryEntry | null>(null);

    const hydrateHistory = useCallback(async (id: string) => {
        if (!id || historyBookRef.current === id) return;
        historyBookRef.current = id;
        historyRef.current = [];
        setHistory([]);
        setExternalSyncEntry(null);
        const stored = await readHistory(id);
        if (historyBookRef.current !== id) return;
        historyRef.current = stored;
        setHistory(stored);
    }, []);

    const recordJump = useCallback((
        fromPosition: number,
        toPosition: number,
        reason: ListeningHistoryReason,
        remoteUpdatedAt?: string,
    ): ListeningHistoryEntry | null => {
        const id = loadedConsumableIdRef.current || consumableId;
        const from = Math.max(0, Math.floor(fromPosition));
        const to = Math.max(0, Math.floor(toPosition));
        if (!id || Math.abs(from - to) < 2) return null;

        const latest = historyRef.current[0];
        if (latest
            && latest.reason === reason
            && Math.abs(latest.fromPosition - from) < 2
            && Math.abs(latest.toPosition - to) < 2) {
            return latest;
        }

        const entry: ListeningHistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fromPosition: from,
            toPosition: to,
            createdAt: new Date().toISOString(),
            reason,
            ...(remoteUpdatedAt ? {remoteUpdatedAt} : {}),
        };
        const next = [entry, ...historyRef.current].slice(0, MAX_HISTORY_ENTRIES);
        historyRef.current = next;
        setHistory(next);
        void writeHistory(id, next);
        if (reason === 'deviceSync') setExternalSyncEntry(entry);
        return entry;
    }, [consumableId]);

    const clearHistory = useCallback(async () => {
        const id = loadedConsumableIdRef.current || consumableId;
        historyRef.current = [];
        setHistory([]);
        setExternalSyncEntry(null);
        if (id) await storage.remove(historyStorageKey(id));
    }, [consumableId]);

    const loadAudioStream = useCallback(async () => {
        const requestId = ++streamRequestRef.current;
        try {
            setIsLoading(true);
            setAudioSrc(null);
            setCurrentTime(0);
            setDuration(0);
            const response = await api.post('/stream', {bookId, consumableId});
            if (requestId !== streamRequestRef.current) return;
            loadedConsumableIdRef.current = consumableId;
            await hydrateHistory(consumableId);
            setAudioSrc(response.data.streamUrl);
        } catch (err: any) {
            if (requestId === streamRequestRef.current) {
                onLoadError(err.response?.data?.error || 'Failed to load audio');
            }
        } finally {
            if (requestId === streamRequestRef.current) setIsLoading(false);
        }
    }, [bookId, consumableId, hydrateHistory, onLoadError]);

    const updatePosition = useCallback(async () => {
        const positionConsumableId = loadedConsumableIdRef.current || consumableId;
        if (!audioRef.current || !positionConsumableId) return;

        const position = Math.floor(audioRef.current.currentTime * 1000);
        await writeLocalPosition(positionConsumableId, position);

        try {
            await api.put(`/bookmark-positional/${positionConsumableId}`, {position});
        } catch (error) {
            console.warn('Failed to sync position to API, kept locally', error);
        }
    }, [consumableId]);

    const fetchRemotePosition = useCallback(async (): Promise<RemotePosition | null> => {
        if (!consumableId) return null;
        try {
            const response = await api.get<BookmarkPositional[]>(`/bookmark-positional/${consumableId}`);
            const entry = response.data?.find(format => format.type === 'abook');
            lastRemoteCheckRef.current = Date.now();
            return entry ? {position: entry.position || 0, updatedAt: entry.updatedTime || null} : null;
        } catch (error) {
            lastRemoteCheckRef.current = Date.now();
            console.warn('Failed to fetch remote position, will use local cache if available', error);
            return null;
        }
    }, [consumableId]);

    const adoptPosition = useCallback((positionInMilliseconds: number) => {
        if (!audioRef.current) return;
        const positionInSeconds = Math.max(0, Math.floor(positionInMilliseconds / 1000));
        audioRef.current.currentTime = positionInSeconds;
        setCurrentTime(positionInSeconds);
    }, []);

    const goToInitialPosition = useCallback(async () => {
        await hydrateHistory(consumableId);
        const [remote, local] = await Promise.all([
            fetchRemotePosition(),
            readLocalPosition(consumableId),
        ]);

        let chosenPosition = 0;
        if (remote && local) {
            const remoteTime = parseTimestamp(remote.updatedAt);
            const localTime = parseTimestamp(local.updatedAt);
            const remoteIsNewer = remoteTime >= localTime;
            chosenPosition = remoteIsNewer ? remote.position : local.position;
            if (remoteIsNewer && Math.abs(remote.position - local.position) >= REMOTE_JUMP_THRESHOLD_SECONDS * 1000) {
                recordJump(local.position / 1000, remote.position / 1000, 'deviceSync', remote.updatedAt || undefined);
                await writeLocalPosition(consumableId, remote.position, remote.updatedAt || undefined);
            }
        } else if (remote) {
            chosenPosition = remote.position;
            await writeLocalPosition(consumableId, remote.position, remote.updatedAt || undefined);
        } else if (local) {
            chosenPosition = local.position;
        }

        adoptPosition(chosenPosition);
        try {
            await audioRef.current?.play();
        } catch {
            // Browser autoplay rules can require the user to press play.
        }
    }, [adoptPosition, consumableId, fetchRemotePosition, hydrateHistory, recordJump]);

    const refreshFromRemote = useCallback(async (force = false): Promise<boolean> => {
        if (!audioRef.current || !consumableId || audioRef.current.readyState < 1 || isPlaying) return false;
        if (!force && Date.now() - lastRemoteCheckRef.current < REMOTE_CHECK_INTERVAL_MS) return false;

        const [remote, local] = await Promise.all([
            fetchRemotePosition(),
            readLocalPosition(consumableId),
        ]);
        if (!remote?.updatedAt) return false;

        const remoteTime = parseTimestamp(remote.updatedAt);
        const localTime = parseTimestamp(local?.updatedAt);
        const currentPosition = audioRef.current.currentTime;
        if (remoteTime <= localTime || Math.abs(remote.position / 1000 - currentPosition) < REMOTE_JUMP_THRESHOLD_SECONDS) return false;

        recordJump(currentPosition, remote.position / 1000, 'deviceSync', remote.updatedAt);
        adoptPosition(remote.position);
        await writeLocalPosition(consumableId, remote.position, remote.updatedAt);
        return true;
    }, [adoptPosition, consumableId, fetchRemotePosition, isPlaying, recordJump]);

    const handlePlayPause = useCallback(async () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            await refreshFromRemote();
            await audioRef.current.play();
        }
    }, [isPlaying, refreshFromRemote]);

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = async () => {
        if (!audioRef.current) return;
        setDuration(audioRef.current.duration);
        await goToInitialPosition();
    };

    const setAudioPosition = useCallback((seekTime: number) => {
        if (!audioRef.current) return;
        const boundedTime = Math.max(0, Math.min(seekTime, audioRef.current.duration || seekTime));
        audioRef.current.currentTime = boundedTime;
        setCurrentTime(boundedTime);
    }, []);

    const handleSeek = useCallback((seekTime: number, reason: ListeningHistoryReason = 'seek') => {
        if (!audioRef.current) return;
        const previousPosition = audioRef.current.currentTime;
        setAudioPosition(seekTime);
        if (scrubStartRef.current === null) {
            recordJump(previousPosition, seekTime, reason);
            void updatePosition();
        }
    }, [recordJump, setAudioPosition, updatePosition]);

    const handleSeekStart = useCallback(() => {
        if (audioRef.current && scrubStartRef.current === null) scrubStartRef.current = audioRef.current.currentTime;
    }, []);

    const handleSeekEnd = useCallback(() => {
        if (!audioRef.current || scrubStartRef.current === null) return;
        recordJump(scrubStartRef.current, audioRef.current.currentTime, 'seek');
        scrubStartRef.current = null;
        void updatePosition();
    }, [recordJump, updatePosition]);

    const restoreHistoryEntry = useCallback((entry: ListeningHistoryEntry) => {
        handleSeek(entry.fromPosition, 'history');
        if (externalSyncEntry?.id === entry.id) setExternalSyncEntry(null);
    }, [externalSyncEntry?.id, handleSeek]);

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) audioRef.current.volume = newVolume;
        if (newVolume > 0) setIsMuted(false);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        if (isMuted) {
            audioRef.current.volume = previousVolume;
            setVolume(previousVolume);
            setIsMuted(false);
        } else {
            setPreviousVolume(volume);
            audioRef.current.volume = 0;
            setVolume(0);
            setIsMuted(true);
        }
    };

    const skipForward = useCallback(() => {
        if (!audioRef.current) return;
        const from = audioRef.current.currentTime;
        const to = Math.min(from + 15, duration);
        recordJump(from, to, 'skipForward');
        setAudioPosition(to);
        void updatePosition();
        trackAction('skip_forward', {bookId, consumableId, seconds: 15});
    }, [bookId, consumableId, duration, recordJump, setAudioPosition, updatePosition]);

    const skipBackward = useCallback(() => {
        if (!audioRef.current) return;
        const from = audioRef.current.currentTime;
        const to = Math.max(from - 15, 0);
        recordJump(from, to, 'skipBackward');
        setAudioPosition(to);
        void updatePosition();
        trackAction('skip_backward', {bookId, consumableId, seconds: 15});
    }, [bookId, consumableId, recordJump, setAudioPosition, updatePosition]);

    const handlePlay = () => {
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        if (positionUpdateIntervalRef.current) clearInterval(positionUpdateIntervalRef.current);
        positionUpdateIntervalRef.current = setInterval(updatePosition, 30_000);
        trackAction('play', {bookId, consumableId});
    };

    const handlePause = () => {
        setIsPlaying(false);
        void updatePosition();
        if (positionUpdateIntervalRef.current) {
            clearInterval(positionUpdateIntervalRef.current);
            positionUpdateIntervalRef.current = null;
        }
        trackAction('pause', {bookId, consumableId});
    };

    const handleRateChange = () => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    };

    useEffect(() => {
        if (bookId) {
            audioRef.current?.pause();
            void loadAudioStream();
        }
    }, [bookId, loadAudioStream]);

    useEffect(() => () => {
        if (positionUpdateIntervalRef.current) clearInterval(positionUpdateIntervalRef.current);
    }, []);

    return {
        audioRef,
        audioSrc,
        isLoading,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        history,
        externalSyncEntry,
        handlePlayPause,
        handleTimeUpdate,
        handleLoadedMetadata,
        handleSeek,
        handleSeekStart,
        handleSeekEnd,
        handleVolumeChange,
        toggleMute,
        skipForward,
        skipBackward,
        handlePlay,
        handlePause,
        handleRateChange,
        restoreHistoryEntry,
        clearHistory,
        refreshFromRemote,
        dismissExternalSync: () => setExternalSyncEntry(null),
    };
};
