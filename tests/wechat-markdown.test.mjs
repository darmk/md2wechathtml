import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { buildWechatHtml, defaultSettings, themes, codeThemes } from '../lib/wechat-markdown.ts';
import { createRichTextCopyFrame } from '../lib/clipboard.ts';

const dom = new JSDOM('');
global.window = dom.window;
global.DOMParser = dom.window.DOMParser;
after(() => {
  dom.window.close();
  delete global.window;
  delete global.DOMParser;
});

function render(markdown, settings = {}, navigation = false) {
  const html = buildWechatHtml(markdown, { ...defaultSettings, ...settings }, navigation);
  return { html, root: new DOMParser().parseFromString(html, 'text/html').body.firstElementChild };
}

const inlineList = '### 优先动画 Transform 和 Opacity\n\n一般情况下，优先使用：\n\n- `x`、`y`、`scale`、`rotate`；\n- `opacity`；\n- SVG 的 Transform 与绘制属性。\n\n谨慎高频修改：\n\n- `width`、`height`；\n- `top`、`left`；\n- `margin`、`padding`；';

void test('all themes keep inline code and punctuation in one list text container', () => {
  for (const theme of Object.keys(themes)) {
    const { root } = render(inlineList, { theme });
    assert.equal(root.querySelectorAll('code').length, 0, theme);
    const items = [...root.querySelectorAll('li')];
    assert.equal(items.length, 6, theme);
    assert.equal(items[0].textContent, 'x、y、scale、rotate；');
    assert.equal(items[3].textContent, 'width、height；');
    for (const item of items) {
      assert.equal(item.childElementCount, 1, theme);
      assert.equal(item.firstElementChild.tagName, 'SECTION');
      assert.equal(item.firstElementChild.style.display, 'inline');
      assert.equal(item.style.display, 'list-item');
      assert.equal(item.querySelector('br'), null);
      for (const code of item.querySelectorAll('span')) {
        assert.equal(code.style.display, 'inline');
        assert.equal(code.style.whiteSpace, 'normal');
        assert.ok(code.style.backgroundColor);
      }
    }
    assert.equal(root.querySelector('ul').style.listStyleType, 'disc');
    assert.equal(root.querySelector('ul').style.listStylePosition, 'outside');
  }
});

void test('all themes keep bold list labels and following colons/body text inline', () => {
  const markdown = '可以用一个简单判断：\n\n- **一个状态变化**：先用 CSS；\n- **几个 DOM 元素的可控动画**：Anime.js 很合适；\n- **大量 SVG、文字、布局和交互要统一**：优先评估 Anime.js；\n- **重度滚动叙事、复杂插件与专业动效生产线**：同时评估 GSAP；\n- **动画完全由组件状态驱动**：对比框架原生或框架专用方案。';
  for (const theme of Object.keys(themes)) {
    const { html, root } = render(markdown, { theme });
    assert.equal(root.querySelectorAll('li').length, 5);
    assert.equal(root.querySelector('li strong, li b'), null);
    assert.equal(root.querySelector('li').textContent, '一个状态变化：先用 CSS；');
    for (const item of root.querySelectorAll('li')) {
      const run = item.firstElementChild;
      assert.equal(item.childElementCount, 1);
      assert.equal(run.tagName, 'SECTION');
      assert.equal(run.style.display, 'inline');
      assert.equal(run.firstElementChild.tagName, 'SPAN');
      assert.equal(run.firstElementChild.style.fontWeight, '700');
      assert.equal(run.firstElementChild.style.display, 'inline');
      assert.equal(run.firstElementChild.style.whiteSpace, 'normal');
      assert.ok(run.firstElementChild.nextSibling.textContent.startsWith('：'));
      assert.equal(item.querySelector('br,p'), null);
    }
    assert.equal(root.outerHTML, html);
  }
});

