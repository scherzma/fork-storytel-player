import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {BookShelfEntity} from "../interfaces/books";
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import Navbar from './Navbar';
import {buildCoverUrl, localizedLanguageName, truncateTitle} from '../utils/helpers';
import api from '../utils/api';
import "../types/window.d.ts";

function BookView() {
    const {t, i18n} = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showFullDescription, setShowFullDescription] = useState(false);

    const book: BookShelfEntity = location.state?.book;
    const returnTo: string = location.state?.returnTo || '/';

    // description and language are not part of the bookshelf payload; they come
    // from the per-book book-details endpoint, fetched lazily below.
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('');

    useEffect(() => {
        if (book) {
            document.title = truncateTitle(book.book.name);
        }

        return () => {
            document.title = 'Storytel Player';
        };
    }, [book]);

    // Fetch description and language from the book-details endpoint.
    useEffect(() => {
        const consumableId = book?.book?.consumableId;
        if (!consumableId) return;
        let cancelled = false;
        api.get(`/book-details/${consumableId}`)
            .then((res) => {
                if (cancelled) return;
                const data = res.data || {};
                setDescription(data.description || '');
                setLanguage(localizedLanguageName(data.language, i18n.language));
            })
            .catch(() => {
                /* keep empty fallbacks on failure */
            });
        return () => {
            cancelled = true;
        };
    }, [book, i18n.language]);

    const handlePlayBook = () => {
        navigate(`/player/${bookId}`, {state: {book, returnTo}});
    };

    if (isLoading) {
        return <LoadingState message={t('common.loading')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate(returnTo)}/>;
    }

    if (!book) {
        return <ErrorState error={t('common.error')} onRetry={() => navigate(returnTo)}/>;
    }

    const formatDuration = (microseconds: number) => {
        const hours = Math.floor(microseconds / 3600000000);
        const minutes = Math.floor((microseconds % 3600000000) / 60000000);
        return `${hours} h ${minutes} min`;
    };

    const getTruncatedDescription = () => {
        if (!description) return t('bookView.noDescription');

        if (description.length <= 250 || showFullDescription) {
            return description;
        }

        return description.substring(0, 250) + '...';
    };

    const shouldShowMoreButton = () => {
        return description.length > 250;
    };

    const cover = buildCoverUrl(book.book.largeCover || book.book.largeCoverE);
    const meta = [
        {label: t('bookView.language'), value: language},
        {label: t('bookView.duration'), value: formatDuration(book.abook.time)},
        {label: t('bookView.category'), value: book.book.category?.title},
    ].filter(item => Boolean(item.value));

    return (
        <div className="min-h-screen bg-[#0d0e11] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-orange-600/10 blur-3xl" />
                <div className="absolute right-[-10rem] top-[26rem] h-[30rem] w-[30rem] rounded-full bg-amber-300/5 blur-3xl" />
            </div>
            <Navbar barTitle={t('bookView.details')} onBackClick={() => navigate(returnTo)}>
                <span>{book.book.name}</span>
            </Navbar>

            {/* Main Content */}
            <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 lg:px-10 lg:pt-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
                    {/* Cover + primary action */}
                    <div className="mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
                        <div className="relative">
                            <div
                                className="absolute -inset-4 rounded-[2rem] bg-orange-500/15 blur-2xl"
                                aria-hidden="true"
                            />
                            <img
                                src={cover}
                                alt={book.book.name}
                                className="relative aspect-square w-full rounded-2xl border border-white/10 object-cover shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                            />
                        </div>
                        <button
                            onClick={handlePlayBook}
                            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-[0_10px_30px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/25"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>{t('bookView.listen')}</span>
                        </button>
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                        {book.book.category?.title && (
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-orange-300">
                                {book.book.category.title}
                            </p>
                        )}
                        <h1 className="mb-4 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                            {book.book.name}
                        </h1>

                        <div className="mb-7 space-y-1 text-sm text-white/60">
                            <p>
                                {t('bookCard.author')} <span className="font-semibold text-white/85">{book.book.authorsAsString}</span>
                            </p>
                            <p>
                                {t('bookCard.narrator')} <span className="font-semibold text-white/85">{book.abook.narratorAsString}</span>
                            </p>
                        </div>

                        {meta.length > 0 && (
                            <div className="mb-9 flex flex-wrap gap-3">
                                {meta.map(item => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5"
                                    >
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{item.label}</p>
                                        <p className="mt-0.5 text-sm font-semibold text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        <div className="max-w-2xl">
                            <p className="whitespace-pre-line text-sm leading-7 text-white/60">
                                {getTruncatedDescription()}
                            </p>
                            {shouldShowMoreButton() && (
                                <button
                                    onClick={() => setShowFullDescription(!showFullDescription)}
                                    className="mt-3 text-sm font-bold text-orange-300 transition-colors hover:text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                >
                                    {showFullDescription ? t('bookView.showLess') : t('bookView.showMore')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default BookView;
