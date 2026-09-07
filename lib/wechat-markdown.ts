import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import nginx from 'highlight.js/lib/languages/nginx';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked, Renderer } from 'marked';

import {
  themes,
  resolveArticleTheme,
  type PaletteId,
  themeCategories,
  type ArticleTheme,
  type ThemeCategory,
  type ThemeId,
} from './article-themes.ts';
import {
  codeThemes,
  type CodeTheme,
  type CodeThemeId,
} from './code-themes.ts';
import { extractLocalImageReferences } from './local-images.ts';

export { codeThemes, themes, themeCategories };
export type { CodeThemeId, ThemeCategory, ThemeId };

const languageDefinitions: Array<[
  string,
  Parameters<typeof hljs.registerLanguage>[1],
  string[],
]> = [
  ['javascript', javascript, ['js', 'jsx']],
  ['typescript', typescript, ['ts', 'tsx']],
  ['java', java, []],
  ['python', python, ['py']],
  ['go', go, ['golang']],
  ['rust', rust, ['rs']],
  ['cpp', cpp, ['c', 'c++', 'cc', 'hpp']],
  ['csharp', csharp, ['cs', 'c#']],
  ['kotlin', kotlin, ['kt']],
  ['swift', swift, []],
  ['php', php, []],
  ['sql', sql, []],
  ['bash', bash, ['sh', 'shell', 'zsh']],
  ['json', json, []],
  ['yaml', yaml, ['yml']],
  ['xml', xml, ['html', 'svg']],
  ['css', css, []],
  ['dockerfile', dockerfile, ['docker']],
  ['nginx', nginx, []],
];

for (const [name, definition, aliases] of languageDefinitions) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, definition);
  if (aliases.length) hljs.registerAliases(aliases, { languageName: name });
}

export type EditorSettings = {
  theme: ThemeId;
  fontSize: number;
  lineHeight: number;
  headingStyle: 'theme' | 'left-border' | 'underline' | 'label' | 'plain';
  palette?: PaletteId;
  codeTheme: CodeThemeId;
  codeFontSize: number;
  showCodeLanguage: boolean;
  autoDetectLanguage: boolean;
  wrapLongCode: boolean;
  showImageCaption: boolean;
  footnoteLinks: boolean;
};

export const defaultSettings: EditorSettings = {
  theme: 'apple',
  fontSize: 16,
  lineHeight: 1.8,
  headingStyle: 'theme',
  palette: 'original',
  codeTheme: 'github-dark',
  codeFontSize: 13,
  showCodeLanguage: true,
  autoDetectLanguage: true,
  wrapLongCode: true,
  showImageCaption: true,
  footnoteLinks: true,
};

const allowedTags = new Set([
  'SECTION', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'B', 'EM',
  'DEL', 'S', 'A', 'IMG', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'BR', 'SUP', 'SPAN',
]);

const languageLabels: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', python: 'Python',
  go: 'Go', rust: 'Rust', cpp: 'C / C++', csharp: 'C#', kotlin: 'Kotlin',
  swift: 'Swift', php: 'PHP', sql: 'SQL', bash: 'Shell', json: 'JSON',
  yaml: 'YAML', xml: 'HTML / XML', css: 'CSS', dockerfile: 'Dockerfile', nginx: 'Nginx',
};

