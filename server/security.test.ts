import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  normalizeBookIdentifier,
  normalizeCatalogQuery,
  resolveBookFile,
  sanitizeLogText,
  sanitizeLogValue,
} from './security';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

test('log sanitizer removes credentials from text and nested objects', () => {
  assert.equal(
    sanitizeLogText('https://example.test/audio?token=secret&book=1'),
    'https://example.test/audio?token=[REDACTED]&book=1',
  );
  assert.deepEqual(
    sanitizeLogValue({
      email: 'reader@example.test',
      nested: { jwt: 'secret', title: 'Safe title' },
      authorization: 'Bearer abc.def',
    }),
    {
      email: '[REDACTED]',
      nested: { jwt: '[REDACTED]', title: 'Safe title' },
      authorization: '[REDACTED]',
    },
  );
});

test('download file resolver rejects traversal and unsafe identifiers', () => {
  const downloads = path.join(os.tmpdir(), 'storytel-security-test');
  assert.equal(
    resolveBookFile(downloads, 'book_123-abc'),
    path.join(path.resolve(downloads), 'book_123-abc.mp3'),
  );
  assert.throws(() => resolveBookFile(downloads, '../secrets'), /Invalid book identifier/);
  assert.throws(() => resolveBookFile(downloads, '..%2fsecrets'), /Invalid book identifier/);
});

test('catalog queries are normalized and bounded', () => {
  assert.equal(normalizeCatalogQuery('  Harry   Potter  '), 'Harry Potter');
  assert.throws(() => normalizeCatalogQuery('a'), /Invalid catalog query/);
  assert.throws(() => normalizeCatalogQuery('x'.repeat(101)), /Invalid catalog query/);
  assert.throws(() => normalizeCatalogQuery(undefined), /Invalid catalog query/);
});

test('book identifiers are restricted to Storytel-safe path characters', () => {
  assert.equal(normalizeBookIdentifier('book_123-abc'), 'book_123-abc');
  assert.throws(() => normalizeBookIdentifier('../book'), /Invalid book identifier/);
  assert.throws(() => normalizeBookIdentifier('book/child'), /Invalid book identifier/);
  assert.throws(() => normalizeBookIdentifier(''), /Invalid book identifier/);
  assert.throws(() => normalizeBookIdentifier(123), /Invalid book identifier/);
});

test('the historical public JWT secret no longer authenticates', async () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'storytel-server-test-'));
  const previousEnvironment = {
    IS_ELECTRON: process.env.IS_ELECTRON,
    DOWNLOAD_PATH: process.env.DOWNLOAD_PATH,
    USER_DATA_PATH: process.env.USER_DATA_PATH,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  process.env.IS_ELECTRON = 'true';
  process.env.DOWNLOAD_PATH = tempDirectory;
  process.env.USER_DATA_PATH = tempDirectory;
  delete process.env.JWT_SECRET;

  try {
    const { default: fastify } = await import('./fastify-common');
    const forgedToken = signJwt(
      { email: 'attacker@example.test', exp: Math.floor(Date.now() / 1000) + 3600 },
      'your-super-secret-jwt-key-change-this-in-production',
    );
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/logs',
      headers: { authorization: `Bearer ${forgedToken}` },
    });
    assert.equal(response.statusCode, 401);
    await fastify.close();
  } finally {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
