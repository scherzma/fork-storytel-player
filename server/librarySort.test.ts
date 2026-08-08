import assert from 'node:assert/strict';
import test from 'node:test';
import type {BookShelfEntity} from '../client/src/interfaces/books';
import {
  createLibraryBookComparator,
  getLastListenedTimestamp,
} from '../client/src/utils/librarySort';

const makeBook = ({
  id,
  title,
  author = '',
  position = 0,
  duration = 100,
  listenedAt,
  activityAt,
}: {
  id: number;
  title: string;
  author?: string;
  position?: number;
  duration?: number;
  listenedAt?: string;
  activityAt?: string;
}): BookShelfEntity => ({
  id,
  stateUpdateTime: activityAt,
  book: {name: title, authorsAsString: author},
  abook: {time: duration},
  abookMark: listenedAt ? {pos: position, updatedTime: listenedAt} : {pos: position},
} as BookShelfEntity);

test('last-listened sorting uses the positional update timestamp and puts unplayed books last', () => {
  const books = [
    makeBook({id: 1, title: 'Never played', activityAt: '2026-08-08T12:00:00Z'}),
    makeBook({id: 2, title: 'Older', listenedAt: '2026-08-01T12:00:00Z'}),
    makeBook({id: 3, title: 'Latest', listenedAt: '2026-08-07T12:00:00Z'}),
  ];

  books.sort(createLibraryBookComparator('lastListened', 'en'));

  assert.deepEqual(books.map(book => book.book.name), ['Latest', 'Older', 'Never played']);
});

test('last-listened sorting falls back to library activity and then title deterministically', () => {
  const books = [
    makeBook({id: 1, title: 'Zulu', activityAt: '2026-08-01T12:00:00Z'}),
    makeBook({id: 2, title: 'Alpha', activityAt: '2026-08-01T12:00:00Z'}),
    makeBook({id: 3, title: 'Recent activity', activityAt: '2026-08-07T12:00:00Z'}),
  ];

  books.sort(createLibraryBookComparator('lastListened', 'en'));

  assert.deepEqual(books.map(book => book.book.name), ['Recent activity', 'Alpha', 'Zulu']);
});

test('legacy listening age is evaluated against one fixed clock value', () => {
  const now = Date.parse('2026-08-08T12:00:00Z');
  const legacyBook = makeBook({id: 1, title: 'Legacy'});
  legacyBook.abookMark.secondsSinceCreated = 90;

  assert.equal(getLastListenedTimestamp(legacyBook, now), now - 90_000);
});

test('other library sort modes retain their intended behavior', () => {
  const books = [
    makeBook({id: 1, title: 'Book 10', author: 'Zulu', position: 25, activityAt: '2026-08-01T12:00:00Z'}),
    makeBook({id: 2, title: 'Book 2', author: 'Alpha', position: 75, activityAt: '2026-08-07T12:00:00Z'}),
  ];

  assert.deepEqual(
    [...books].sort(createLibraryBookComparator('recent', 'en')).map(book => book.id),
    [2, 1],
  );
  assert.deepEqual(
    [...books].sort(createLibraryBookComparator('title', 'en')).map(book => book.id),
    [2, 1],
  );
  assert.deepEqual(
    [...books].sort(createLibraryBookComparator('author', 'en')).map(book => book.id),
    [2, 1],
  );
  assert.deepEqual(
    [...books].sort(createLibraryBookComparator('progress', 'en')).map(book => book.id),
    [2, 1],
  );
});
