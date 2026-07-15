import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {BookShelfEntity} from '../interfaces/books';
import storage from '../utils/storage';

export type LibraryViewMode = 'grid' | 'list';

interface BrowseStateValue {
    libraryBooks: BookShelfEntity[];
    setLibraryBooks: React.Dispatch<React.SetStateAction<BookShelfEntity[]>>;
    libraryLoaded: boolean;
    setLibraryLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    libraryQuery: string;
    setLibraryQuery: React.Dispatch<React.SetStateAction<string>>;
    libraryFilter: number;
    setLibraryFilter: React.Dispatch<React.SetStateAction<number>>;
    libraryViewMode: LibraryViewMode;
    setLibraryViewMode: (mode: LibraryViewMode) => void;
    discoverQuery: string;
    setDiscoverQuery: React.Dispatch<React.SetStateAction<string>>;
    discoverBooks: BookShelfEntity[];
    setDiscoverBooks: React.Dispatch<React.SetStateAction<BookShelfEntity[]>>;
    discoverHasSearched: boolean;
    setDiscoverHasSearched: React.Dispatch<React.SetStateAction<boolean>>;
}

const BrowseStateContext = createContext<BrowseStateValue | null>(null);

export function BrowseStateProvider({children}: {children: React.ReactNode}) {
    const [libraryBooks, setLibraryBooks] = useState<BookShelfEntity[]>([]);
    const [libraryLoaded, setLibraryLoaded] = useState(false);
    const [libraryQuery, setLibraryQuery] = useState('');
    const [libraryFilter, setLibraryFilter] = useState(-1);
    const [libraryViewModeState, setLibraryViewModeState] = useState<LibraryViewMode>('grid');
    const [discoverQuery, setDiscoverQuery] = useState('');
    const [discoverBooks, setDiscoverBooks] = useState<BookShelfEntity[]>([]);
    const [discoverHasSearched, setDiscoverHasSearched] = useState(false);

    useEffect(() => {
        void storage.get('libraryViewMode').then(saved => {
            if (saved === 'list' || saved === 'grid') setLibraryViewModeState(saved);
        });
    }, []);

    const setLibraryViewMode = (mode: LibraryViewMode) => {
        setLibraryViewModeState(mode);
        void storage.set('libraryViewMode', mode);
    };

    const value = useMemo<BrowseStateValue>(() => ({
        libraryBooks,
        setLibraryBooks,
        libraryLoaded,
        setLibraryLoaded,
        libraryQuery,
        setLibraryQuery,
        libraryFilter,
        setLibraryFilter,
        libraryViewMode: libraryViewModeState,
        setLibraryViewMode,
        discoverQuery,
        setDiscoverQuery,
        discoverBooks,
        setDiscoverBooks,
        discoverHasSearched,
        setDiscoverHasSearched,
    }), [
        libraryBooks,
        libraryLoaded,
        libraryQuery,
        libraryFilter,
        libraryViewModeState,
        discoverQuery,
        discoverBooks,
        discoverHasSearched,
    ]);

    return <BrowseStateContext.Provider value={value}>{children}</BrowseStateContext.Provider>;
}

export function useBrowseState() {
    const context = useContext(BrowseStateContext);
    if (!context) throw new Error('useBrowseState must be used within BrowseStateProvider');
    return context;
}