export function buildWechatHtml(markdown: string, settings: EditorSettings, navigation = false): string {
  if (typeof window === 'undefined') return '';
  const renderer = new Renderer();
  let headingIndex = 0;
  if (navigation) renderer.heading = function ({ depth, tokens }) {
    return `<h${depth} data-outline-index="${headingIndex++}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  };
  const raw = marked.parse(
    markdown || '在左侧输入 Markdown，预览会实时出现在这里。',
    { gfm: true, breaks: false, renderer },
  ) as string;
  const parser = new DOMParser();
  const document = parser.parseFromString(`<section>${raw}</section>`, 'text/html');
  const root = document.body.firstElementChild as HTMLElement;
  sanitize(document, root);
  const theme = resolveArticleTheme(settings.theme, settings.palette);
  const codeTheme = codeThemes[settings.codeTheme] ?? codeThemes['github-dark'];

  root.setAttribute(
    'style',
    `box-sizing:border-box;max-width:100%;margin:0;padding:0;background-color:#ffffff;color:${theme.text};font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif;font-size:${settings.fontSize}px;line-height:${settings.lineHeight};letter-spacing:.02em;text-align:left;text-indent:0;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;`,
  );

  highlightCodeBlocks(document, root, settings, codeTheme);
  addImageCaptions(document, root, settings, theme);
  addLinkFootnotes(document, root, settings, theme);
  wrapTables(document, root);
  decorateCallouts(document, root, theme);

  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const tag = element.tagName;
    const base = 'box-sizing:border-box;max-width:100%;';
    if (tag === 'P' && !element.dataset.preserveStyle) {
      element.style.cssText += `${base}margin:0 0 ${theme.paragraphSpacing}em;padding:0;background-color:transparent;color:${theme.text};font-size:${settings.fontSize}px;line-height:${settings.lineHeight};`;
    }
    if (tag === 'H1') {
      const border = theme.h1Border === 'bottom'
        ? `border-bottom:2px solid ${theme.accent};`
        : theme.h1Border === 'top-bottom'
          ? `border-top:3px solid ${theme.accent};border-bottom:1px solid ${theme.border};`
          : '';
      element.style.cssText += `${base}margin:0 0 1.3em;padding:${theme.h1Border === 'top-bottom' ? '.65em 0' : '0 0 .55em'};${border}color:${theme.text};font-family:${theme.titleFont};font-size:${settings.fontSize + theme.h1SizeOffset}px;line-height:1.35;font-weight:${theme.headingWeight};text-align:${theme.h1Align};letter-spacing:${settings.theme === 'apple' ? '-.025em' : '.035em'};`;
    }
    if (tag === 'H2') element.style.cssText += `${base}${headingStyle(settings.headingStyle, theme, settings.fontSize + 4)}margin:1.8em 0 .85em;line-height:1.45;font-family:${theme.titleFont};font-weight:${theme.headingWeight};`;
    if (tag === 'H3') element.style.cssText += `${base}margin:1.5em 0 .7em;padding:0;color:${theme.accent};font-family:${theme.titleFont};font-size:${settings.fontSize + 2}px;line-height:1.5;font-weight:${theme.headingWeight};`;
    if (tag === 'H4' || tag === 'H5' || tag === 'H6') element.style.cssText += `${base}margin:1.25em 0 .6em;padding:0;color:${theme.text};font-size:${settings.fontSize}px;line-height:1.5;font-weight:${theme.headingWeight};`;
    if (tag === 'STRONG' || tag === 'B') element.style.cssText += `display:inline;color:${element.closest('h1,h2,h3,h4,h5,h6') ? 'inherit' : theme.accent};font-weight:700;white-space:normal;`;
    if (tag === 'EM') element.style.cssText += 'display:inline;font-style:italic;white-space:normal;';
    if (tag === 'A') element.style.cssText += `display:inline;color:${theme.accent};text-decoration:none;border-bottom:1px solid ${theme.border};white-space:normal;overflow-wrap:anywhere;`;
    if (tag === 'UL' || tag === 'OL') {
      const nested = !!element.parentElement?.closest('li');
      element.style.cssText += `${base}margin:.4em 0 ${nested ? '.35' : '1.1'}em;padding:0 0 0 1.55em;color:${theme.text};font-size:${settings.fontSize}px;line-height:${settings.lineHeight};list-style-type:${tag === 'OL' ? 'decimal' : nested ? 'circle' : 'disc'};list-style-position:outside;text-align:left;`;
    }
    if (tag === 'LI') element.style.cssText += `${base}display:list-item;margin:.35em 0;padding:0 0 0 .15em;color:${theme.text};font-size:${settings.fontSize}px;line-height:${settings.lineHeight};text-align:left;`;
    if (tag === 'BLOCKQUOTE') element.style.cssText += `${base}margin:1.25em 0;padding:1em 1.1em;border-left:4px solid ${theme.accent};background:${theme.quote};color:${theme.text};border-radius:0 ${theme.quoteRadius}px ${theme.quoteRadius}px 0;`;
    if (tag === 'PRE') {
      const hasLabel = element.previousElementSibling?.getAttribute('data-code-label') === 'true';
      element.style.cssText += `${base}margin:${hasLabel ? '.45em' : '1.2em'} 0 1.2em;padding:14px 15px;border:1px solid ${codeTheme.border};border-radius:8px;background:${codeTheme.background};color:${codeTheme.foreground};font-size:${settings.codeFontSize}px;line-height:1.65;white-space:${settings.wrapLongCode ? 'pre-wrap' : 'pre'};word-break:${settings.wrapLongCode ? 'break-word' : 'normal'};overflow-x:auto;`;
    }
    if (tag === 'CODE' && !element.closest('pre')) element.style.cssText += `display:inline;margin:0 .15em;padding:.1em .3em;border:1px solid ${theme.border};border-radius:3px;background-color:${theme.soft};color:${theme.accent};font-family:Consolas,Monaco,monospace;font-size:.88em;line-height:inherit;white-space:normal;word-break:break-word;overflow-wrap:break-word;`;
    if (tag === 'CODE' && element.parentElement?.tagName === 'PRE') element.style.cssText += `display:block;margin:0;padding:0;border:0;border-radius:0;background-color:transparent;font-family:Consolas,Monaco,"Courier New",monospace;font-size:${settings.codeFontSize}px;line-height:inherit;white-space:inherit;word-break:inherit;letter-spacing:0;text-align:left;`;
    if (tag === 'IMG') element.style.cssText += 'display:block;width:auto;max-width:100%;height:auto;margin:1.3em auto .45em;border:0;border-radius:8px;background-color:transparent;';
    if (tag === 'TABLE') element.style.cssText += `width:100%;max-width:100%;margin:0;border-collapse:collapse;border-spacing:0;font-size:${Math.max(12, settings.fontSize - 2)}px;table-layout:fixed;`;
    if (tag === 'TH' || tag === 'TD') element.style.cssText += `padding:8px 7px;border:1px solid ${theme.border};${tag === 'TH' ? `background-color:${theme.soft};font-weight:700;` : ''}color:${theme.text};font-size:${Math.max(12, settings.fontSize - 2)}px;line-height:${settings.lineHeight};text-align:${element.getAttribute('align') || 'left'};vertical-align:top;word-break:break-word;`;
    if (tag === 'HR') element.style.cssText += `height:1px;margin:2em 0;border:0;background:${theme.border};`;
    if (tag === 'DEL' || tag === 'S') element.style.cssText += `display:inline;color:${theme.muted};text-decoration:line-through;white-space:normal;`;
    if (tag === 'SUP') element.style.cssText += `margin-left:2px;color:${theme.accent};font-size:10px;`;
  });

  normalizeWechatStructure(document, root, settings, theme);
  applyThemeStructure(root, theme);
  root.querySelectorAll('[class]').forEach((element) => element.removeAttribute('class'));
  root.querySelectorAll('[data-preserve-style]').forEach((element) => element.removeAttribute('data-preserve-style'));
  root.querySelectorAll('[data-code-label]').forEach((element) => element.removeAttribute('data-code-label'));
  return root.outerHTML;
}

