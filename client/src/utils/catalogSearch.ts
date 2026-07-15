import {BookShelfEntity} from '../interfaces/books';

export type CatalogSearchSource = 'author' | 'narrator' | 'series' | 'category';

export function buildCatalogSearchPath(query: string, source: CatalogSearchSource) {
    const params = new URLSearchParams({q: query.trim(), source});
    return `/discover?${params.toString()}`;
}

function uniqueNames(names: string[]) {
    return [...new Set(names.map(name => name.trim()).filter(Boolean))];
}

export function getAuthorNames(book: BookShelfEntity) {
    const structuredNames = book.book.authors?.map(author => author.name).filter(Boolean) || [];
    if (structuredNames.length > 0) return uniqueNames(structuredNames);

    return uniqueNames((book.book.authorsAsString || '').split(/\s*(?:,|;|\s&\s)\s*/));
}

export function getSeriesNames(book: BookShelfEntity) {
    return uniqueNames((book.book.series || []).map(series => series.name).filter(Boolean));
}

export function extractSeriesNames(details: unknown) {
    if (!details || typeof details !== 'object') return [];
    const record = details as Record<string, any>;
    const candidates = [record.series, record.book?.series, record.metadata?.series];
    const names = candidates.flatMap(candidate => {
        const entries = Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
        return entries.map(entry => typeof entry === 'string' ? entry : entry?.name || entry?.title || '');
    });
    return uniqueNames(names);
}