void test('mixed list emphasis keeps links, footnotes and explicit line/paragraph breaks', () => {
  const { root } = render('- **加粗 *斜体* `code`**：[文档](https://example.com/docs) 与 ~~删除~~。  \n  手动换行\n\n  独立段落');
  const item = root.querySelector('li');
  assert.equal(item.querySelector('strong,em,del,code'), null);
  assert.ok([...item.querySelectorAll('span')].some(el => el.style.fontWeight === '700'));
  assert.ok([...item.querySelectorAll('span')].some(el => el.style.fontStyle === 'italic'));
  assert.ok([...item.querySelectorAll('span')].some(el => el.style.textDecoration === 'line-through'));
  assert.equal(item.querySelector('a').getAttribute('href'), 'https://example.com/docs');
  assert.equal(item.querySelector('a').style.display, 'inline');
  assert.equal(item.querySelector('sup').textContent, '[1]');
  assert.equal(item.querySelectorAll('br').length, 1);
  assert.equal(item.querySelectorAll(':scope > p').length, 2);
  assert.ok(root.textContent.includes('参考链接'));
  assert.ok(render('正文 **加粗** 与 *斜体*').root.querySelector('p > strong'));
});

void test('nested lists, ordered starts and loose paragraphs retain their structure', () => {
  const { root } = render('3. **第一项** `a`\n   - 子项 `b`\n     - 孙项 `c`\n4. 第二项\n\n   另一个段落\n\n   ```js\n   const a = 1;\n   ```');
  assert.equal(root.querySelector('ol').getAttribute('start'), '3');
  assert.equal(root.querySelector('ol').style.listStyleType, 'decimal');
  assert.equal(root.querySelectorAll('li').length, 4);
  assert.ok(root.querySelector('ol > li > ul > li > ul > li'));
  assert.equal(root.querySelector('ul').style.listStyleType, 'circle');
  assert.ok(root.querySelector('li > pre > code'));
  assert.ok(root.querySelector('li > p'));
  assert.equal(root.querySelector('li > section > pre'), null);
});

void test('image captions produce valid paragraph HTML after clipboard reparsing', () => {
  const { html, root } = render('开头 ![说明](https://example.com/image.png) 后面的文字\n\n![第二张](https://example.com/other.png)');
  assert.equal(root.querySelectorAll('p').length, 2);
  assert.equal(root.querySelectorAll('p p').length, 0);
  assert.equal(root.querySelectorAll('img + span').length, 2);
  assert.equal(root.querySelector('img + span').style.display, 'block');
  assert.ok(root.textContent.includes('后面的文字'));
  assert.equal(root.outerHTML, html, 'serialization must not introduce empty/extra paragraphs');
  assert.equal(render('![说明](https://example.com/image.png)', { showImageCaption: false }).root.querySelector('img + span'), null);
});

void test('copied article keeps the canvas white without painting ordinary text or images', () => {
  const { root } = render('普通段落\n\n![配图](https://example.com/image.png)\n\n> 引用内容');
  const ordinaryParagraphs = [...root.querySelectorAll('p')].filter((paragraph) => !paragraph.closest('blockquote'));
  assert.equal(root.style.backgroundColor, 'rgb(255, 255, 255)');
  assert.ok(ordinaryParagraphs.length >= 2);
  ordinaryParagraphs.forEach((paragraph) => assert.equal(paragraph.style.backgroundColor, 'transparent'));
  assert.equal(root.querySelector('img').style.backgroundColor, 'transparent');
  assert.equal(root.querySelector('img + span').style.backgroundColor, 'transparent');
  assert.notEqual(root.querySelector('blockquote').style.backgroundColor, 'transparent', 'intentional theme surfaces must remain');
});

void test('legacy rich-text copying is isolated from the application canvas background', () => {
  const ownerDocument = dom.window.document;
  ownerDocument.body.style.backgroundColor = 'rgb(243, 240, 233)';
  const copyFrame = createRichTextCopyFrame(ownerDocument, '<section style="background-color:#ffffff"><p style="background-color:transparent">正文</p></section>');
  try {
    assert.equal(copyFrame.document.body.style.backgroundColor, 'rgb(255, 255, 255)');
    assert.equal(copyFrame.holder.style.backgroundColor, 'rgb(255, 255, 255)');
    assert.equal(copyFrame.holder.querySelector('p').style.backgroundColor, 'transparent');
    assert.equal(copyFrame.holder.textContent, '正文');
  } finally {
    copyFrame.frame.remove();
    ownerDocument.body.style.backgroundColor = '';
  }
});

