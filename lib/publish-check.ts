import { marked, type Tokens } from 'marked';

export type PublishCheckSeverity = 'pass' | 'warning' | 'blocking';

export type PublishCheckItem = {
  id: 'images' | 'tables' | 'code-language' | 'links';
  count: number;
  label: string;
  message: string;
  suggestion: string;
  severity: PublishCheckSeverity;
};

export type PublishCheckReport = {
  score: number;
  isEmpty: boolean;
  hasBlockingIssues: boolean;
  warningCount: number;
  items: PublishCheckItem[];
};

export function analyzePublishReadiness(
  markdown: string,
  unresolvedLocalImages: number,
): PublishCheckReport {
  let missingCodeLanguages = 0;
  let riskyTables = 0;
  let invalidLinks = 0;
  const tokens = marked.lexer(markdown, { gfm: true });
  void marked.walkTokens(tokens, (token) => {
    if (token.type === 'code' && !(token as Tokens.Code).lang?.trim()) missingCodeLanguages += 1;
    if (token.type === 'table' && isRiskyTable(token as Tokens.Table)) riskyTables += 1;
    if (token.type === 'link' && !isValidLinkTarget((token as Tokens.Link).href)) invalidLinks += 1;
    if (token.type === 'html') invalidLinks += countInvalidHtmlLinks(token.raw);
  });
  const isEmpty = !markdown.trim();
  unresolvedLocalImages = Number.isFinite(unresolvedLocalImages)
    ? Math.max(0, Math.floor(unresolvedLocalImages))
    : 0;

  const deductions =
    Math.min(30, unresolvedLocalImages * 12) +
    Math.min(20, riskyTables * 8) +
    Math.min(15, missingCodeLanguages * 3) +
    Math.min(20, invalidLinks * 6);

  const items: PublishCheckItem[] = [
    {
      id: 'images',
      count: unresolvedLocalImages,
      label: '本地图片',
      message: unresolvedLocalImages
        ? `${unresolvedLocalImages} 张本地图片未处理，不影响复制`
        : '未发现未处理的本地图片',
      suggestion: unresolvedLocalImages
        ? '未处理图片会以文字占位，可在公众号中补充；也可先上传图片或填写公开地址。'
        : '仅检查地址状态，未验证远程图片可访问性。',
      severity: unresolvedLocalImages ? 'warning' : 'pass',
    },
    {
      id: 'tables',
      count: riskyTables,
      label: '手机端表格',
      message: riskyTables
        ? `${riskyTables} 个表格在手机端可能拥挤或溢出`
        : '未发现高风险 Markdown 表格',
      suggestion: riskyTables
        ? '减少列数、缩短单元格内容，或改成分段列表。'
        : '没有发现高风险表格。',
      severity: riskyTables ? 'warning' : 'pass',
    },
    {
      id: 'code-language',
      count: missingCodeLanguages,
      label: '代码语言',
      message: missingCodeLanguages
        ? `${missingCodeLanguages} 个代码块未声明语言`
        : '代码块均已声明语言',
      suggestion: missingCodeLanguages
        ? '在代码围栏后添加语言，例如 ```typescript。'
        : '已检查 Markdown 代码块的语言声明。',
      severity: missingCodeLanguages ? 'warning' : 'pass',
    },
    {
      id: 'links',
      count: invalidLinks,
      label: '链接格式',
      message: invalidLinks
        ? `${invalidLinks} 个链接格式异常或不是公开地址`
        : '链接格式检查通过',
      suggestion: invalidLinks
        ? '使用完整的 https://、http://、mailto: 或文章内 # 锚点。'
        : '没有发现异常链接。',
      severity: invalidLinks ? 'warning' : 'pass',
    },
  ];

  return {
    score: isEmpty ? 0 : Math.max(0, 100 - deductions),
    isEmpty,
    hasBlockingIssues: isEmpty,
    warningCount: unresolvedLocalImages + riskyTables + missingCodeLanguages + invalidLinks,
    items,
  };
}

function isRiskyTable(table: Tokens.Table) {
  const rows = [table.header, ...table.rows];
  const columnCount = table.header.length;
  const preferredWidth = Array.from({ length: columnCount }, (_, column) =>
    rows.reduce((max, row) => Math.max(max, Math.min(22, visibleLength(row[column]?.text ?? ''))), 4),
  ).reduce((sum, width) => sum + width, 0);
  const hasLongToken = rows.some((row) => row.some((cell) => /[^\s|]{22,}/.test(cell.text)));
  return columnCount >= 4 || preferredWidth > 52 || hasLongToken;
}

function visibleLength(value: string) {
  return value.replace(/[*_`~]/g, '').trim().length;
}

function countInvalidHtmlLinks(html: string) {
  const content = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(pre|code|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  let count = 0;
  for (const match of content.matchAll(/<a\b[^>]*>/gi)) {
    const attribute = match[0].match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!attribute) continue;
    const target = attribute[1] ?? attribute[2] ?? attribute[3] ?? '';
    if (!isValidLinkTarget(target)) count += 1;
  }
  return count;
}

/** Syntax only: never fetch user links or claim a live destination was verified. */
export function isWebUrl(value: string) {
  const target = value.trim();
  if (!/^https?:\/\//i.test(target) || /[\s<>\\]/.test(target)) return false;
  try {
    const url = new URL(target);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isValidLinkTarget(value: string) {
  const target = value.trim();
  if (target.startsWith('#')) return true;
  if (/^mailto:/i.test(target)) {
    return /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?[^\s]*)?$/i.test(target);
  }
  return isWebUrl(target);
}
