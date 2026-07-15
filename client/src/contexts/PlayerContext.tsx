import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {BookShelfEntity} from '../interfaces/books';
import {useAudioPlayer} from '../hooks/useAudioPlayer';
import storage from '../utils/storage';

interface PlayerContextValue {
    activeBook: BookShelfEntity | null;
    activeBookId: string | null;
    playbackRate: number;
    isExpanded: boolean;
    setPlaybackRate: (rate: number) => void;
    openExpandedPlayer: () => void;
    closeExpandedPlayer: () => void;
    playerError: string;
    clearPlayerError: () => void;
    startPlayback: (book: BookShelfEntity, bookId: string) => void;
    audio: ReturnType<typeof useAudioPlayer>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({children, enabled = true}: {children: React.ReactNode; enabled?: boolean}) {
    const [activeBook, setActiveBook] = useState<BookShelfEntity | null>(null);
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [playbackRate, setPlaybackRateState] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);
    const [playerError, setPlayerError] = useState('');
    const handleLoadError = useCallback((message: string) => setPlayerError(message), []);
    const openExpandedPlayer = useCallback(() => setIsExpanded(true), []);
    const closeExpandedPlayer = useCallback(() => setIsExpanded(false), []);

    const audio = useAudioPlayer({
        bookId: activeBookId || undefined,
        consumableId: activeBook?.book?.consumableId || '',
        playbackRate,
        onLoadError: handleLoadError,
    });
    const playPauseRef = useRef(audio.handlePlayPause);
    const setSpeedRef = useRef<(speed: number) => void>(() => undefined);
    playPauseRef.current = audio.handlePlayPause;

    const startPlayback = useCallback((book: BookShelfEntity, bookId: string) => {
        setPlayerError('');
        if (activeBookId === bookId) {
            if (!audio.isPlaying) audio.audioRef.current?.play();
            return;
        }
        audio.audioRef.current?.pause();
        setActiveBook(book);
        setActiveBookId(bookId);
    }, [activeBookId, audio.audioRef, audio.isPlaying]);

    const setPlaybackRate = useCallback((rate: number) => {
        setPlaybackRateState(rate);
        if (audio.audioRef.current) audio.audioRef.current.playbackRate = rate;
        void storage.set('playbackRate', String(rate));
    }, [audio.audioRef]);
    setSpeedRef.current = setPlaybackRate;

    useEffect(() => {
        void storage.get('playbackRate').then(saved => {
            const rate = Number(saved);
            if (Number.isFinite(rate) && rate >= 0.5 && rate <= 2) setPlaybackRateState(rate);
        });
    }, []);

    useEffect(() => {
        if (enabled) return;
        audio.audioRef.current?.pause();
        setActiveBook(null);
        setActiveBookId(null);
        setIsExpanded(false);
        window.trayControls?.updatePlayingState?.(false, null);
    }, [enabled, audio.audioRef]);

    useEffect(() => {
        if (!activeBook || !window.trayControls?.updatePlayingState) return;
        window.trayControls.updatePlayingState(audio.isPlaying, activeBook.book.name);
    }, [activeBook, audio.isPlaying]);

    useEffect(() => {
        if (!window.trayControls) return;
        const removePlayPause = window.trayControls.onPlayPause?.(() => playPauseRef.current());
        const removeSetSpeed = window.trayControls.onSetSpeed?.((_event: unknown, speed: number) => setSpeedRef.current(speed));
        return () => {
            removePlayPause?.();
            removeSetSpeed?.();
        };
    }, []);

    useEffect(() => {
        const handleKeyboardPlayback = (event: KeyboardEvent) => {
            if (!activeBook || event.target !== document.body) return;
            if (event.code === 'Space') {
                event.preventDefault();
                audio.handlePlayPause();
            } else if (event.code === 'ArrowLeft') {
                event.preventDefault();
                audio.skipBackward();
            } else if (event.code === 'ArrowRight') {
                event.preventDefault();
                audio.skipForward();
            }
        };
        document.addEventListener('keydown', handleKeyboardPlayback);
        return () => document.removeEventListener('keydown', handleKeyboardPlayback);
    }, [activeBook, audio.handlePlayPause, audio.skipBackward, audio.skipForward]);

    useEffect(() => {
        if (!activeBook) return;
        const checkForOtherDeviceProgress = () => {
            if (document.visibilityState === 'hidden') return;
            if (!audio.isPlaying) void audio.refreshFromRemote();
        };
        window.addEventListener('focus', checkForOtherDeviceProgress);
        document.addEventListener('visibilitychange', checkForOtherDeviceProgress);
        return () => {
            window.removeEventListener('focus', checkForOtherDeviceProgress);
            document.removeEventListener('visibilitychange', checkForOtherDeviceProgress);
        };
    }, [activeBook, audio.isPlaying, audio.refreshFromRemote]);

    const value = useMemo<PlayerContextValue>(() => ({
        activeBook,
        activeBookId,
        playbackRate,
        isExpanded,
        setPlaybackRate,
        openExpandedPlayer,
        closeExpandedPlayer,
        playerError,
        clearPlayerError: () => setPlayerError(''),
        startPlayback,
        audio,
    }), [activeBook, activeBookId, playbackRate, isExpanded, setPlaybackRate, openExpandedPlayer, closeExpandedPlayer, playerError, startPlayback, audio]);

    return (
        <PlayerContext.Provider value={value}>
            {children}
            <audio
                ref={audio.audioRef}
                src={audio.audioSrc || undefined}
                onTimeUpdate={audio.handleTimeUpdate}
                onLoadedMetadata={audio.handleLoadedMetadata}
                onPlay={audio.handlePlay}
                onPause={audio.handlePause}
                onRateChange={audio.handleRateChange}
                className="hidden"
            />
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) throw new Error('usePlayer must be used within PlayerProvider');
    return context;
}
