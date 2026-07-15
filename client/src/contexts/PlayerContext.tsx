import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {BookShelfEntity} from '../interfaces/books';
import {useAudioPlayer} from '../hooks/useAudioPlayer';
import {useLiveTranscription} from '../hooks/useLiveTranscription';
import storage from '../utils/storage';
import TranscriptionPanel from '../components/TranscriptionPanel';

interface PlayerContextValue {
    activeBook: BookShelfEntity | null;
    activeBookId: string | null;
    playbackRate: number;
    isExpanded: boolean;
    setPlaybackRate: (rate: number) => void;
    openExpandedPlayer: () => void;
    closeExpandedPlayer: () => void;
    openTranscription: () => void;
    playerError: string;
    clearPlayerError: () => void;
    startPlayback: (book: BookShelfEntity, bookId: string) => void;
    audio: ReturnType<typeof useAudioPlayer>;
    transcription: ReturnType<typeof useLiveTranscription>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({children, enabled = true}: {children: React.ReactNode; enabled?: boolean}) {
    const [activeBook, setActiveBook] = useState<BookShelfEntity | null>(null);
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [playbackRate, setPlaybackRateState] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTranscription, setShowTranscription] = useState(false);
    const [playerError, setPlayerError] = useState('');
    const transcriptionAudioRef = useRef<HTMLAudioElement>(null);
    const handleLoadError = useCallback((message: string) => setPlayerError(message), []);
    const openExpandedPlayer = useCallback(() => setIsExpanded(true), []);
    const closeExpandedPlayer = useCallback(() => setIsExpanded(false), []);

    const audio = useAudioPlayer({
        bookId: activeBookId || undefined,
        consumableId: activeBook?.book?.consumableId || '',
        playbackRate,
        onLoadError: handleLoadError,
    });
    const transcription = useLiveTranscription({
        audioRef: transcriptionAudioRef,
        bookId: activeBookId,
        language: activeBook?.book?.language?.isoValue || undefined,
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
        setShowTranscription(false);
        transcription.stop();
        window.trayControls?.updatePlayingState?.(false, null);
    }, [enabled, audio.audioRef, transcription.stop]);

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

    useEffect(() => {
        const player = audio.audioRef.current;
        const transcriptionPlayer = transcriptionAudioRef.current;
        if (!player || !transcriptionPlayer || !transcription.isEnabled || !audio.audioSrc) return;

        const syncPosition = () => {
            if (!Number.isFinite(player.currentTime) || Math.abs(transcriptionPlayer.currentTime - player.currentTime) < 0.75) return;
            transcriptionPlayer.currentTime = player.currentTime;
        };
        const syncRate = () => {
            transcriptionPlayer.playbackRate = player.playbackRate;
        };
        const startSynchronizedPlayback = async () => {
            syncPosition();
            syncRate();
            if (player.paused) return;
            try {
                await transcriptionPlayer.play();
            } catch (error) {
                console.warn('Unable to start the synchronized transcription stream', error);
            }
        };
        const pauseSynchronizedPlayback = () => transcriptionPlayer.pause();
        const handleLoadedMetadata = () => void startSynchronizedPlayback();

        player.addEventListener('play', startSynchronizedPlayback);
        player.addEventListener('pause', pauseSynchronizedPlayback);
        player.addEventListener('seeking', syncPosition);
        player.addEventListener('ratechange', syncRate);
        transcriptionPlayer.addEventListener('loadedmetadata', handleLoadedMetadata);
        const driftTimer = window.setInterval(syncPosition, 2_000);
        void startSynchronizedPlayback();

        return () => {
            window.clearInterval(driftTimer);
            player.removeEventListener('play', startSynchronizedPlayback);
            player.removeEventListener('pause', pauseSynchronizedPlayback);
            player.removeEventListener('seeking', syncPosition);
            player.removeEventListener('ratechange', syncRate);
            transcriptionPlayer.removeEventListener('loadedmetadata', handleLoadedMetadata);
            transcriptionPlayer.pause();
        };
    }, [audio.audioRef, audio.audioSrc, transcription.isEnabled]);

    const value = useMemo<PlayerContextValue>(() => ({
        activeBook,
        activeBookId,
        playbackRate,
        isExpanded,
        setPlaybackRate,
        openExpandedPlayer,
        closeExpandedPlayer,
        openTranscription: () => setShowTranscription(true),
        playerError,
        clearPlayerError: () => setPlayerError(''),
        startPlayback,
        audio,
        transcription,
    }), [activeBook, activeBookId, playbackRate, isExpanded, setPlaybackRate, openExpandedPlayer, closeExpandedPlayer, playerError, startPlayback, audio, transcription]);

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
            <audio
                ref={transcriptionAudioRef}
                src={transcription.isEnabled && audio.audioSrc ? audio.audioSrc : undefined}
                crossOrigin={audio.audioSrc?.startsWith('file:') ? undefined : 'anonymous'}
                muted
                preload="auto"
                onError={transcription.reportSourceError}
                className="hidden"
            />
            <TranscriptionPanel
                isOpen={showTranscription}
                status={transcription.status}
                progress={transcription.progress}
                segments={transcription.segments}
                isEnabled={transcription.isEnabled}
                currentTime={audio.currentTime}
                onStart={transcription.start}
                onStop={transcription.stop}
                onClear={transcription.clear}
                onSeek={time => audio.handleSeek(time, 'seek')}
                onClose={() => setShowTranscription(false)}
            />
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) throw new Error('usePlayer must be used within PlayerProvider');
    return context;
}
