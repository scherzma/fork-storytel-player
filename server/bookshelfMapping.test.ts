import assert from 'node:assert/strict';
import test from 'node:test';
import {mapBookshelfModel} from './storytelApi';

test('bookshelf mapping preserves listening timestamps and scales milliseconds', () => {
  const positionUpdatedTime = '2026-08-08T10:11:12.000Z';
  const stateUpdateTime = '2026-08-07T09:08:07.000Z';

  const mapped = mapBookshelfModel({
    id: 'book-123',
    title: 'Mapped book',
    state: 'CONSUMING',
    stateUpdateTime,
    formats: [
      {
        id: 'audio-123',
        type: 'abook',
        durationInMilliseconds: 7_200_000,
        position: {
          position: 123_456,
          updatedTime: positionUpdatedTime,
          kidsMode: false,
        },
      },
    ],
  });

  assert.equal(mapped.stateUpdateTime, stateUpdateTime);
  assert.equal(mapped.abook?.time, 7_200_000_000);
  assert.deepEqual(mapped.abookMark, {
    pos: 123_456_000,
    updatedTime: positionUpdatedTime,
  });
});

test('bookshelf mapping leaves the audio mark null when position is missing', () => {
  const mapped = mapBookshelfModel({
    id: 'book-456',
    title: 'Unstarted book',
    state: 'WILL_CONSUME',
    formats: [
      {
        id: 'audio-456',
        type: 'abook',
        durationInMilliseconds: 60_000,
      },
    ],
  });

  assert.equal(mapped.abookMark, null);
  assert.equal(mapped.stateUpdateTime, undefined);
});

test('bookshelf mapping keeps a position when its update timestamp is missing', () => {
  const mapped = mapBookshelfModel({
    id: 'book-789',
    title: 'Legacy position',
    state: 'CONSUMING',
    formats: [
      {
        id: 'audio-789',
        type: 'abook',
        position: {
          position: 42,
          kidsMode: false,
        },
      },
    ],
  });

  assert.deepEqual(mapped.abookMark, {pos: 42_000});
});
