import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteBasePath, siteAssetPath, siteOrigin } from '../lib/site-path.ts';
import { brand } from '../lib/brand.ts';
import { startStaticServer } from './static-files.mjs';

export async function checkStatic(directory) {
  const html = await readFile(path.join(directory, 'index.html'), 'utf8');
  assert.ok(html.includes(`<title>${brand.title}</title>`), 'Incorrect brand title');
  assert.ok(html.includes(brand.name) && html.includes(brand.studio), 'Missing brand identity');
  assert.ok(html.includes(brand.label), 'Missing WeChat formatting label');
  assert.ok(!html.includes('墨格') && !html.includes('WECHAT STUDIO'), 'Old brand remains in the export');
  assert.match(html, /编辑器/);
  assert.match(html, /主题画廊/);
  assert.match(html, /<script/);
  assert.ok(html.includes('vinext.navigationRuntime'), 'Missing hydration payload');
  // Metadata must not resolve against the framework's localhost default.
  assert.ok(!html.includes('http://localhost'), 'Metadata still points at localhost; check SITE_ORIGIN');
  assert.ok(html.includes(siteOrigin), 'Missing configured site origin in metadata');
  const assets = new Set([siteAssetPath('og.png'), siteAssetPath('favicon.svg'), siteAssetPath('index.rsc')]);
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const value = match[1];
    if (value.startsWith('/')) {
      assert.ok(value.startsWith(`${siteBasePath}/`), `Unprefixed asset: ${value}`);
      assets.add(value);
    }
  }
  assert.ok([...assets].some((asset) => asset.endsWith('.js')), 'Missing JavaScript entry');
  assert.ok([...assets].some((asset) => asset.endsWith('.css')), 'Missing stylesheet');
  // Check all split chunks too, not only the ones referenced by the HTML shell.
  async function collect(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) await collect(fullPath);
      else {
        assert.ok((await stat(fullPath)).size > 0 || fullPath.endsWith('.js'));
        assets.add(siteAssetPath(path.relative(directory, fullPath).split(path.sep).join('/')));
      }
    }
  }
  await collect(path.join(directory, '_next'));
  const preview = await startStaticServer(directory);
  try {
    const page = await fetch(preview.url);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), html);
    const redirect = await fetch(preview.url.slice(0, -1), { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), `${siteBasePath}/`);
    for (const asset of assets) {
      const response = await fetch(new URL(asset, preview.url));
      assert.equal(response.status, 200, `Missing asset: ${asset}`);
      if (asset.endsWith('.js')) assert.match(response.headers.get('content-type'), /javascript/);
      if (asset.endsWith('.css')) assert.match(response.headers.get('content-type'), /text\/css/);
      await response.arrayBuffer();
    }
    const missing = await fetch(`${preview.url}missing-file.js`);
    assert.equal(missing.status, 404, 'Missing files must not return the HTML shell');
    await missing.text();
  } finally { await preview.close(); }
  reportCspRequirements(html);
  console.log(`Static export verified: homepage and ${assets.size} resources under ${siteBasePath}/`);
}

/**
 * The export ships inline hydration scripts and inline style attributes, so a hosting
 * header of `default-src 'self'` breaks the app. Print what the deployment must allow
 * so the requirement stays visible instead of failing only in production.
 */
function reportCspRequirements(html) {
  const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? []).length;
  const inlineStyles = (html.match(/\sstyle="/g) ?? []).length;
  const externalImages = (html.match(/(?:src|href)="https?:\/\//g) ?? []).length;
  console.log(
    `CSP requirements: ${inlineScripts} inline script(s), ${inlineStyles} inline style attribute(s)` +
      `${externalImages ? `, ${externalImages} external URL(s)` : ''}` +
      ` — hosting must allow 'unsafe-inline' for script-src and style-src, plus https: for img-src and connect-src.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkStatic(fileURLToPath(new URL('../dist/client/', import.meta.url)));
}
