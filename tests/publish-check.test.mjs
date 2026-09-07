import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePublishReadiness, isWebUrl } from '../lib/publish-check.ts';

const counts = (report) => Object.fromEntries(report.items.map((item) => [item.id, item.count]));
const wideTable = '| A | B | C | D |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |';

test('clean article passes all four checks', () => {
  const report = analyzePublishReadiness('# Title\n\n[Docs](https://example.com)\n\n```js\nconst ok = true;\n```', 0);
  assert.equal(report.score, 100);
  assert.equal(report.hasBlockingIssues, false);
  assert.deepEqual(counts(report), { images: 0, tables: 0, 'code-language': 0, links: 0 });
});

test('four-column table is a risk estimate and scores 92, not a blocker', () => {
  const report = analyzePublishReadiness(wideTable, 0);
  assert.equal(counts(report).tables, 1);
  assert.equal(report.score, 92);
  assert.equal(report.hasBlockingIssues, false);
});

test('combined findings count 2 images, 1 table, 3 code blocks and 1 link', () => {
  const md = [wideTable, '```\na\n```', '~~~\nb\n~~~', '```\nc\n```', '[bad](./private.md)'].join('\n\n');
  const report = analyzePublishReadiness(md, 2);
  assert.deepEqual(counts(report), { images: 2, tables: 1, 'code-language': 3, links: 1 });
  assert.equal(report.score, 53);
  assert.equal(report.hasBlockingIssues, false);
  assert.equal(report.warningCount, 7);
});

test('unresolved local images warn but do not block copying', () => {
  const unresolved = analyzePublishReadiness('Article', 2);
  assert.equal(unresolved.hasBlockingIssues, false);
  assert.equal(unresolved.items[0].severity, 'warning');
  assert.equal(unresolved.warningCount, 2);
  assert.equal(unresolved.score, 76);
  const ready = analyzePublishReadiness('Article', 0);
  assert.equal(ready.hasBlockingIssues, false);
  assert.equal(ready.warningCount, 0);
  assert.equal(ready.score, 100);
});

test('code examples are not counted as actual links or tables', () => {
  const md = '```md\n' + wideTable + '\n[bad](../example)\n```\n\n`[bad](../inline)`';
  assert.equal(analyzePublishReadiness(md, 0).score, 100);
});

test('reference-style links and adjacent links are checked individually', () => {
  const md = '[a][ref] [b]() [c](https://example.com)\n\n[ref]: ./local.md';
  assert.equal(counts(analyzePublishReadiness(md, 0)).links, 2);
});

test('invalid URL hosts, empty links and malformed email targets are detected', () => {
  const md = '[a](https://) [b](mailto:) [c]() [d](javascript:alert)';
  assert.equal(counts(analyzePublishReadiness(md, 0)).links, 4);
});

test('valid anchors, email addresses, URL titles and balanced URL parentheses pass', () => {
  const md = '[a](#section) [b](mailto:writer@example.com) [c](https://example.com/a_(b) "Title")';
  assert.equal(counts(analyzePublishReadiness(md, 0)).links, 0);
});

test('HTML anchors with quoted or unquoted href are checked', () => {
  const md = '<a href="./local">a</a> <a href=bad>b</a> <a href="https://example.com">c</a>';
  assert.equal(counts(analyzePublishReadiness(md, 0)).links, 2);
});

test('code blocks nested in blockquotes and indented code are recognized', () => {
  const md = '> ```\n> example\n> ```\n\n    indented code';
  assert.equal(counts(analyzePublishReadiness(md, 0))['code-language'], 2);
});

test('nonclosing fence text is not treated as a new block', () => {
  const md = '````js\n```\n[bad](./example)\n````';
  assert.equal(analyzePublishReadiness(md, 0).score, 100);
});

test('escaped table pipes do not increase column count', () => {
  const md = '| A \\| B | C |\n| --- | --- |\n| short | short |';
  assert.equal(counts(analyzePublishReadiness(md, 0)).tables, 0);
});

test('long unbroken table cell warns even in a two-column table', () => {
  const md = '| A | B |\n| --- | --- |\n| abcdefghijklmnopqrstuvwxyz | short |';
  assert.equal(counts(analyzePublishReadiness(md, 0)).tables, 1);
});

test('empty input cannot present a misleading perfect score', () => {
  const report = analyzePublishReadiness('  \n', 0);
  assert.equal(report.isEmpty, true);
  assert.equal(report.score, 0);
  assert.equal(report.hasBlockingIssues, true);
});

test('score stays in range and category penalties are capped', () => {
  const md = Array.from({ length: 30 }, () => wideTable + '\n\n```\nx\n```\n\n[a](./bad)').join('\n\n');
  const report = analyzePublishReadiness(md, 100);
  assert.equal(report.score, 15);
  assert.equal(report.hasBlockingIssues, false);
  assert.equal(analyzePublishReadiness('Content', -10).score, 100);
});

test('web image URL validation rejects missing hosts and embedded credentials', () => {
  for (const value of ['https://', 'blob:local', 'file:///a.png', 'https://a b.png', 'https://user:pass@example.com/a.png']) {
    assert.equal(isWebUrl(value), false, value);
  }
  assert.equal(isWebUrl('https://example.com/图.png'), true);
});
