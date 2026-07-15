import React, {FormEvent, useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import api from '../utils/api';
import {BookShelfEntity, BookShelfResponse} from '../interfaces/books';
import BookCard from './BookCard';
import DashboardHeader from './DashboardHeader';
import {useBrowseState} from '../contexts/BrowseStateContext';
import {CatalogSearchSource} from '../utils/catalogSearch';

interface DiscoverProps {
    onLogout: () => void;
    triggerLogout?: boolean;
    setTriggerLogout?: (value: boolean) => void;
}

type Notice = {type: 'success' | 'error'; message: string} | null;

function Discover({onLogout, triggerLogout, setTriggerLogout}: DiscoverProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const automaticSearchRef = useRef('');
    const {
        discoverQuery: query,
        setDiscoverQuery: setQuery,
        discoverBooks: books,
        setDiscoverBooks: setBooks,
        discoverHasSearched: hasSearched,
        setDiscoverHasSearched: setHasSearched,
        setLibraryLoaded,
    } = useBrowseState();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<Notice>(null);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const requestedQuery = searchParams.get('q')?.trim() || '';
    const requestedSource = searchParams.get('source');
    const searchSource: CatalogSearchSource | null =
        requestedSource === 'author' || requestedSource === 'narrator' || requestedSource === 'series' || requestedSource === 'category'
            ? requestedSource
            : null;

    useEffect(() => {
        window.scrollTo({top: 0, left: 0});
        inputRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 3500);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const runSearch = async (rawQuery: string) => {
        const normalizedQuery = rawQuery.trim().replace(/\s+/g, ' ');
        if (normalizedQuery.length < 2) {
            setError(t('discover.queryTooShort'));
            return;
        }

        setQuery(normalizedQuery);
        setIsLoading(true);
        setHasSearched(true);
        setError('');
        setNotice(null);
        try {
            const response = await api.get<BookShelfResponse>(
                `/catalog/search?q=${encodeURIComponent(normalizedQuery)}`,
            );
            setBooks((response.data.books || []).filter(book => Boolean(book.abook)));
        } catch {
            setBooks([]);
            setError(t('discover.searchError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (requestedQuery.length < 2) return;
        const signature = `${requestedQuery}|${searchSource || ''}`;
        if (automaticSearchRef.current === signature) return;
        automaticSearchRef.current = signature;
        if (hasSearched && query === requestedQuery) return;
        void runSearch(requestedQuery);
        // The URL is the trigger; browse state setters are stable context values.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedQuery, searchSource]);

    const search = (event: FormEvent) => {
        event.preventDefault();
        const normalizedQuery = query.trim().replace(/\s+/g, ' ');
        if (normalizedQuery.length < 2) {
            void runSearch(normalizedQuery);
            return;
        }
        automaticSearchRef.current = `${normalizedQuery}|`;
        navigate(`/discover?q=${encodeURIComponent(normalizedQuery)}`, {replace: true});
        void runSearch(normalizedQuery);
    };

    const handleBookSelect = (book: BookShelfEntity) => {
        navigate(`/book/${encodeURIComponent(String(book.abook.id))}`, {
            state: {book, returnTo: `${location.pathname}${location.search}`},
        });
    };

    const handleSaveChange = async (book: BookShelfEntity, saved: boolean) => {
        const consumableId = String(book.book.consumableId);
        if (pendingIds.has(consumableId)) return;

        setPendingIds(current => new Set(current).add(consumableId));
        setBooks(current => current.map(item =>
            String(item.book.consumableId) === consumableId
                ? {...item, isInLibrary: saved}
                : item,
        ));
        try {
            await api.put(`/bookshelf/${encodeURIComponent(consumableId)}`, {saved});
            setLibraryLoaded(false);
            setNotice({
                type: 'success',
                message: t(saved ? 'discover.saveSuccess' : 'discover.removeSuccess', {title: book.book.name}),
            });
        } catch {
            setBooks(current => current.map(item =>
                String(item.book.consumableId) === consumableId
                    ? {...item, isInLibrary: !saved}
                    : item,
            ));
            setNotice({type: 'error', message: t('discover.saveError')});
        } finally {
            setPendingIds(current => {
                const next = new Set(current);
                next.delete(consumableId);
                return next;
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0e11] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-orange-600/10 blur-3xl" />
                <div className="absolute right-[-10rem] top-[28rem] h-[30rem] w-[30rem] rounded-full bg-amber-300/5 blur-3xl" />
            </div>
            <DashboardHeader
                activeView="discover"
                onLogout={onLogout}
                triggerLogout={triggerLogout}
                setTriggerLogout={setTriggerLogout}
            />

            <main className="relative mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
                <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#252832] via-[#191b21] to-[#121317] px-6 py-10 shadow-2xl sm:px-10 sm:py-14">
                    <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" aria-hidden="true" />
                    <div className="relative">
                        <div className="max-w-3xl">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-orange-300">{t('discover.eyebrow')}</p>
                            <h1 className="mb-3 text-3xl font-black tracking-tight sm:text-5xl">{t('discover.title')}</h1>
                            <p className="max-w-2xl text-sm leading-6 text-white/60 sm:text-base">{t('discover.subtitle')}</p>
                        </div>
                        <form onSubmit={search} className="mt-8 grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                            <div className="relative flex-1">
                                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="search"
                                    minLength={2}
                                    maxLength={100}
                                    value={query}
                                    onChange={event => setQuery(event.target.value)}
                                    placeholder={t('discover.placeholder')}
                                    aria-label={t('discover.placeholder')}
                                    className="h-14 w-full rounded-xl border border-white/15 bg-black/35 pl-12 pr-4 text-base text-white shadow-inner outline-none placeholder:text-white/35 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || query.trim().length < 2}
                                className="h-14 rounded-xl bg-orange-500 px-7 font-bold text-white shadow-[0_10px_30px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
                            >
                                {isLoading ? t('discover.searching') : t('discover.search')}
                            </button>
                        </form>
                        {searchSource && requestedQuery && (
                            <p className="mt-3 inline-flex rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-200">
                                {t(`discover.searchContext.${searchSource}`, {name: requestedQuery})}
                            </p>
                        )}
                        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-300">{error}</p>}
                    </div>
                </section>

                {!hasSearched ? (
                    <section className="flex min-h-[16rem] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 text-center">
                        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300" aria-hidden="true">
                            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
                            </svg>
                        </span>
                        <h2 className="mb-2 text-xl font-bold">{t('discover.prompt')}</h2>
                        <p className="max-w-md text-sm leading-6 text-white/45">{t('discover.promptDescription')}</p>
                    </section>
                ) : isLoading ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label={t('discover.searching')}>
                        {Array.from({length: 10}).map((_, index) => (
                            <div key={index} className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.035]">
                                <div className="aspect-square animate-pulse bg-white/[0.055]" />
                                <div className="space-y-3 p-4"><div className="h-4 animate-pulse rounded bg-white/[0.06]" /><div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" /></div>
                            </div>
                        ))}
                    </div>
                ) : books.length === 0 && !error ? (
                    <div className="py-20 text-center text-white/45">{t('discover.noResults')}</div>
                ) : (
                    <section>
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">{t('discover.resultsEyebrow')}</p>
                                <h2 className="text-2xl font-bold">{t('discover.results', {count: books.length})}</h2>
                            </div>
                            <p className="hidden max-w-xs text-right text-xs leading-5 text-white/40 sm:block">{t('discover.saveHint')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {books.map(book => {
                                const id = String(book.book.consumableId);
                                return (
                                    <BookCard
                                        key={`${id}-${book.abook.id}`}
                                        book={book}
                                        onBookSelect={handleBookSelect}
                                        onSaveChange={handleSaveChange}
                                        isSaving={pendingIds.has(id)}
                                        showProgress={false}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>

            {notice && (
                <div
                    role="status"
                    className={`fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
                        notice.type === 'success'
                            ? 'border-emerald-300/25 bg-emerald-950/90 text-emerald-100'
                            : 'border-red-300/25 bg-red-950/90 text-red-100'
                    }`}
                >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${notice.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {notice.message}
                </div>
            )}
        </div>
    );
}

export default Discover;
