export type LocalImageReference = {
  alt: string;
  source: string;
  key: string;
};

export type AssociatedImage = {
  file: File;
  relativePath: string;
  key: string;
  previewUrl: string;
};

const markdownImagePattern = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\n]+?)\s*\)/g;

export function isLocalImageSource(source: string) {
  return Boolean(source) && !/^(https?:|data:image\/|blob:)/i.test(source);
}

export function normalizeLocalImagePath(source: string) {
  let value = source.trim().replace(/^<|>$/g, '');
  const titleMatch = value.match(/^(.*?)(?:\s+["'].*["'])$/);
  if (titleMatch) value = titleMatch[1];
  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the original path when percent encoding is incomplete.
  }
  value = value
    .replace(/^file:\/{2,3}/i, '')
    .replace(/\\/g, '/')
    .replace(/[?#].*$/, '')
    .replace(/^[A-Za-z]:\//, '')
    .replace(/^\/+/, '');

  const segments: string[] = [];
  value.split('/').forEach((segment) => {
    if (!segment || segment === '.') return;
    if (segment === '..') {
      segments.pop();
      return;
    }
    segments.push(segment);
  });
  return segments.join('/').toLowerCase();
}

export function extractLocalImageReferences(markdown: string) {
  const references: LocalImageReference[] = [];
  const seen = new Set<string>();
  for (const match of markdown.matchAll(markdownImagePattern)) {
    const rawTarget = match[2].trim();
    const source = extractSource(rawTarget);
    if (!isLocalImageSource(source)) continue;
    const key = normalizeLocalImagePath(source);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    references.push({ alt: match[1], source, key });
  }
  return references;
}

export function replaceLocalImageSources(
  markdown: string,
  replacements: Record<string, string>,
) {
  return markdown.replace(markdownImagePattern, (full, _alt: string, rawTarget: string) => {
    const source = extractSource(rawTarget.trim());
    if (!isLocalImageSource(source)) return full;
    const replacement = replacements[normalizeLocalImagePath(source)];
    if (!replacement) return full;
    return full.replace(source, `<${replacement}>`);
  });
}

export function findAssociatedImage(
  reference: LocalImageReference,
  images: AssociatedImage[],
) {
  const exact = images.find((image) => image.key === reference.key);
  if (exact) return exact;

  const suffixMatches = images.filter(
    (image) =>
      image.key.endsWith(`/${reference.key}`) ||
      reference.key.endsWith(`/${image.key}`),
  );
  if (suffixMatches.length === 1) return suffixMatches[0];

  const basename = reference.key.split('/').pop();
  const basenameMatches = images.filter(
    (image) => image.key.split('/').pop() === basename,
  );
  return basenameMatches.length === 1 ? basenameMatches[0] : undefined;
}

function extractSource(rawTarget: string) {
  if (rawTarget.startsWith('<')) {
    return rawTarget.slice(1, rawTarget.indexOf('>'));
  }
  const titleMatch = rawTarget.match(/^(.*?)(?:\s+["'].*["'])$/);
  return (titleMatch?.[1] ?? rawTarget).trim();
}
