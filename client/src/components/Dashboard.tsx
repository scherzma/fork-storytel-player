import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import api from '../utils/api';
import BookCard from './BookCard';
import ErrorState from './ErrorState';
import DashboardHeader from './DashboardHeader';
import {BookShelfEntity, BookShelfResponse} from '../interfaces/books';
import {useBrowseState} from '../contexts/BrowseStateContext';

interface DashboardProps {
    onLogout: () => void;
    triggerLogout?: boolean;
    setTriggerLogout?: (value: boolean) => void;
}

function Dashboard({onLogout, triggerLogout, setTriggerLogout}: DashboardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {
        libraryBooks: books,
        setLibraryBooks: setBooks,
        libraryLoaded,
        setLibraryLoaded,
        libraryFilter: filterStatus,
        setLibraryFilter: setFilterStatus,
        libraryQuery: searchQuery,
        setLibraryQuery: setSearchQuery,
        libraryViewMode: viewMode,
        setLibraryViewMode,
    } = useBrowseState();
    const [isLoading, setIsLoading] = useState(!libraryLoaded);
    const [error, setError] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        window.scrollTo({top: 0, left: 0});
        if (!libraryLoaded) void loadBookshelf();
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredBooks = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
        return books.filter(book => {
            if (!book.abook) return false;
            if (filterStatus !== -1 && Number(book.status) !== filterStatus) return false;
            if (!normalizedQuery) return true;
            return [book.book?.name, book.book?.authorsAsString, book.abook?.narratorAsString]
                .some(value => value?.toLocaleLowerCase().includes(normalizedQuery));
        });
    }, [books, filterStatus, searchQuery]);

    const counts = useMemo(() => ({
        all: books.filter(book => Boolean(book.abook)).length,
        1: books.filter(book => Number(book.status) === 1 && Boolean(book.abook)).length,
        2: books.filter(book => Number(book.status) === 2 && Boolean(book.abook)).length,
        3: books.filter(book => Number(book.status) === 3 && Boolean(book.abook)).length,
    }), [books]);

    const loadBookshelf = async () => {
        setError('');
        try {
            setIsLoading(true);
            const response = await api.get<BookShelfResponse>('/bookshelf');
            setBooks(response.data.books || []);
            setLibraryLoaded(true);
        } catch (requestError: any) {
            try {
                const offline = await api.get<BookShelfResponse>('/offline/bookshelf');
                setBooks(offline.data?.books || []);
                setLibraryLoaded(true);
            } catch {
                setError(requestError.response?.data?.error || t('dashboard.loadError'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookSelect = (book: BookShelfEntity) => {
        navigate(`/book/${book.abook?.id}`, {state: {book, returnTo: '/'}});
    };

    const changeViewMode = setLibraryViewMode;

    const filters = [
        {status: -1, label: 'dashboard.filters.all', count: counts.all},
        {status: 1, label: 'dashboard.filters.notStarted', count: counts[1]},
        {status: 2, label: 'dashboard.filters.started', count: counts[2]},
        {status: 3, label: 'dashboard.filters.concluded', count: counts[3]},
    ];

    return (
        <div className="min-h-screen bg-[#0d0e11] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-48 top-0 h-[32rem] w-[32rem] rounded-full bg-orange-600/[0.08] blur-3xl" />
                <div className="absolute right-[-14rem] top-[24rem] h-[34rem] w-[34rem] rounded-full bg-amber-300/[0.045] blur-3xl" />
            </div>
            <DashboardHeader
                activeView="library"
                onLogout={onLogout}
                triggerLogout={triggerLogout}
                setTriggerLogout={setTriggerLogout}
            />

            {error ? (
                <ErrorState error={error} onRetry={() => void loadBookshelf()} onLogout={onLogout} />
            ) : (
                <main className="relative mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
                    <header className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-orange-300">{t('dashboard.eyebrow')}</p>
                            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('dashboard.title')}</h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">{t('dashboard.subtitle', {count: counts.all})}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/discover')}
                            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-orange-500 px-5 text-sm font-bold shadow-[0_10px_28px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/25 md:self-auto"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('dashboard.findBooks')}
                        </button>
                    </header>

                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label={t('dashboard.loading')}>
                            {Array.from({length: 10}).map((_, index) => (
                                <div key={index} className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.035]">
                                    <div className="aspect-square animate-pulse bg-white/[0.055]" />
                                    <div className="space-y-3 p-4"><div className="h-4 animate-pulse rounded bg-white/[0.06]" /><div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" /></div>
                                </div>
                            ))}
                        </div>
                    ) : books.length === 0 ? (
                        <section className="flex min-h-[25rem] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 text-center">
                            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300" aria-hidden="true">
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75V21l-7-4-7 4V5.75Z" /></svg>
                            </span>
                            <h2 className="mb-2 text-xl font-bold">{t('dashboard.noBooks')}</h2>
                            <p className="mb-6 max-w-md text-sm leading-6 text-white/45">{t('dashboard.emptyLibrary')}</p>
                            <button type="button" onClick={() => navigate('/discover')} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#15161a] transition hover:bg-orange-300">
                                {t('dashboard.browseCatalog')}
                            </button>
                        </section>
                    ) : (
                        <>
                            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                    <div className="relative min-w-0 flex-1">
                                        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                                        <input
                                            ref={searchInputRef}
                                            type="search"
                                            value={searchQuery}
                                            onChange={event => setSearchQuery(event.target.value)}
                                            placeholder={t('dashboard.search')}
                                            className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 focus:ring-4 focus:ring-orange-500/10"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" role="group" aria-label={t('dashboard.filterLabel')}>
                                        {filters.map(({status, label, count}) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setFilterStatus(status)}
                                                className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                                    filterStatus === status
                                                        ? 'bg-white text-[#15161a] shadow-md'
                                                        : 'bg-white/[0.045] text-white/60 hover:bg-white/[0.08] hover:text-white'
                                                }`}
                                            >
                                                {t(label)}
                                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filterStatus === status ? 'bg-black/10' : 'bg-black/25 text-white/45'}`}>{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex shrink-0 rounded-xl bg-white/[0.045] p-1" role="group" aria-label={t('dashboard.viewLabel')}>
                                        <button
                                            type="button"
                                            onClick={() => changeViewMode('grid')}
                                            aria-label={t('dashboard.viewGrid')}
                                            title={t('dashboard.viewGrid')}
                                            aria-pressed={viewMode === 'grid'}
                                            className={`flex h-8 w-9 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                                viewMode === 'grid' ? 'bg-white text-[#15161a] shadow-md' : 'text-white/55 hover:bg-white/[0.08] hover:text-white'
                                            }`}
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5.5A1.5 1.5 0 0 1 5.5 4h3A1.5 1.5 0 0 1 10 5.5v3A1.5 1.5 0 0 1 8.5 10h-3A1.5 1.5 0 0 1 4 8.5v-3Zm10 0A1.5 1.5 0 0 1 15.5 4h3A1.5 1.5 0 0 1 20 5.5v3A1.5 1.5 0 0 1 18.5 10h-3A1.5 1.5 0 0 1 14 8.5v-3Zm-10 10A1.5 1.5 0 0 1 5.5 14h3A1.5 1.5 0 0 1 10 15.5v3A1.5 1.5 0 0 1 8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3Zm10 0a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3Z"/>
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => changeViewMode('list')}
                                            aria-label={t('dashboard.viewList')}
                                            title={t('dashboard.viewList')}
                                            aria-pressed={viewMode === 'list'}
                                            className={`flex h-8 w-9 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                                viewMode === 'list' ? 'bg-white text-[#15161a] shadow-md' : 'text-white/55 hover:bg-white/[0.08] hover:text-white'
                                            }`}
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {filteredBooks.length === 0 ? (
                                <div className="py-20 text-center">
                                    <h2 className="mb-2 text-lg font-bold">{t('dashboard.noMatches')}</h2>
                                    <p className="mb-5 text-sm text-white/45">{t('dashboard.noMatchesHint')}</p>
                                    <button type="button" onClick={() => { setSearchQuery(''); setFilterStatus(-1); }} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">
                                        {t('dashboard.clearFilters')}
                                    </button>
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="flex flex-col gap-3">
                                    {filteredBooks.map(book => (
                                        <BookCard key={`${book.book.consumableId}-${book.abook.id}`} book={book} onBookSelect={handleBookSelect} layout="list" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {filteredBooks.map(book => (
                                        <BookCard key={`${book.book.consumableId}-${book.abook.id}`} book={book} onBookSelect={handleBookSelect} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            )}
        </div>
    );
}

export default Dashboard;
