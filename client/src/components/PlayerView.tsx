import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import Navbar from './Navbar';
import BookmarkModals from "./BookmarkModals";
import PlaybackSpeedModal from "./PlaybackSpeedModal";
import GotoModal from "./GotoModal";
import ChaptersModal from "./ChaptersModal";
import PlayerControls from "./PlayerControls";
import BookInfo from "./BookInfo";
import DownloadCancelModal from "./DownloadCancelModal";
import {BookShelfEntity} from "../interfaces/books";
import {useBookmarks} from "../hooks/useBookmarks";
import {useChapters} from "../hooks/useChapters";
import {useGotoModal} from "../hooks/useGotoModal";
import {truncateTitle} from '../utils/helpers';
import "../types/window.d.ts";
import api, { trackAction } from "../utils/api";
import {usePlayer} from '../contexts/PlayerContext';
import {buildCatalogSearchPath, CatalogSearchSource} from '../utils/catalogSearch';
import ListeningHistoryModal from './ListeningHistoryModal';
import ExternalProgressNotice from './ExternalProgressNotice';
import InlineReadAlong from './InlineReadAlong';

interface PlayerViewProps {
    isOverlay?: boolean;
    onClose?: () => void;
}

function PlayerView({isOverlay = false, onClose}: PlayerViewProps) {
    const {t} = useTranslation();
    const {bookId: routeBookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const routeBook: BookShelfEntity | undefined = location.state?.book;
    const returnTo: string = location.state?.returnTo || '/';

    const {
        activeBook,
        activeBookId,
        startPlayback,
        playbackRate,
        setPlaybackRate,
        transcription,
        playerError,
        audio: audioPlayer,
    } = usePlayer();
    const bookId = routeBookId || activeBookId || undefined;
    const book = activeBookId === bookId ? activeBook : routeBook;

    const [error, setError] = useState('');
    const [isLoadingBookData, setIsLoadingBookData] = useState(true);
    const [showPlaybackSpeedModal, setShowPlaybackSpeedModal] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showDownloadCancelModal, setShowDownloadCancelModal] = useState(false);
    const [showListeningHistory, setShowListeningHistory] = useState(false);
    const [showReadAlong, setShowReadAlong] = useState(false);

    const toggleReadAlong = () => {
        const nextValue = !showReadAlong;
        setShowReadAlong(nextValue);
        if (nextValue && !transcription.isEnabled) transcription.start();
    };

    const closePlayer = () => {
        if (onClose) {
            onClose();
            return;
        }
        navigate(returnTo, {
            state: routeBook && returnTo.startsWith('/book/') ? {book: routeBook, returnTo: '/'} : undefined,
        });
    };

    const searchCatalog = (query: string, source: CatalogSearchSource) => {
        if (!query.trim()) return;
        onClose?.();
        navigate(buildCatalogSearchPath(query, source));
    };

    useEffect(() => {
        if (!isOverlay) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOverlay]);

    useEffect(() => {
        if (routeBook && bookId && activeBookId !== bookId) startPlayback(routeBook, bookId);
    }, [routeBook, bookId, activeBookId, startPlayback]);

    // Bookmarks hook
    const bookmarks = useBookmarks({
        consumableId: book?.book?.consumableId || '',
        onError: setError,
    });

    // Chapters hook
    const chapters = useChapters({
        consumableId: book?.book?.consumableId || '',
        currentTime: audioPlayer.currentTime,
        onError: setError,
    });

    // Goto modal hook
    const gotoModal = useGotoModal({
        onSeek: time => audioPlayer.handleSeek(time, 'goto'),
        duration: audioPlayer.duration,
        playbackRate,
        currentTime: audioPlayer.currentTime,
    });

    // Load book data (chapters and bookmarks)
    useEffect(() => {
        const loadBookData = async () => {
            if (book) {
                setIsLoadingBookData(true);
                try {
                    await Promise.all([
                        chapters.loadChapters(),
                        bookmarks.loadBookmarks(),
                    ]);
                } finally {
                    setIsLoadingBookData(false);
                }
                document.title = truncateTitle(book.book.name);
            }
        };

        void loadBookData();

        return () => {
            document.title = 'Storytel Player';
        };
    }, [book]);

    // Check download status on mount
    useEffect(() => {
        const checkDownloadStatus = async () => {
            if (bookId) {
                try {
                    const {data: statusData} = await api.get(`/download-status/${bookId}`);
                    setIsDownloaded(statusData.downloaded);
                } catch (error) {
                    console.error('Failed to check download status', error);
                }
            }
        };

        void checkDownloadStatus();
    }, [bookId]);

    // Handle download button click
    const handleDownloadClick = async () => {
        if (isDownloading || isDownloaded) {
            // Show confirmation modal for cancel or delete
            setShowDownloadCancelModal(true);
        } else {
            // Start download directly
            await handleDownload();
        }
    };

    // Handle download
    const handleDownload = async () => {
        if (!bookId || isDownloading) return;

        const isElectron = !!window.electronStore
        setIsDownloading(true);
        try {
            trackAction('User initiated download', { bookId: book?.id, bookName: book?.book?.name || "Unknown" });

            const response = await api.post('/download', {
                bookId,
                book,
            });

            if (response && (response as any).data?.success) {
                setIsDownloaded(true);
            } else {
                if ((response as any)?.data?.error !== 'Download cancelled') {
                    setError((response as any)?.data?.error || 'Download failed');
                }
            }
        } catch (error: any) {
            const errorMsg = error?.data?.error || error?.response?.data?.error;
            if (errorMsg !== 'Download cancelled' && errorMsg !== 'canceled') {
                setError(errorMsg || error.message || 'Download failed');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle cancel download or delete file
    const handleCancelOrDelete = async () => {
        if (!bookId) return;

        try {
            setShowDownloadCancelModal(false);

            if (isDownloading) {
                trackAction('User cancelled download', { bookId });
                await api.delete(`/download/${bookId}`);
                setIsDownloading(false);
            } else if (isDownloaded) {
                trackAction('User deleted downloaded book', { bookId });
                await api.delete(`/downloaded-file/${bookId}`);
                setIsDownloaded(false);
            }
        } catch (error: any) {
            setError(error.response?.data?.error || error.message || 'Operation failed');
            setShowDownloadCancelModal(false);
        }
    };

    // Playback rate change handler
    const handlePlaybackRateChange = (newRate: number) => {
        setPlaybackRate(newRate);
        setShowPlaybackSpeedModal(false);
    };


    if (audioPlayer.isLoading || isLoadingBookData) {
        const loadingState = <LoadingState message={audioPlayer.isLoading ? t('player.loadingAudio') : t('player.loadingBookData')}/>;
        return isOverlay ? <div className="fixed inset-0 z-50 overflow-y-auto">{loadingState}</div> : loadingState;
    }

    if (error || playerError || !book) {
        const errorState = <ErrorState error={error || playerError || t('common.error')} onRetry={closePlayer}/>;
        return isOverlay ? <div className="fixed inset-0 z-50 overflow-y-auto">{errorState}</div> : errorState;
    }

    return (
        <div
            className={`${isOverlay ? `fixed inset-0 z-50 ${showReadAlong ? 'overflow-hidden' : 'overflow-y-auto'}` : 'relative min-h-screen'} flex flex-col bg-[#0d0e11] text-white`}
            role={isOverlay ? 'dialog' : undefined}
            aria-modal={isOverlay ? true : undefined}
            aria-label={isOverlay ? t('player.nowPlaying') : undefined}
        >
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-orange-600/10 blur-3xl" />
                <div className="absolute bottom-[-10rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-amber-300/5 blur-3xl" />
            </div>
            <Navbar barTitle={t('player.nowPlaying')} onBackClick={closePlayer}>
                <span>{book.book.name}</span>
            </Navbar>

            <main className={`relative mx-auto flex w-full max-w-6xl flex-1 px-5 sm:px-8 lg:px-10 ${showReadAlong ? 'min-h-0 items-stretch py-5 sm:py-6' : 'items-center py-10'}`}>
                {showReadAlong ? (
                    <InlineReadAlong
                        book={book}
                        status={transcription.status}
                        progress={transcription.progress}
                        segments={transcription.segments}
                        isEnabled={transcription.isEnabled}
                        currentTime={audioPlayer.currentTime}
                        onStart={transcription.start}
                        onStop={transcription.stop}
                        onSeek={time => audioPlayer.handleSeek(time, 'seek')}
                        onExit={() => setShowReadAlong(false)}
                    />
                ) : (
                    <BookInfo
                    book={book}
                    currentChapter={chapters.currentChapter}
                    chapters={chapters.chapters}
                    currentTime={audioPlayer.currentTime}
                    playbackRate={playbackRate}
                    onShowChaptersModal={() => chapters.setShowChaptersModal(true)}
                    onShowBookmarksModal={() => bookmarks.setShowBookmarksModal(true)}
                    onDownload={handleDownloadClick}
                    onCancelDownload={handleDownloadClick}
                    isDownloaded={isDownloaded}
                    isDownloading={isDownloading}
                    onSearchCatalog={searchCatalog}
                    />
                )}
            </main>

            {/* Player Controls docked at the bottom */}
            <footer className="sticky bottom-0 z-30 border-t border-white/[0.07] bg-[#101116]/85 backdrop-blur-xl">
                <PlayerControls
                    isPlaying={audioPlayer.isPlaying}
                    currentTime={audioPlayer.currentTime}
                    duration={audioPlayer.duration}
                    volume={audioPlayer.volume}
                    isMuted={audioPlayer.isMuted}
                    playbackRate={playbackRate}
                    history={audioPlayer.history}
                    onPlayPause={audioPlayer.handlePlayPause}
                    onSeek={audioPlayer.handleSeek}
                    onSeekStart={audioPlayer.handleSeekStart}
                    onSeekEnd={audioPlayer.handleSeekEnd}
                    onVolumeChange={audioPlayer.handleVolumeChange}
                    onToggleMute={audioPlayer.toggleMute}
                    onSkipForward={audioPlayer.skipForward}
                    onSkipBackward={audioPlayer.skipBackward}
                    onShowGotoModal={gotoModal.openModal}
                    onShowPlaybackSpeedModal={() => setShowPlaybackSpeedModal(true)}
                    onShowHistory={() => setShowListeningHistory(true)}
                    onToggleReadAlong={toggleReadAlong}
                    isTranscribing={transcription.isEnabled}
                    isReadAlongView={showReadAlong}
                />
            </footer>

            <ExternalProgressNotice
                entry={audioPlayer.externalSyncEntry}
                onRestore={() => audioPlayer.externalSyncEntry && audioPlayer.restoreHistoryEntry(audioPlayer.externalSyncEntry)}
                onDismiss={audioPlayer.dismissExternalSync}
                className="fixed bottom-40 right-5 z-[60] w-[min(30rem,calc(100vw-2.5rem))]"
            />

            {/* Modals */}
            <PlaybackSpeedModal
                            isOpen={showPlaybackSpeedModal}
                            playbackRate={playbackRate}
                            onClose={() => setShowPlaybackSpeedModal(false)}
                            onRateChange={handlePlaybackRateChange}
                        />

                        <GotoModal
                            isOpen={gotoModal.showGotoModal}
                            playbackRate={playbackRate}
                            gotoHours={gotoModal.gotoHours}
                            gotoMinutes={gotoModal.gotoMinutes}
                            gotoSeconds={gotoModal.gotoSeconds}
                            onClose={() => gotoModal.setShowGotoModal(false)}
                            onHoursChange={gotoModal.setGotoHours}
                            onMinutesChange={gotoModal.setGotoMinutes}
                            onSecondsChange={gotoModal.setGotoSeconds}
                            onGoto={gotoModal.handleGotoTime}
                        />

                        <ChaptersModal
                            isOpen={chapters.showChaptersModal}
                            chapters={chapters.chapters}
                            currentTime={audioPlayer.currentTime}
                            playbackRate={playbackRate}
                            onClose={() => chapters.setShowChaptersModal(false)}
                            onChapterClick={(time) => {
                                audioPlayer.handleSeek(time, 'chapter');
                                chapters.setShowChaptersModal(false);
                            }}
                        />

                        <BookmarkModals
                            showBookmarksModal={bookmarks.showBookmarksModal}
                            bookmarks={bookmarks.bookmarks}
                            onCloseBookmarksModal={() => bookmarks.setShowBookmarksModal(false)}
                            onShowCreateBookmarkModal={bookmarks.handleShowCreateBookmarkModal}
                            onGoToBookmark={(position) => audioPlayer.handleSeek(Math.floor(position / 1000), 'bookmark')}
                            onShowEditBookmarkModal={bookmarks.handleShowEditBookmarkModal}
                            onShowDeleteConfirmModal={bookmarks.handleShowDeleteConfirmModal}
                            showCreateBookmarkModal={bookmarks.showCreateBookmarkModal}
                            newBookmarkNote={bookmarks.newBookmarkNote}
                            currentTime={audioPlayer.currentTime}
                            playbackRate={playbackRate}
                            onCloseCreateBookmarkModal={bookmarks.handleCloseCreateBookmarkModal}
                            onNewBookmarkNoteChange={bookmarks.setNewBookmarkNote}
                            onCreateBookmark={() => bookmarks.createBookmark(audioPlayer.currentTime)}
                            showEditBookmarkModal={bookmarks.showEditBookmarkModal}
                            bookmarkToEdit={bookmarks.bookmarkToEdit}
                            editBookmarkNote={bookmarks.editBookmarkNote}
                            onCloseEditBookmarkModal={bookmarks.handleCloseEditBookmarkModal}
                            onEditBookmarkNoteChange={bookmarks.setEditBookmarkNote}
                            onEditBookmark={bookmarks.editBookmark}
                            showDeleteConfirmModal={bookmarks.showDeleteConfirmModal}
                            bookmarkToDelete={bookmarks.bookmarkToDelete}
                            onCloseDeleteConfirmModal={bookmarks.handleCloseDeleteConfirmModal}
                            onDeleteBookmark={bookmarks.deleteBookmark}
                        />

                        <ListeningHistoryModal
                            isOpen={showListeningHistory}
                            entries={audioPlayer.history}
                            onClose={() => setShowListeningHistory(false)}
                            onRestore={entry => {
                                audioPlayer.restoreHistoryEntry(entry);
                                setShowListeningHistory(false);
                            }}
                            onClear={audioPlayer.clearHistory}
                        />

            {/* Download Cancel/Delete Modal */}
            <DownloadCancelModal
                isOpen={showDownloadCancelModal}
                isDownloading={isDownloading}
                onConfirm={handleCancelOrDelete}
                onCancel={() => setShowDownloadCancelModal(false)}
            />
        </div>
    );
}

export default PlayerView;
