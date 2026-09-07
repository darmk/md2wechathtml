import assert from 'node:assert/strict';
import test from 'node:test';
import { brand } from '../lib/brand.ts';

await test('brand keeps Wenxu and darmk Studio with a WeChat-specific positioning', () => {
  assert.equal(brand.name, '文序');
  assert.equal(brand.studio, 'darmk Studio');
  assert.equal(brand.label, '公众号排版美化');
  assert.equal(brand.title, `${brand.name} · ${brand.label}工具 | ${brand.studio}`);
  assert.ok(brand.description.includes('微信公众号'));
  assert.ok(!brand.title.includes('多平台'));
});