export function countLocalImages(markdown: string) {
  return extractLocalImageReferences(markdown).length;
}

function normalizeWechatStructure(document: Document, root: HTMLElement, settings: EditorSettings, theme: ArticleTheme) {
  // Inline code is text decoration, not an editor-native code block. Using a
  // span avoids the receiving editor's special handling of <code> inside lists.
  root.querySelectorAll<HTMLElement>('code').forEach((code) => {
    if (code.closest('pre')) return;
    const inline = document.createElement('span');
    inline.style.cssText = code.style.cssText;
    inline.append(...Array.from(code.childNodes));
    code.replaceWith(inline);
  });

  // Lists need the same protection for emphasis as for inline code. Keep the
  // appearance on spans rather than exposing editor-native formatting tags
  // that may split a list item before its trailing punctuation/body text.
  // Links stay links, and structural paragraphs / explicit breaks stay intact.
  root.querySelectorAll<HTMLElement>('li strong, li b, li em, li del, li s').forEach((emphasis) => {
    if (emphasis.closest('pre')) return;
    const inline = document.createElement('span');
    inline.style.cssText = emphasis.style.cssText;
    inline.append(...Array.from(emphasis.childNodes));
    emphasis.replaceWith(inline);
  });

  // Keep each run of list text/formatting together. Do not flatten nested lists,
  // loose paragraphs or code blocks, which have their own structural meaning.
  const phrasingTags = new Set(['SPAN', 'STRONG', 'B', 'EM', 'DEL', 'S', 'A', 'IMG', 'BR', 'SUP']);
  root.querySelectorAll<HTMLElement>('li').forEach((item) => {
    let run: HTMLElement | null = null;
    for (const node of Array.from(item.childNodes)) {
      if (node.nodeType === 3 || phrasingTags.has(node.nodeName)) {
        if (!run && node.nodeType === 3 && !node.textContent?.trim()) continue;
        if (!run) {
          run = document.createElement('section');
          run.style.cssText = `display:inline;margin:0;padding:0;color:${theme.text};font-size:${settings.fontSize}px;line-height:${settings.lineHeight};text-align:left;`;
          item.insertBefore(run, node);
        }
        run.appendChild(node);
      } else {
        run = null;
      }
    }
    item.querySelectorAll<HTMLElement>(':scope > p').forEach((paragraph) => {
      paragraph.style.marginBottom = paragraph === item.lastElementChild ? '0' : '.55em';
    });
  });

  // Apply spacing after all paragraph styles, not before they are overwritten.
  root.querySelectorAll<HTMLElement>('blockquote').forEach((quote) => {
    quote.querySelectorAll<HTMLElement>(':scope > p').forEach((paragraph) => {
      if (paragraph.dataset.preserveStyle) return;
      paragraph.style.marginBottom = '.65em';
    });
    const last = quote.lastElementChild as HTMLElement | null;
    if (last) last.style.marginBottom = '0';
  });

  if (settings.headingStyle === 'label') {
    root.querySelectorAll<HTMLElement>('h2').forEach((heading) => {
      // Keep the heading itself block-level so consecutive labels never share
      // a line. Place the colored badge inside, with inherited emphasis color.
      const badge = document.createElement('span');
      badge.style.cssText = `display:inline-block;max-width:100%;padding:.28em .7em;background-color:${theme.accent};color:#fff;border-radius:4px;line-height:inherit;`;
      badge.append(...Array.from(heading.childNodes));
      heading.appendChild(badge);
    });
  }
}

