import assert from 'node:assert/strict';
import test from 'node:test';
import { extractOutline, mapScrollPosition, previewGeometry, recentSelection, workspaceShortcut } from '../lib/workspace-tools.ts';

test('outline preserves heading depth, source offset and duplicate titles', () => {
  const md = '# Title\n\nBody\n\n## Same\n\ntext\n\n### Same\n';
  const headings = extractOutline(md);
  assert.deepEqual(headings.map(({ depth, text, line }) => ({ depth, text, line })), [
    { depth: 1, text: 'Title', line: 1 }, { depth: 2, text: 'Same', line: 5 }, { depth: 3, text: 'Same', line: 9 },
  ]);
  assert.equal(headings[2].offset, md.indexOf('### Same'));
});

test('code examples and escaped hashes do not become outline headings', () => {
  const md = '```md\n# Fake\n```\n\n    ## Fake\n\n\\# Escaped\n\n# Real';
  assert.deepEqual(extractOutline(md).map((h) => h.text), ['Real']);
});

test('setext headings and Windows newlines retain original source offsets', () => {
  const md = 'Intro\r\n\r\nTitle\r\n=====\r\n\r\n## End';
  const headings = extractOutline(md);
  assert.deepEqual(headings.map((h) => h.depth), [1, 2]);
  assert.equal(headings[0].offset, md.indexOf('Title'));
  assert.equal(headings[1].offset, md.indexOf('## End'));
});

test('headings inside blockquotes and lists map to the original source', () => {
  const md = '> ## Quote\n>\n> ```md\n> # Fake\n> ```\n>\n> ### Quote end\n\n- ## List\n\n  ### Nested\n\n# End';
  const headings = extractOutline(md);
  assert.deepEqual(headings.map((h) => h.text), ['Quote', 'Quote end', 'List', 'Nested', 'End']);
  for (const heading of headings) assert.equal(md.slice(heading.offset).startsWith('#'.repeat(heading.depth)), true, heading.text);
});

test('repeated headings after a fenced example locate the real heading', () => {
  const md = '> ```\n> ## Same\n> ```\n>\n> ## Same\n\n- ```\n  ## Again\n  ```\n\n  ## Again';
  const headings = extractOutline(md);
  assert.equal(headings[0].offset, md.lastIndexOf('## Same'));
  assert.equal(headings[1].offset, md.lastIndexOf('## Again'));
});

test('outline labels remove emphasis and inline links', () => {
  assert.equal(extractOutline('## **Bold** and [docs](https://example.com)')[0].text, 'Bold and docs');
  assert.deepEqual(extractOutline('No headings'), []);
});

test('scroll maps progress within heading sections, not whole-document ratios', () => {
  assert.equal(mapScrollPosition(150, [0, 100, 200, 400], [0, 400, 600, 900]), 500);
  assert.equal(mapScrollPosition(500, [0, 400, 600, 900], [0, 100, 200, 400]), 150);
});

test('scroll mapping clamps edges and handles empty or zero-height documents', () => {
  assert.equal(mapScrollPosition(-5, [0, 100], [0, 400]), 0);
  assert.equal(mapScrollPosition(300, [0, 100], [0, 400]), 400);
  assert.equal(mapScrollPosition(0, [0, 0], [0, 0]), 0);
  assert.equal(mapScrollPosition(10, [], []), 0);
});

test('PC fit scales a 760px canvas without horizontal overflow', () => {
  for (const available of [280, 375, 480, 720, 760, 1024, 1440]) {
    const geometry = previewGeometry(available, false, true);
    assert.equal(geometry.width, 760);
    assert.ok(geometry.renderedWidth <= available);
    assert.ok(geometry.scale <= 1);
  }
});

test('original size preserves 100% scale and reflows only on narrow screens', () => {
  assert.deepEqual(previewGeometry(1000, true, true), { width: 760, scale: 1, renderedWidth: 760 });
  assert.deepEqual(previewGeometry(320, true, true), { width: 320, scale: 1, renderedWidth: 320 });
  assert.equal(previewGeometry(320, false, false).renderedWidth, 320);
});

test('recent theme selections are deduplicated, newest first and capped at eight', () => {
  assert.deepEqual(recentSelection(['apple', 'byte'], 'byte'), ['byte', 'apple']);
  assert.deepEqual(recentSelection(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'new'), ['new', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
});

const key = (letter, overrides = {}) => ({ key: letter, ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, ...overrides });
test('all seven shortcuts work for Ctrl and Command', () => {
  for (const [letter, action] of Object.entries({ o: 'import', c: 'copy', p: 'preview', f: 'focus', l: 'editor', r: 'settings', k: 'help' })) {
    assert.equal(workspaceShortcut(key(letter)), action);
    assert.equal(workspaceShortcut(key(letter, { ctrlKey: false, metaKey: true })), action);
  }
});

test('shortcuts do not hijack regular copy, text composition or repeat events', () => {
  assert.equal(workspaceShortcut(key('c', { shiftKey: false })), null);
  assert.equal(workspaceShortcut(key('c', { ctrlKey: false })), null);
  assert.equal(workspaceShortcut(key('c', { isComposing: true })), null);
  assert.equal(workspaceShortcut(key('c', { repeat: true })), null);
  assert.equal(workspaceShortcut(key('c', { altKey: true })), null);
  assert.equal(workspaceShortcut(key('x')), null);
});
