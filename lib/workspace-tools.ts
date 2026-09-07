import { marked, type Token, type Tokens } from 'marked';

export type OutlineHeading = { index: number; depth: number; text: string; offset: number; line: number };

// Map container text back to its source, including Markdown quote/list prefixes.
function sourceMap(text: string, source: string, positions: number[]) {
  let cursor = 0;
  return Array.from({ length: text.length }, (_, index) => {
    const found = source.indexOf(text[index], cursor);
    if (found >= 0) cursor = found + 1;
    return positions[Math.max(0, cursor - 1)] ?? 0;
  });
}

export function extractOutline(markdown: string): OutlineHeading[] {
  const result: OutlineHeading[] = [];
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const positions = sourceMap(normalized, markdown, Array.from({ length: markdown.length }, (_, i) => i));
  function visit(tokens: Token[], source: string, map: number[]) {
    let cursor = 0;
    for (const token of tokens) {
      const start = Math.max(cursor, source.indexOf(token.raw, cursor));
      cursor = start + token.raw.length;
      const rawMap = map.slice(start, cursor);
      if (token.type === 'heading') {
        const heading = token as Tokens.Heading;
        const offset = rawMap[0] ?? 0;
        result.push({
          index: result.length, depth: heading.depth,
          text: heading.text.replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>|[*_`~]/g, ''),
          offset, line: markdown.slice(0, offset).split('\n').length,
        });
      } else if (token.type === 'blockquote') {
        const quote = token as Tokens.Blockquote;
        visit(quote.tokens, quote.text, sourceMap(quote.text, quote.raw, rawMap));
      } else if (token.type === 'list') {
        let itemCursor = 0;
        for (const item of token.items) {
          const itemStart = token.raw.indexOf(item.raw, itemCursor);
          itemCursor = itemStart + item.raw.length;
          visit(item.tokens, item.text, sourceMap(item.text, item.raw, rawMap.slice(itemStart, itemCursor)));
        }
      }
    }
  }
  visit(marked.lexer(normalized, { gfm: true }), normalized, positions);
  return result;
}

export function mapScrollPosition(position: number, from: number[], to: number[]) {
  if (from.length !== to.length || from.length < 2) return 0;
  if (position <= from[0]) return to[0];
  for (let i = 1; i < from.length; i++) {
    if (position <= from[i]) {
      const ratio = (position - from[i - 1]) / Math.max(1, from[i] - from[i - 1]);
      return to[i - 1] + ratio * (to[i] - to[i - 1]);
    }
  }
  return to[to.length - 1];
}

export function previewGeometry(availableWidth: number, original: boolean, desktop: boolean) {
  const naturalWidth = desktop ? 760 : 407;
  const available = Math.max(1, availableWidth);
  const width = original || !desktop ? Math.min(naturalWidth, available) : naturalWidth;
  const scale = original || !desktop ? 1 : Math.min(1, available / naturalWidth);
  return { width, scale, renderedWidth: width * scale };
}

export function recentSelection<T extends string>(current: T[], selected: T) {
  return [selected, ...current.filter((id) => id !== selected)].slice(0, 8);
}

export function workspaceShortcut(event: {
  key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean;
  altKey: boolean; repeat?: boolean; isComposing?: boolean;
}) {
  if (event.repeat || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || !event.shiftKey) return null;
  const key = event.code?.replace(/^Key/, '').toLowerCase() || event.key.toLowerCase();
  return ({ o: 'import', c: 'copy', p: 'preview', f: 'focus', l: 'editor', r: 'settings', k: 'help' } as const)[key as 'o' | 'c' | 'p' | 'f' | 'l' | 'r' | 'k'] ?? null;
}