function highlightCodeBlocks(
  document: Document,
  root: HTMLElement,
  settings: EditorSettings,
  codeTheme: CodeTheme,
) {
  root.querySelectorAll<HTMLElement>('pre > code').forEach((code) => {
    const requested = normalizeLanguage(code.className.match(/language-([^\s]+)/)?.[1] ?? '');
    const source = code.textContent ?? '';
    let language = requested;
    let highlighted = '';
    try {
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(source, { language, ignoreIllegals: true }).value;
      } else if (settings.autoDetectLanguage) {
        const result = hljs.highlightAuto(source);
        highlighted = result.value;
        language = result.language ?? '';
      }
    } catch {
      highlighted = '';
    }
    if (highlighted) code.innerHTML = highlighted;
    code.style.color = codeTheme.foreground;

    code.querySelectorAll<HTMLElement>('span').forEach((token) => {
      const color = tokenColor(token.className, codeTheme);
      token.style.cssText = `display:inline;color:${color};font-size:inherit;line-height:inherit;white-space:inherit;`;
      if (/hljs-(keyword|literal|title|section|built_in)/.test(token.className)) token.style.fontWeight = '600';
    });

    if (settings.showCodeLanguage && language) {
      const label = document.createElement('section');
      label.dataset.codeLabel = 'true';
      label.textContent = languageLabels[language] ?? language.toUpperCase();
      label.setAttribute('style', `box-sizing:border-box;display:inline-block;margin:1.2em 0 0;padding:3px 9px;border:1px solid ${codeTheme.border};border-radius:6px;background:${codeTheme.background};color:${codeTheme.gutter};font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.5;letter-spacing:.04em;`);
      code.parentElement?.parentNode?.insertBefore(label, code.parentElement);
    }
  });
}

function normalizeLanguage(language: string) {
  const aliases: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', golang: 'go', rs: 'rust', c: 'cpp', 'c++': 'cpp', cc: 'cpp',
    hpp: 'cpp', cs: 'csharp', 'c#': 'csharp', kt: 'kotlin', sh: 'bash',
    shell: 'bash', zsh: 'bash', yml: 'yaml', html: 'xml', svg: 'xml', docker: 'dockerfile',
  };
  const normalized = language.toLowerCase();
  return aliases[normalized] ?? normalized;
}

