import React from 'react';
import {buildCoverUrl, formatMicrosecondsTime} from '../utils/helpers';
import {BookShelfEntity} from '../interfaces/books';
import {useTranslation} from 'react-i18next';

interface BookCardProps {
    book: BookShelfEntity;
    onBookSelect: (book: BookShelfEntity) => void;
    showProgress?: boolean;
    onSaveChange?: (book: BookShelfEntity, saved: boolean) => void;
    isSaving?: boolean;
    layout?: 'grid' | 'list';
}

function BookCard({
    book,
    onBookSelect,
    showProgress = true,
    onSaveChange,
    isSaving = false,
    layout = 'grid',
}: BookCardProps) {
    const {t} = useTranslation();
    const position = Math.max(0, book.abookMark?.pos || 0);
    const totalDuration = Math.max(0, book.abook?.time || 0);
    const progress = totalDuration > 0 ? Math.min((position / totalDuration) * 100, 100) : 0;
    const remainingTime = Math.max(totalDuration - position, 0);
    const cover = buildCoverUrl(book.book.largeCover || book.book.largeCoverE);
    const isSaved = Boolean(book.isInLibrary);
    const statusKey = book.status === 3
        ? 'dashboard.filters.concluded'
        : book.status === 2
            ? 'dashboard.filters.started'
            : 'dashboard.filters.notStarted';

    if (layout === 'list') {
        return (
            <article
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#17191e]/90 p-3 pr-4 transition hover:border-orange-400/40 hover:bg-[#1b1e24] focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-400/30"
            >
                <button
                    type="button"
                    onClick={() => onBookSelect(book)}
                    className="absolute inset-0 z-[1] cursor-pointer rounded-2xl focus:outline-none"
                    aria-label={t('bookCard.open', {title: book.book.name})}
                />
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#292c33] to-[#121317] sm:h-20 sm:w-20">
                    {cover ? (
                        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover"/>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30" aria-hidden="true">
                            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"/>
                            </svg>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    {book.book.category?.title && (
                        <p className="mb-0.5 hidden truncate text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300 sm:block">
                            {book.book.category.title}
                        </p>
                    )}
                    <h2 className="truncate text-sm font-bold text-white sm:text-base">{book.book.name}</h2>
                    <p className="truncate text-xs text-white/55 sm:text-sm">
                        {book.book.authorsAsString || t('bookCard.unknownAuthor')}
                    </p>
                    {showProgress && progress > 0 && (
                        <div className="mt-2 h-1 max-w-[18rem] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{width: `${progress}%`}}/>
                        </div>
                    )}
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1.5 text-right sm:flex">
                    {showProgress && (
                        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white/75">
                            {t(statusKey)}
                        </span>
                    )}
                    <span className="text-xs font-medium text-white/50">
                        {showProgress
                            ? (remainingTime > 0
                                ? t('bookCard.timeRemaining', {time: formatMicrosecondsTime(remainingTime)})
                                : t('bookCard.completed'))
                            : formatMicrosecondsTime(totalDuration)}
                    </span>
                </div>
                {onSaveChange && (
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={(event) => {
                            event.stopPropagation();
                            onSaveChange(book, !isSaved);
                        }}
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                            isSaved
                                ? 'border-orange-300/30 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25'
                                : 'border-white/10 bg-white/[0.045] text-white/60 hover:bg-white/10 hover:text-white'
                        } disabled:cursor-wait disabled:opacity-60`}
                        aria-label={t(isSaved ? 'discover.remove' : 'discover.save', {title: book.book.name})}
                        title={t(isSaved ? 'discover.removeShort' : 'discover.saveShort')}
                    >
                        {isSaving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"/>
                        ) : (
                            <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75V21l-7-4-7 4V5.75Z"/>
                            </svg>
                        )}
                    </button>
                )}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#16171b] transition group-hover:bg-orange-400" aria-hidden="true">
                    <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </span>
            </article>
        );
    }

    return (
        <article
            className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17191e]/90 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-[0_20px_48px_rgba(0,0,0,0.42)] focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-400/30"
        >
            <button
                type="button"
                onClick={() => onBookSelect(book)}
                className="absolute inset-0 z-[1] cursor-pointer rounded-2xl focus:outline-none"
                aria-label={t('bookCard.open', {title: book.book.name})}
            />
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#292c33] to-[#121317]">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30" aria-hidden="true">
                        <svg className="h-14 w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                {showProgress && (
                    <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                        {t(statusKey)}
                    </span>
                )}
                {onSaveChange && (
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={(event) => {
                            event.stopPropagation();
                            onSaveChange(book, !isSaved);
                        }}
                        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                            isSaved
                                ? 'border-orange-300/60 bg-orange-500 text-white hover:bg-orange-400'
                                : 'border-white/20 bg-black/60 text-white hover:border-orange-300/70 hover:bg-black/80'
                        } disabled:cursor-wait disabled:opacity-60`}
                        aria-label={t(isSaved ? 'discover.remove' : 'discover.save', {title: book.book.name})}
                        title={t(isSaved ? 'discover.removeShort' : 'discover.saveShort')}
                    >
                        {isSaving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                            <svg className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75V21l-7-4-7 4V5.75Z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                {book.book.category?.title && (
                    <p className="mb-2 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300">
                        {book.book.category.title}
                    </p>
                )}
                <h2 className="mb-1 min-h-[3rem] overflow-hidden text-base font-bold leading-6 text-white">
                    {book.book.name}
                </h2>
                <p className="mb-4 truncate text-sm text-white/55">
                    {book.book.authorsAsString || t('bookCard.unknownAuthor')}
                </p>

                <div className="mt-auto">
                    {showProgress && progress > 0 && (
                        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{width: `${progress}%`}} />
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-medium text-white/50">
                            {showProgress
                                ? (remainingTime > 0
                                    ? t('bookCard.timeRemaining', {time: formatMicrosecondsTime(remainingTime)})
                                    : t('bookCard.completed'))
                                : formatMicrosecondsTime(totalDuration)}
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#16171b] transition group-hover:bg-orange-400" aria-hidden="true">
                            <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}

export default BookCard;
