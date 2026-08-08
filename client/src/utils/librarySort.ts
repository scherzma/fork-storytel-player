import type {LibrarySort} from '../contexts/BrowseStateContext';
import type {BookShelfEntity} from '../interfaces/books';

const parseTimestamp = (value: string | null | undefined): number => {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getLastListenedTimestamp = (book: BookShelfEntity, now = Date.now()): number => {
    const updatedTime = parseTimestamp(book.abookMark?.updatedTime);
    if (updatedTime > 0) return updatedTime;

    const legacyInsertTime = parseTimestamp(book.abookMark?.insertDate);
    if (legacyInsertTime > 0) return legacyInsertTime;

    const secondsSinceCreated = book.abookMark?.secondsSinceCreated;
    return typeof secondsSinceCreated === 'number' && secondsSinceCreated >= 0
        ? now - secondsSinceCreated * 1000
        : 0;
};

export const getLibraryActivityTimestamp = (book: BookShelfEntity): number =>
    parseTimestamp(book.stateUpdateTime) || parseTimestamp(book.insertDate);

const getProgress = (book: BookShelfEntity): number => {
    const duration = book.abook?.time || 0;
    return duration > 0 ? (book.abookMark?.pos || 0) / duration : 0;
};

export const createLibraryBookComparator = (sort: LibrarySort, language: string) => {
    const collator = new Intl.Collator(language, {numeric: true, sensitivity: 'base'});
    const now = Date.now();
    const byTitle = (left: BookShelfEntity, right: BookShelfEntity) =>
        collator.compare(left.book?.name || '', right.book?.name || '')
        || collator.compare(String(left.id ?? ''), String(right.id ?? ''));

    return (left: BookShelfEntity, right: BookShelfEntity): number => {
        if (sort === 'lastListened') {
            const byListeningTime = getLastListenedTimestamp(right, now) - getLastListenedTimestamp(left, now);
            if (byListeningTime !== 0) return byListeningTime;

            const byLibraryActivity = getLibraryActivityTimestamp(right) - getLibraryActivityTimestamp(left);
            return byLibraryActivity || byTitle(left, right);
        }

        if (sort === 'recent') {
            const byLibraryActivity = getLibraryActivityTimestamp(right) - getLibraryActivityTimestamp(left);
            return byLibraryActivity || byTitle(left, right);
        }

        if (sort === 'title') return byTitle(left, right);

        if (sort === 'author') {
            return collator.compare(left.book?.authorsAsString || '', right.book?.authorsAsString || '')
                || byTitle(left, right);
        }

        const byProgress = getProgress(right) - getProgress(left);
        return byProgress || byTitle(left, right);
    };
};