function tokenColor(className: string, theme: CodeTheme) {
  if (/hljs-(comment|quote)/.test(className)) return theme.tokens.comment;
  if (/hljs-(keyword|selector-tag|literal|section|link)/.test(className)) return theme.tokens.keyword;
  if (/hljs-(string|regexp|symbol|bullet)/.test(className)) return theme.tokens.string;
  if (/hljs-number/.test(className)) return theme.tokens.number;
  if (/hljs-(title|function)/.test(className)) return theme.tokens.function;
  if (/hljs-(type|built_in|class)/.test(className)) return theme.tokens.type;
  if (/hljs-(variable|template-variable|params)/.test(className)) return theme.tokens.variable;
  if (/hljs-(attr|attribute|property)/.test(className)) return theme.tokens.property;
  if (/hljs-(meta|doctag)/.test(className)) return theme.tokens.meta;
  if (/hljs-addition/.test(className)) return theme.tokens.addition;
  if (/hljs-deletion/.test(className)) return theme.tokens.deletion;
  return theme.foreground;
}

function sanitize(document: Document, root: HTMLElement) {
  root.querySelectorAll('script,style,iframe,object,embed,form,button,textarea,select,video,audio,svg,canvas').forEach((node) => node.remove());
  Array.from(root.querySelectorAll('*')).forEach((node) => {
    const element = node as HTMLElement;
    // Marked emits table alignment as inline CSS; preserve only this safe value.
    if (element.tagName === 'TH' || element.tagName === 'TD') {
      const align = element.style.textAlign || element.getAttribute('align') || '';
      if (/^(left|center|right)$/.test(align)) element.setAttribute('align', align);
      else element.removeAttribute('align');
    }
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on') || attribute.name === 'style') element.removeAttribute(attribute.name);
    });
    if (!allowedTags.has(element.tagName)) element.replaceWith(...Array.from(element.childNodes));
  });
  root.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    if (!/^(https?:|mailto:|#)/i.test(href)) anchor.removeAttribute('href');
    anchor.removeAttribute('target');
  });
  root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const src = image.getAttribute('src') ?? '';
    if (!/^(https?:|data:image\/|blob:)/i.test(src)) image.replaceWith(document.createTextNode(`[图片：${image.alt || src || '无可用地址'}]`));
  });
}

function headingStyle(style: EditorSettings['headingStyle'], theme: ArticleTheme, size: number) {
  const common = `color:${theme.text};font-size:${size}px;`;
  if (style === 'theme') {
    if (theme.layout === 'paper' || theme.layout === 'letter') return `${common}padding:.45em .65em;background-color:${theme.soft};border-radius:${theme.layout === 'letter' ? 10 : 3}px;`;
    if (theme.layout === 'swiss') return `${common}padding:.3em 0;border-top:2px solid ${theme.text};`;
    if (theme.layout === 'blueprint') return `${common}padding:.35em .6em;border:1px dashed ${theme.accent};color:${theme.accent};`;
    if (theme.layout === 'terminal') return `${common}padding:.4em .6em;border-left:3px solid ${theme.accent};background-color:${theme.soft};font-family:Consolas,monospace;`;
    if (theme.layout === 'column') return `${common}padding:0 0 .4em;border-bottom:1px solid ${theme.border};`;
    if (theme.layout === 'archive') return `${common}padding:.45em .65em;border:1px solid ${theme.border};border-left:4px solid ${theme.accent};`;
    if (theme.layout === 'geometric') return `${common}padding:.35em .65em;border-left:8px solid ${theme.accent};border-bottom:2px solid ${theme.accent2};background-color:${theme.soft};`;
    return headingStyle('left-border', theme, size);
  }
  if (style === 'left-border') return `${common}padding:.18em 0 .18em .65em;border-left:4px solid ${theme.accent};`;
  if (style === 'underline') return `${common}padding:0 0 .45em;border-bottom:2px solid ${theme.accent};`;
  if (style === 'label') return `${common}display:block;padding:0;`;
  return `${common}padding:0;`;
}

