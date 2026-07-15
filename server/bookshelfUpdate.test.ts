import assert from 'node:assert/strict';
import test from 'node:test';
import {buildBookshelfUpdateRequest} from './storytelApi';

test('bookshelf save uses Storytel library delta format', () => {
  assert.deepEqual(buildBookshelfUpdateRequest('book-123', 'version-7', true), {
    resourceVersion: 'version-7',
    items: {
      'book-123': {
        millisecondsSinceEvent: 0,
        action: 'SET',
        state: 'WILL_CONSUME',
      },
    },
    followingItems: null,
    collections: null,
  });
});

test('bookshelf removal sends a delete delta without a state', () => {
  assert.deepEqual(buildBookshelfUpdateRequest('book-123', 'version-8', false), {
    resourceVersion: 'version-8',
    items: {
      'book-123': {
        millisecondsSinceEvent: 0,
        action: 'DELETE',
        state: null,
      },
    },
    followingItems: null,
    collections: null,
  });
});
