import React, {useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {usePlayer} from '../contexts/PlayerContext';
import {buildCoverUrl, formatTime} from '../utils/helpers';
import ListeningHistoryMarkers from './ListeningHistoryMarkers';
import ListeningHistoryModal from './ListeningHistoryModal';
import ExternalProgressNotice from './ExternalProgressNotice';
import PlaybackSpeedModal from './PlaybackSpeedModal';
import PlayerMoreMenu from './PlayerMoreMenu';

function CompactPlayer() {
    const {t} = useTranslation();
    const location = useLocation();
    const {
        activeBook,
        activeBookId,
        playbackRate,
        setPlaybackRate,
        openExpandedPlayer,
        openTranscription,
        transcription,
        audio,
    } = usePlayer();
    const [showHistory, setShowHistory] = useState(false);
    const [showPlaybackSpeed, setShowPlaybackSpeed] = useState(false);

    if (!activeBook || !activeBookId || location.pathname.startsWith('/player/')) return null;

    const currentTime = audio.currentTime / playbackRate;
    const duration = audio.duration / playbackRate;
    const progress = audio.duration > 0 ? Math.min((audio.currentTime / audio.duration) * 100, 100) : 0;

    return (
        <>
        <aside
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#15171c]/95 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            aria-label={t('player.nowPlaying')}
        >
            <input
                type="range"
                min={0}
                max={audio.duration || 0}
                step={1}
                value={Math.min(audio.currentTime, audio.duration || 0)}
                onChange={event => audio.handleSeek(Number(event.target.value))}
                onPointerDown={audio.handleSeekStart}
                onPointerUp={audio.handleSeekEnd}
                onPointerCancel={audio.handleSeekEnd}
                onKeyDown={audio.handleSeekStart}
                onKeyUp={audio.handleSeekEnd}
                onBlur={audio.handleSeekEnd}
                disabled={!audio.duration}
                aria-label={t('gotoModal.title')}
                className="compact-player-progress absolute inset-x-0 top-0 z-10 h-2 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default"
                style={{background: `linear-gradient(to right, #f97316 0%, #fbbf24 ${progress}%, rgba(255,255,255,0.12) ${progress}%, rgba(255,255,255,0.12) 100%)`}}
            />
            <ListeningHistoryMarkers duration={audio.duration} entries={audio.history} compact/>

            <div className="mx-auto grid h-[5.5rem] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-10">
                <button
                    type="button"
                    onClick={openExpandedPlayer}
                    className="flex min-w-0 items-center gap-3 text-left sm:gap-4"
                >
                    <img
                        src={buildCoverUrl(activeBook.book.smallCover || activeBook.book.largeCover)}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover shadow-lg"
                    />
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{activeBook.book.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-white/45">{activeBook.book.authorsAsString}</span>
                    </span>
                </button>

                <div data-testid="compact-playback-controls" className="flex shrink-0 items-center justify-center gap-1 sm:gap-2">
                    <button type="button" onClick={audio.skipBackward} aria-label={t('player.skipBackward')} className="hidden h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v6h6M5.5 15a7 7 0 1 0 .4-6.7M12 9v4l2.5 1.5"/></svg>
                    </button>
                    <button
                        type="button"
                        onClick={audio.handlePlayPause}
                        disabled={audio.isLoading}
                        aria-label={t(audio.isPlaying ? 'tray.pause' : 'tray.play')}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)] transition hover:scale-105 hover:bg-orange-400 disabled:cursor-wait disabled:bg-white/15"
                    >
                        {audio.isLoading ? (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                        ) : audio.isPlaying ? (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
                        ) : (
                            <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </button>
                    <button type="button" onClick={audio.skipForward} aria-label={t('player.skipForward')} className="hidden h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 4v6h-6m4.5 5a7 7 0 1 1-.4-6.7M12 9v4l2.5 1.5"/></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPlaybackSpeed(true)}
                        aria-label={t('player.speed')}
                        title={t('player.speed')}
                        className="flex h-10 min-w-[3rem] items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-2 text-xs font-bold tabular-nums text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
                    >
                        {playbackRate}x
                    </button>
                    <button data-testid="open-full-player-mobile" type="button" onClick={openExpandedPlayer} aria-label={t('player.openFullPlayer')} title={t('player.openFullPlayer')} className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-white/60 transition hover:bg-white/10 hover:text-white md:hidden">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></svg>
                    </button>
                    <div className="md:hidden">
                        <PlayerMoreMenu historyCount={audio.history.length} isTranscribing={transcription.isEnabled} onShowHistory={() => setShowHistory(true)} onShowTranscription={openTranscription}/>
                    </div>
                </div>

                <div className="hidden min-w-0 items-center justify-end gap-3 md:flex">
                    <button
                        type="button"
                        onClick={() => setShowPlaybackSpeed(true)}
                        aria-label={t('player.speed')}
                        title={t('player.speed')}
                        className="flex h-10 min-w-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-2.5 text-xs font-bold tabular-nums text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                        {playbackRate}x
                    </button>
                    <div className="hidden items-center gap-1.5 xl:flex">
                        <span className="text-xs tabular-nums text-white/45">{formatTime(currentTime)}</span>
                        <span className="text-xs text-white/20">/</span>
                        <span className="text-xs tabular-nums text-white/45">{formatTime(duration)}</span>
                    </div>
                    <div data-testid="compact-volume" className="hidden items-center gap-1 lg:flex">
                        <button type="button" onClick={audio.toggleMute} aria-label={t('player.volume')} className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white">
                            {audio.isMuted || audio.volume === 0 ? (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5 6.5 9H3v6h3.5l4.5 4V5Zm4 5 5 5m0-5-5 5"/></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5 6.5 9H3v6h3.5l4.5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12"/></svg>
                            )}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={audio.isMuted ? 0 : audio.volume}
                            onChange={event => audio.handleVolumeChange(Number(event.target.value))}
                            aria-label={t('player.volume')}
                            className="slider w-20 xl:w-24"
                        />
                    </div>
                    <PlayerMoreMenu historyCount={audio.history.length} isTranscribing={transcription.isEnabled} onShowHistory={() => setShowHistory(true)} onShowTranscription={openTranscription}/>
                    <button data-testid="open-full-player" type="button" onClick={openExpandedPlayer} aria-label={t('player.openFullPlayer')} title={t('player.openFullPlayer')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-white/60 transition hover:bg-white/10 hover:text-white">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></svg>
                    </button>
                </div>
            </div>
        </aside>
        <ExternalProgressNotice
            entry={audio.externalSyncEntry}
            onRestore={() => audio.externalSyncEntry && audio.restoreHistoryEntry(audio.externalSyncEntry)}
            onDismiss={audio.dismissExternalSync}
            className="fixed bottom-28 right-5 z-40 w-[min(30rem,calc(100vw-2.5rem))]"
        />
        <ListeningHistoryModal
            isOpen={showHistory}
            entries={audio.history}
            onClose={() => setShowHistory(false)}
            onRestore={entry => {
                audio.restoreHistoryEntry(entry);
                setShowHistory(false);
            }}
            onClear={audio.clearHistory}
        />
        <PlaybackSpeedModal
            isOpen={showPlaybackSpeed}
            playbackRate={playbackRate}
            onClose={() => setShowPlaybackSpeed(false)}
            onRateChange={setPlaybackRate}
        />
        </>
    );
}

export default CompactPlayer;
