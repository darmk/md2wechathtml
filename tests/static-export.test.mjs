import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { siteBasePath, siteAssetPath } from '../lib/site-path.ts';
import { startStaticServer } from '../scripts/static-files.mjs';
import { checkStatic } from '../scripts/check-static.mjs';

void test('owned asset paths include exactly one deployment prefix separator', () => {
  assert.equal(siteAssetPath('/og.png'), '/md2articlehtml/og.png');
  assert.equal(siteAssetPath('favicon.svg'), '/md2articlehtml/favicon.svg');
});

void test('static preview mirrors subpath routing, MIME and 404 behavior', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'moge-static-test-'));
  let server;
  try {
    await writeFile(path.join(directory, 'index.html'), '<html>test</html>');
    await writeFile(path.join(directory, 'main.js'), 'export const test = true;');
    server = await startStaticServer(directory);
    assert.equal(await (await fetch(server.url)).text(), '<html>test</html>');
    const redirect = await fetch(`${server.url.slice(0, -1)}?test=1`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), `${siteBasePath}/?test=1`);
    const asset = await fetch(`${server.url}main.js`, { method: 'HEAD' });
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.equal(await asset.text(), '');
    for (const request of ['missing.js', '%2e%2e%5coutside.txt']) {
      const response = await fetch(`${server.url}${request}`);
      assert.ok([403, 404].includes(response.status));
      await response.text();
    }
    const rootPage = await fetch(new URL('/', server.url));
    assert.equal(rootPage.status, 404);
    await rootPage.text();
  } finally {
    if (server) await server.close();
    await rm(directory, { recursive: true });
  }
});

void test('a missing homepage fails static validation instead of succeeding silently', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'moge-missing-test-'));
  try { await assert.rejects(checkStatic(directory), { code: 'ENOENT' }); }
  finally { await rm(directory, { recursive: true }); }
});
