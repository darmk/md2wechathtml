import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { siteBasePath } from '../lib/site-path.ts';
import { checkStatic } from './check-static.mjs';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
process.chdir(root);
process.env.NODE_ENV = 'production';

// Use Vite's complete RSC build, then render the actual prefixed URL ourselves.
// vinext 1.0.0-beta.5's CLI prerender requests "/" even with basePath configured,
// silently skipping the 404 as "dynamic". Do not patch installed dependencies.
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite'))), 'build'], { cwd: root, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Vite build failed (${code})`)));
});

const stage = await mkdtemp(path.join(dist, '.static-export-'));
const { startProdServer } = await import('vinext/server/prod-server');
const runtime = await startProdServer({ port: 0, host: '127.0.0.1', outDir: dist, noCompression: true });
try {
  const url = `http://127.0.0.1:${runtime.port}${siteBasePath}/`;
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Homepage render failed: ${response.status}`);
  }
  const html = await response.text();
  const rsc = await fetch(url, { headers: { RSC: '1', Accept: 'text/x-component' }, signal: AbortSignal.timeout(30000) });
  if (rsc.status !== 200 || !rsc.headers.get('content-type')?.includes('text/x-component')) {
    throw new Error(`RSC export failed: ${rsc.status}`);
  }
  await writeFile(path.join(stage, 'index.html'), html);
  await writeFile(path.join(stage, 'index.rsc'), new Uint8Array(await rsc.arrayBuffer()));
  await cp(path.join(client, siteBasePath.slice(1), '_next'), path.join(stage, '_next'), { recursive: true });
  await cp(path.join(root, 'public'), stage, { recursive: true });
} finally {
  await new Promise((resolve, reject) => {
    runtime.server.close((error) => error ? reject(error) : resolve());
    runtime.server.closeAllConnections();
  });
}

await checkStatic(stage);
// Replace only this project's generated client output, never a source directory.
if (await realpath(client) !== client || path.dirname(client) !== dist) throw new Error('Unsafe client output path');
await rm(client, { recursive: true });
await rename(stage, client);

const entries = {};
async function addFiles(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) await addFiles(full);
    else entries[`${siteBasePath.slice(1)}/${path.relative(client, full).split(path.sep).join('/')}`] = new Uint8Array(await readFile(full));
  }
}
await addFiles(client);
await mkdir(dist, { recursive: true });
await writeFile(path.join(dist, 'md2articlehtml.zip'), zipSync(entries));
console.log('\nReady: dist/client/index.html');
console.log('Upload dist/md2articlehtml.zip and extract into /home/project/www/');
