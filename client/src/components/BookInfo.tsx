import React from 'react';
import {useTranslation} from 'react-i18next';
import {buildCoverUrl, formatTimeNatural} from '../utils/helpers';
import {BookShelfEntity} from '../interfaces/books';
import {Chapter} from '../interfaces/chapters';

interface BookInfoProps {
    book: BookShelfEntity;
    currentChapter: {
        title: string;
        start: number;
        end: number;
        durationInSeconds?: number;
        number?: number;
    } | null;
    chapters: Chapter[];
    currentTime: number;
    playbackRate: number;
    onShowChaptersModal: () => void;
    onShowBookmarksModal: () => void;
    onDownload: () => void;
    onCancelDownload: () => void;
    isDownloaded: boolean;
    isDownloading: boolean;
}

const BookInfo: React.FC<BookInfoProps> = ({
                                               book,
                                               currentChapter,
                                               chapters,
                                               currentTime,
                                               playbackRate,
                                               onShowChaptersModal,
                                               onShowBookmarksModal,
                                               onDownload,
                                               onCancelDownload,
                                               isDownloaded,
                                               isDownloading,
                                           }) => {
    const {t} = useTranslation();

    const secondaryButton =
        'flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400';

    return (
        <div className="grid w-full gap-9 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-center lg:gap-14">
            {/* Cover */}
            <div className="mx-auto w-full max-w-[16rem] sm:max-w-xs lg:mx-0 lg:max-w-none">
                <div className="relative">
                    <div className="absolute -inset-4 rounded-[2rem] bg-orange-500/15 blur-2xl" aria-hidden="true"/>
                    <img
                        src={buildCoverUrl(book.book.largeCover || book.book.largeCoverE)}
                        alt={book.book.name}
                        className="relative aspect-square w-full rounded-2xl border border-white/10 object-cover shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                    />
                </div>
            </div>

            {/* Metadata + actions */}
            <div className="min-w-0 text-center lg:text-left">
                {book.book.category?.title && (
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-orange-300">
                        {book.book.category.title}
                    </p>
                )}
                <h2 className="mb-3 break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                    {book.book.name}
                </h2>
                <p className="mb-7 text-sm text-white/55">
                    {book.book.authorsAsString} • {book.abook.narratorAsString}
                </p>

                {currentChapter && (
                    <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-left">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                            {t('chapters.chapter')} {currentChapter.number ?? ''}
                        </p>
                        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <p className="min-w-0 truncate text-base font-semibold text-white">{currentChapter.title}</p>
                            <p className="shrink-0 text-sm text-white/50">
                                {formatTimeNatural((currentChapter.end - currentTime) / playbackRate)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                    {chapters && chapters.length > 0 && (
                        <button onClick={onShowChaptersModal} className={secondaryButton}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                      d="M4 6h.01M4 12h.01M4 18h.01M9 6h11M9 12h11M9 18h11"/>
                            </svg>
                            {t('player.chapters')}
                        </button>
                    )}
                    <button id="bookmark-btn" onClick={onShowBookmarksModal} className={secondaryButton}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                  d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75V21l-7-4-7 4V5.75Z"/>
                        </svg>
                        {t('player.bookmarks')}
                    </button>
                    <button
                        id="download-btn"
                        onClick={isDownloading ? onCancelDownload : onDownload}
                        className={`flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                            isDownloaded
                                ? 'border-emerald-300/25 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                : isDownloading
                                    ? 'border-red-300/25 bg-red-500/15 text-red-200 hover:bg-red-500/25'
                                    : 'border-white/10 bg-white/[0.045] text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {isDownloading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-200/40 border-t-red-200" aria-hidden="true"/>
                        ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                {isDownloaded ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7"/>
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                )}
                            </svg>
                        )}
                        {isDownloading
                            ? t('download.cancelButton')
                            : isDownloaded
                                ? t('player.downloaded')
                                : t('player.download')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookInfo;
