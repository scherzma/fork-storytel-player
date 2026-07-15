import React from 'react';
import {formatTime} from '../utils/helpers';
import {t} from "i18next";
import {ListeningHistoryEntry} from '../interfaces/listeningHistory';
import ListeningHistoryMarkers from './ListeningHistoryMarkers';

interface PlayerControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    history: ListeningHistoryEntry[];
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
    onShowGotoModal: () => void;
    onShowPlaybackSpeedModal: () => void;
    onShowHistory: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    history,
    onPlayPause,
    onSeek,
    onSeekStart,
    onSeekEnd,
    onVolumeChange,
    onToggleMute,
    onSkipForward,
    onSkipBackward,
    onShowGotoModal,
    onShowPlaybackSpeedModal,
    onShowHistory,
}) => {
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(parseFloat(e.target.value));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onVolumeChange(parseFloat(e.target.value));
    };

    const progress = (currentTime / (duration || 1)) * 100;
    const pillButton =
        'flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400';

    return (
        <div className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-8">
            {/* Progress Bar */}
            <div className="relative mb-5">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekChange}
                    onPointerDown={onSeekStart}
                    onPointerUp={onSeekEnd}
                    onPointerCancel={onSeekEnd}
                    onKeyDown={onSeekStart}
                    onKeyUp={onSeekEnd}
                    onBlur={onSeekEnd}
                    aria-label={t('gotoModal.title')}
                    className="slider h-1.5 w-full cursor-pointer appearance-none rounded-full"
                    style={{
                        background: `linear-gradient(to right, #f97316 0%, #fbbf24 ${progress}%, rgba(255,255,255,0.12) ${progress}%, rgba(255,255,255,0.12) 100%)`
                    }}
                />
                <ListeningHistoryMarkers duration={duration} entries={history}/>
                <div className="mt-2 flex items-center justify-between text-xs font-medium tabular-nums text-white/45">
                    <span>{formatTime(currentTime / playbackRate)}</span>
                    <span>{formatTime(duration / playbackRate)}</span>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex w-full items-center justify-between gap-3">
                {/* Left side - Playback speed + goto */}
                <div className="flex flex-1 items-center justify-start gap-2">
                    <button onClick={onShowPlaybackSpeedModal} className={pillButton} title={t('player.speed')}>
                        {playbackRate}x
                    </button>
                    <button onClick={onShowGotoModal} className={`${pillButton} hidden sm:flex`}>
                        {t('gotoModal.go')}
                    </button>
                    <button onClick={onShowHistory} className={`${pillButton} relative`} title={t('listeningHistory.open')}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/></svg>
                        <span className="hidden sm:inline">{t('listeningHistory.shortTitle')}</span>
                        {history.length > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-300"/>}
                    </button>
                </div>

                {/* Center controls */}
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={onSkipBackward}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8L12.066 11.2zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8L4.066 11.2z"/>
                        </svg>
                    </button>

                    <button
                        onClick={onPlayPause}
                        aria-label={t(isPlaying ? 'tray.pause' : 'tray.play')}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition hover:scale-105 hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/30"
                    >
                        {isPlaying ? (
                            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        ) : (
                            <svg className="ml-0.5 h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={onSkipForward}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                        </svg>
                    </button>
                </div>

                {/* Right side - Volume */}
                <div className="flex flex-1 items-center justify-end">
                    <div className="group relative">
                        <button
                            onClick={onToggleMute}
                            aria-label={t('player.volume')}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                            {isMuted || volume === 0 ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                            )}
                        </button>
                        {/* Vertical volume slider on hover */}
                        <div
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                            <div className="rounded-xl border border-white/10 bg-[#1d2026] p-2.5 shadow-2xl">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    aria-label={t('player.volume')}
                                    className="h-24 w-2 cursor-pointer appearance-none rounded-lg bg-white/15"
                                    style={{
                                        WebkitAppearance: 'slider-vertical'
                                    } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerControls;
