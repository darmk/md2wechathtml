import assert from 'node:assert/strict';
import test from 'node:test';
import { marked } from 'marked';
import { themes } from '../lib/article-themes.ts';
import { readThemeLibrary, filterArticleThemes, galleryFullSample } from '../lib/theme-library.ts';

const empty = { favorites: [], recent: [] };
const validIds = Object.keys(themes);

test('saved favorites and recent records migrate without losing valid selections', () => {
  const saved = readThemeLibrary(JSON.stringify({ favorites: ['apple', 'apple', 'unknown', 1], recent: ['byte', 'apple'] }), validIds);
  assert.deepEqual(saved, { favorites: ['apple'], recent: ['byte', 'apple'] });
});

test('corrupt or null preference storage safely falls back to an empty library', () => {
  for (const value of ['{bad', 'null', 'false', '12', '{}', null]) assert.deepEqual(readThemeLibrary(value, validIds), empty);
});

test('recent history remains capped at eight themes', () => {
  assert.equal(readThemeLibrary(JSON.stringify({ recent: validIds }), validIds).recent.length, 8);
});

test('gallery search matches English names, Chinese descriptions and categories', () => {
  assert.deepEqual(filterArticleThemes(themes, 'all', '  APPLE  ', empty), ['apple', 'apple-paper']);
  assert.ok(filterArticleThemes(themes, 'all', '科技', empty).includes('byte'));
  assert.ok(filterArticleThemes(themes, 'all', '精致产品感', empty).includes('apple'));
  assert.deepEqual(filterArticleThemes(themes, 'all', 'no-such-theme-xyz', empty), []);
});

test('favorites and recent lists filter separately while preserving recent order', () => {
  const library = { favorites: ['apple'], recent: ['byte', 'apple'] };
  assert.deepEqual(filterArticleThemes(themes, 'favorites', '', library), ['apple']);
  assert.deepEqual(filterArticleThemes(themes, 'recent', '', library), ['byte', 'apple']);
  assert.deepEqual(filterArticleThemes(themes, 'recent', 'apple', library), ['apple']);
  assert.deepEqual(filterArticleThemes(themes, 'favorites', '', empty), []);
});

test('category and featured filters do not change the stored library', () => {
  const library = { favorites: ['apple'], recent: ['byte'] };
  const copy = JSON.stringify(library);
  assert.ok(filterArticleThemes(themes, 'tech', '', library).every((id) => themes[id].category === 'tech'));
  assert.ok(filterArticleThemes(themes, 'featured', '', library).every((id) => themes[id].recommended));
  assert.equal(JSON.stringify(library), copy);
});

test('full theme example covers actual article elements and three code languages', () => {
  const types = new Set();
  const languages = [];
  const depths = new Set();
  const md = galleryFullSample('http://localhost:3000/og.png');
  void marked.walkTokens(marked.lexer(md), (token) => {
    types.add(token.type);
    if (token.type === 'code') languages.push(token.lang);
    if (token.type === 'heading') depths.add(token.depth);
  });
  for (const type of ['heading', 'paragraph', 'strong', 'em', 'del', 'codespan', 'blockquote', 'list', 'table', 'image', 'link', 'hr']) assert.ok(types.has(type), type);
  assert.deepEqual(languages, ['typescript', 'python', 'sql']);
  assert.deepEqual([...depths], [1, 2, 3, 4]);
});