function applyThemeStructure(root: HTMLElement, theme: ArticleTheme) {
  root.querySelectorAll<HTMLElement>('h1').forEach((heading) => {
    if (theme.layout === 'paper') { heading.style.backgroundColor = theme.soft; heading.style.padding = '.85em .65em'; }
    if (theme.layout === 'blueprint') { heading.style.borderTop = `4px double ${theme.accent}`; heading.style.borderBottom = `4px double ${theme.accent}`; }
    if (theme.layout === 'geometric') { heading.style.borderBottom = `6px solid ${theme.accent2}`; }
  });
  root.querySelectorAll<HTMLElement>('blockquote').forEach((quote) => {
    if (theme.layout === 'archive' || theme.layout === 'blueprint') quote.style.border = `1px ${theme.layout === 'blueprint' ? 'dashed' : 'solid'} ${theme.border}`;
    if (theme.layout === 'column') { quote.style.borderLeft = '0'; quote.style.borderTop = `1px solid ${theme.border}`; quote.style.borderBottom = `1px solid ${theme.border}`; quote.style.backgroundColor = 'transparent'; }
    if (theme.layout === 'letter') { quote.style.border = `1px solid ${theme.border}`; quote.style.borderRadius = '12px'; }
    if (theme.layout === 'geometric') { quote.style.borderLeft = `5px solid ${theme.accent2}`; quote.style.borderRadius = '0'; }
  });
  root.querySelectorAll<HTMLElement>('hr').forEach((line) => {
    if (theme.layout === 'classic' || !theme.layout) return;
    line.style.backgroundColor = 'transparent';
    line.style.borderTop = `${theme.layout === 'geometric' ? '3px' : '1px'} ${theme.layout === 'blueprint' || theme.layout === 'letter' ? 'dashed' : 'solid'} ${theme.border}`;
    if (theme.layout === 'column' || theme.layout === 'paper') { line.style.width = '48px'; line.style.margin = '2em auto'; }
  });
}

function addImageCaptions(document: Document, root: HTMLElement, settings: EditorSettings, theme: ArticleTheme) {
  if (!settings.showImageCaption) return;
  root.querySelectorAll<HTMLImageElement>('img[alt]').forEach((image) => {
    if (!image.alt) return;
    // Keep the caption phrasing content: a nested <p> is reparsed into extra
    // paragraphs when copied, even if the in-memory preview appears correct.
    const caption = document.createElement('span');
    caption.dataset.preserveStyle = 'true';
    caption.textContent = image.alt;
    caption.setAttribute('style', `display:block;margin:0 0 .6em;background-color:transparent;text-align:center;color:${theme.muted};font-size:12px;line-height:1.6;`);
    image.parentNode?.insertBefore(caption, image.nextSibling);
  });
}

function addLinkFootnotes(document: Document, root: HTMLElement, settings: EditorSettings, theme: ArticleTheme) {
  if (!settings.footnoteLinks) return;
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((anchor) => !(anchor.getAttribute('href') ?? '').startsWith('#'));
  if (!links.length) return;
  const unique: string[] = [];
  links.forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    let index = unique.indexOf(href);
    if (index === -1) index = unique.push(href) - 1;
    const sup = document.createElement('sup');
    sup.textContent = `[${index + 1}]`;
    anchor.parentNode?.insertBefore(sup, anchor.nextSibling);
  });
  const footnotes = document.createElement('section');
  footnotes.setAttribute('style', `margin-top:2em;padding-top:1em;border-top:1px solid ${theme.border};color:${theme.muted};font-size:12px;line-height:1.7;`);
  const title = document.createElement('p');
  title.dataset.preserveStyle = 'true';
  title.textContent = '参考链接';
  title.setAttribute('style', `margin:0 0 .6em;color:${theme.text};font-weight:700;`);
  footnotes.appendChild(title);
  unique.forEach((href, index) => {
    const line = document.createElement('p');
    line.dataset.preserveStyle = 'true';
    line.textContent = `[${index + 1}] ${href}`;
    line.setAttribute('style', 'margin:.25em 0;word-break:break-all;');
    footnotes.appendChild(line);
  });
  root.appendChild(footnotes);
}

function wrapTables(document: Document, root: HTMLElement) {
  root.querySelectorAll('table').forEach((table) => {
    const wrapper = document.createElement('section');
    wrapper.setAttribute('style', 'box-sizing:border-box;width:100%;max-width:100%;margin:1.3em 0;overflow-x:auto;');
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function decorateCallouts(document: Document, root: HTMLElement, theme: ArticleTheme) {
  const labels: Record<string, string> = { NOTE: '说明', TIP: '建议', WARNING: '注意', IMPORTANT: '重要' };
  root.querySelectorAll('blockquote').forEach((quote) => {
    const match = quote.textContent?.trim().match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]/);
    if (!match) return;
    const first = quote.querySelector('p');
    if (first) first.innerHTML = first.innerHTML.replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/, '');
    const label = document.createElement('p');
    label.dataset.preserveStyle = 'true';
    label.textContent = labels[match[1]];
    label.setAttribute('style', `margin:0 0 .35em;color:${match[1] === 'WARNING' ? theme.accent2 : theme.accent};font-size:13px;font-weight:800;letter-spacing:.08em;`);
    quote.insertBefore(label, quote.firstChild);
  });
}