void test('quote paragraphs retain separation and remove only the trailing gap', () => {
  const { root } = render('> 第一段\n>\n> 第二段\n\n> [!TIP]\n> 建议正文');
  const paragraphs = root.querySelector('blockquote').querySelectorAll('p');
  assert.equal(paragraphs[0].style.marginBottom, '0.65em');
  assert.equal(paragraphs[1].style.marginBottom, '0px');
  const tip = root.querySelectorAll('blockquote')[1];
  assert.equal(tip.firstElementChild.textContent, '建议');
  assert.equal(tip.firstElementChild.style.marginBottom, '0.35em');
  assert.equal(tip.lastElementChild.style.marginBottom, '0px');
});

void test('all themes and heading styles preserve navigation, block layout and emphasis contrast', () => {
  for (const theme of Object.keys(themes)) {
    for (const headingStyle of ['left-border', 'underline', 'label', 'plain']) {
      const { root } = render('## **标题一**\n\n## 标题二', { theme, headingStyle }, true);
      const headings = [...root.querySelectorAll('h2')];
      assert.equal(headings.length, 2);
      assert.deepEqual(headings.map(h => h.dataset.outlineIndex), ['0', '1']);
      assert.equal(root.querySelector('strong').style.color, 'inherit');
      if (headingStyle === 'label') {
        assert.equal(headings[0].style.display, 'block');
        assert.equal(headings[0].firstElementChild.tagName, 'SPAN');
        assert.equal(headings[0].firstElementChild.style.color, 'rgb(255, 255, 255)');
      }
    }
  }
  assert.ok(!render('## 标题').html.includes('data-outline-index'));
});

void test('table alignment survives sanitizing and font styles do not depend on host CSS', () => {
  const { root } = render('| 左 | 中 | 右 |\n| :--- | :---: | ---: |\n| `a` | b | c |');
  assert.deepEqual([...root.querySelectorAll('th')].map(cell => cell.style.textAlign), ['left', 'center', 'right']);
  assert.deepEqual([...root.querySelectorAll('td')].map(cell => cell.style.textAlign), ['left', 'center', 'right']);
  assert.ok([...root.querySelectorAll('th,td')].every(cell => cell.style.fontSize === '14px'));
});

void test('all code themes retain highlighted colors, whitespace and block code independently of inline code', () => {
  const source = 'const x = "value";\n\n  console.log(x);\n';
  for (const codeTheme of Object.keys(codeThemes)) {
    for (const wrapLongCode of [true, false]) {
      const { root } = render('`inline`\n\n```js\n' + source + '```', { codeTheme, wrapLongCode });
      const code = root.querySelector('pre > code');
      assert.equal(code.textContent, source);
      assert.equal(code.style.display, 'block');
      assert.equal(code.style.padding, '0px');
      assert.equal(code.style.backgroundColor, 'transparent');
      assert.equal(code.parentElement.style.whiteSpace, wrapLongCode ? 'pre-wrap' : 'pre');
      assert.ok(new Set([...code.querySelectorAll('span')].map(token => token.style.color)).size > 1);
      assert.ok([...code.querySelectorAll('span')].every(token => token.style.display === 'inline'));
      assert.equal(root.querySelectorAll('code').length, 1);
      assert.equal(root.querySelector('[class]'), null);
    }
  }
});

void test('compatibility changes retain sanitization and local-image placeholders', () => {
  const { root, html } = render('<script>alert(1)</script>\n\n<span onclick="alert(1)">安全正文</span>\n\n![本地图片](assets/local.png)\n\n[危险链接](javascript:alert)');
  assert.equal(root.querySelector('script,[onclick],a[href]'), null);
  assert.ok(root.textContent.includes('[图片：本地图片]'));
  assert.ok(!html.includes('data-preserve-style'));
});
