'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AlertTriangle,
  Archive,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Clipboard,
  CloudUpload,
  Code2,
  Download,
  FilePenLine,
  FileUp,
  FolderOpen,
  ImageOff,
  Images,
  Keyboard,
  ListTree,
  Link2,
  LoaderCircle,
  Monitor,
  Maximize2,
  PanelLeft,
  PanelRight,
  Pin,
  PinOff,
  Palette,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Table2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { unzip } from 'fflate';

import { Button } from '@/components/ui/button';
import { brand } from '@/lib/brand';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArticleThemePicker } from '@/components/article-theme-picker';
import { ThemePaletteControl } from '@/components/theme-extras';
import { ThemeGallery } from '@/components/theme-gallery';
import { useThemeLibrary } from '@/components/use-theme-library';
import { useWorkspaceView } from '@/components/use-workspace-view';
import { workspaceShortcut } from '@/lib/workspace-tools';
import { copyRichTextFallback } from '@/lib/clipboard';
import {
  extractLocalImageReferences,
  findAssociatedImage,
  normalizeLocalImagePath,
  replaceLocalImageSources,
  type AssociatedImage,
} from '@/lib/local-images';
import { analyzePublishReadiness, isWebUrl, type PublishCheckItem } from '@/lib/publish-check';
import {
  buildWechatHtml,
  codeThemes,
  countLocalImages,
  defaultSettings,
  themes,
  type CodeThemeId,
  type EditorSettings,
  type ThemeId,
} from '@/lib/wechat-markdown';

const sampleMarkdown = `# 从零构建可靠的 API 限流器

在高并发系统中，**限流**不是锦上添花，而是保护服务稳定性的第一道防线。本文用一个精简的 TypeScript 示例，解释如何实现滑动窗口限流。

> [!TIP]
> 先明确业务允许的突发流量，再选择算法。不要只看平均 QPS。

## 为什么选择滑动窗口

固定窗口实现简单，但在窗口边界可能产生双倍流量。滑动窗口通过记录一段时间内的请求时间，让限制更加平滑。更完整的实现可以参考 [Redis 官方文档](https://redis.io/docs/latest/)。

### 核心实现

\`\`\`typescript
type Bucket = Map<string, number[]>;

export function allowRequest(
  bucket: Bucket,
  key: string,
  limit = 100,
  windowMs = 60_000,
) {
  const now = Date.now();
  const start = now - windowMs;
  const requests = (bucket.get(key) ?? []).filter(time => time > start);

  if (requests.length >= limit) return false;
  requests.push(now);
  bucket.set(key, requests);
  return true;
}
\`\`\`

调用时只需要传入用户标识：\`allowRequest(bucket, userId)\`。

## 实施检查清单

- 为不同接口设置独立阈值
- 记录被拒绝请求的指标
- 返回明确的 \`429 Too Many Requests\`
- 在响应头提供重试时间

| 方案 | 精度 | 实现成本 | 适用场景 |
| --- | --- | --- | --- |
| 固定窗口 | 中 | 低 | 内部工具 |
| 滑动窗口 | 高 | 中 | API 网关 |
| 令牌桶 | 高 | 中 | 突发流量 |

> [!WARNING]
> 单机内存方案不适用于多实例部署。生产环境应使用 Redis 等共享存储，并保证操作原子性。

## 小结

可靠的限流策略需要兼顾**业务体验、系统容量和可观测性**。算法只是起点，持续校准阈值才是长期工作。
`;

const FONT_SIZES = [14, 15, 16, 17, 18];
const LINE_HEIGHTS = [1.6, 1.7, 1.8, 1.9, 2];
const CODE_FONT_SIZES = [12, 13, 14, 15];
type CodeThemeFilter = 'recommended' | 'light' | 'dark';
const RECOMMENDED_CODE_THEMES: CodeThemeId[] = [
  'github-light',
  'github-dark',
  'vscode-dark',
  'one-dark',
];
const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const MARKDOWN_EXTENSIONS = /\.(md|markdown|mdown|txt)$/i;

function isPublishedImageUrl(value: string) {
  return isWebUrl(value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function imageMimeType(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    avif: 'image/avif', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg',
    png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp',
  };
  return types[extension ?? ''] ?? 'application/octet-stream';
}

async function unzipArchive(file: File) {
  const input = new Uint8Array(await file.arrayBuffer());
  return new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(input, (error, entries) => {
      if (error) reject(error);
      else resolve(entries);
    });
  });
}

export default function Home() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [settings, setSettings] = useState<EditorSettings>(defaultSettings);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { library: themeLibrary, toggleFavorite, recordSelection } = useThemeLibrary();
  const [codeThemeFilter, setCodeThemeFilter] = useState<CodeThemeFilter>('recommended');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [previewZoom, setPreviewZoom] = useState<'fit' | 'original'>('fit');
  const [showEditor, setShowEditor] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlinePinned, setOutlinePinned] = useState(false);
  const outlineTriggerRef = useRef<HTMLButtonElement>(null);
  const outlineNavRef = useRef<HTMLElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('示例文章.md');
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [showHtml, setShowHtml] = useState(false);
  const [publishCheckOpen, setPublishCheckOpen] = useState(false);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [associatedImages, setAssociatedImages] = useState<AssociatedImage[]>([]);
  const [publishedImageUrls, setPublishedImageUrls] = useState<Record<string, string>>({});
  const [imageUploadStates, setImageUploadStates] = useState<Record<string, 'uploading' | 'error'>>({});
  const [uploadEndpoint, setUploadEndpoint] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFolderInputRef = useRef<HTMLInputElement>(null);
  const imageZipInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const visibleCodeThemes = useMemo(() => {
    const ids = Object.keys(codeThemes) as CodeThemeId[];
    if (codeThemeFilter === 'recommended') return RECOMMENDED_CODE_THEMES;
    return ids.filter((id) => codeThemes[id].mode === codeThemeFilter);
  }, [codeThemeFilter]);

  useEffect(() => {
    const saved = localStorage.getItem('inkgrid-settings');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<EditorSettings>;
      const restored: EditorSettings = {
        ...defaultSettings,
        ...parsed,
        theme:
          parsed.theme && Object.hasOwn(themes, parsed.theme)
            ? parsed.theme
            : defaultSettings.theme,
        codeTheme:
          parsed.codeTheme && Object.hasOwn(codeThemes, parsed.codeTheme)
            ? parsed.codeTheme
            : defaultSettings.codeTheme,
      };
      queueMicrotask(() => setSettings(restored));
    } catch {
      localStorage.removeItem('inkgrid-settings');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('inkgrid-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const savedEndpoint = localStorage.getItem('inkgrid-image-upload-endpoint');
    if (savedEndpoint) queueMicrotask(() => setUploadEndpoint(savedEndpoint));
    const objectUrls = objectUrlsRef.current;
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (uploadEndpoint) localStorage.setItem('inkgrid-image-upload-endpoint', uploadEndpoint);
    else localStorage.removeItem('inkgrid-image-upload-endpoint');
  }, [uploadEndpoint]);

  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const localImageReferences = useMemo(
    () => extractLocalImageReferences(markdown),
    [markdown],
  );
  const imageRows = useMemo(
    () => localImageReferences.map((reference) => ({
      reference,
      match: findAssociatedImage(reference, associatedImages),
      publishedUrl: publishedImageUrls[reference.key] ?? '',
      uploadState: imageUploadStates[reference.key],
    })),
    [associatedImages, imageUploadStates, localImageReferences, publishedImageUrls],
  );
  const previewImageReplacements = useMemo(
    () => Object.fromEntries(imageRows.flatMap((row) => {
      const source = isPublishedImageUrl(row.publishedUrl)
        ? row.publishedUrl.trim()
        : row.match?.previewUrl;
      return source ? [[row.reference.key, source]] : [];
    })),
    [imageRows],
  );
  const publishedImageReplacements = useMemo(
    () => Object.fromEntries(imageRows.flatMap((row) => (
      isPublishedImageUrl(row.publishedUrl)
        ? [[row.reference.key, row.publishedUrl.trim()]]
        : []
    ))),
    [imageRows],
  );
  const previewMarkdown = useMemo(
    () => replaceLocalImageSources(markdown, previewImageReplacements),
    [markdown, previewImageReplacements],
  );
  const publishedMarkdown = useMemo(
    () => replaceLocalImageSources(markdown, publishedImageReplacements),
    [markdown, publishedImageReplacements],
  );
  const html = useMemo(
    () => (isClient ? buildWechatHtml(previewMarkdown, settings, true) : ''),
    [isClient, previewMarkdown, settings],
  );
  const publishedHtml = useMemo(
    () => (isClient ? buildWechatHtml(publishedMarkdown, settings) : ''),
    [isClient, publishedMarkdown, settings],
  );
  const { editorRef, previewRef, scrollRef, paperRef, outline, activeIndex, syncEnabled, setSyncEnabled, geometry, paperHeight, onScroll, locateHeading, capturePosition, restorePosition } = useWorkspaceView(markdown, html, previewMode === 'desktop', previewZoom === 'original', !galleryOpen);
  const widePreview = previewMode === 'desktop' && previewZoom === 'original';
  const editorVisible = showEditor && !focusMode && !widePreview;
  const settingsVisible = showSettings && !focusMode && !widePreview;

  useEffect(() => {
    const nav = outlineNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !active) return;
    const top = active.getBoundingClientRect().top - nav.getBoundingClientRect().top;
    if (top < 0) nav.scrollTop += top;
    else if (top + active.offsetHeight > nav.clientHeight) nav.scrollTop += top + active.offsetHeight - nav.clientHeight;
  }, [activeIndex, outlineOpen, outlinePinned]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.querySelectorAll<HTMLElement>('[data-outline-index]').forEach((heading) => {
      heading.tabIndex = 0;
      heading.setAttribute('role', 'button');
      heading.setAttribute('aria-label', `定位原文：${heading.textContent}`);
    });
    const navigate = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      const heading = (event.target as HTMLElement).closest<HTMLElement>('[data-outline-index]');
      if (!heading) return;
      event.preventDefault();
      setFocusMode(false); setPreviewZoom('fit'); setShowEditor(true);
      requestAnimationFrame(() => requestAnimationFrame(() => locateHeading(Number(heading.dataset.outlineIndex), true)));
    };
    preview.addEventListener('click', navigate);
    preview.addEventListener('keydown', navigate);
    return () => { preview.removeEventListener('click', navigate); preview.removeEventListener('keydown', navigate); };
  }, [html, previewRef, locateHeading]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (galleryOpen) return;
      // Let dialogs and form composition own their keyboard interactions.
      if (event.defaultPrevented || event.isComposing || document.querySelector('[data-slot="dialog-content"]')) return;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.code === 'KeyK' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        window.dispatchEvent(new Event('open-theme-picker'));
        return;
      }
      if (event.key === 'Escape' && focusMode) { setFocusMode(false); return; }
      const action = workspaceShortcut(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'import') fileInputRef.current?.click();
      if (action === 'copy') setPublishCheckOpen(true);
      if (action === 'preview') setPreviewMode((mode) => mode === 'mobile' ? 'desktop' : 'mobile');
      if (action === 'focus') setFocusMode((value) => !value);
      if (action === 'editor') { setFocusMode(false); setPreviewZoom('fit'); setShowEditor(!editorVisible); }
      if (action === 'settings') { setFocusMode(false); setPreviewZoom('fit'); setShowSettings(!settingsVisible); }
      if (action === 'help') setShortcutsOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, editorVisible, settingsVisible, galleryOpen]);

  function openGallery() {
    if (galleryOpen) return;
    capturePosition();
    setGalleryOpen(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function closeGallery() {
    if (!galleryOpen) return;
    setGalleryOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(restorePosition));
  }

  function selectArticleTheme(id: ThemeId) {
    setSettings((current) => ({ ...current, theme: id, headingStyle: 'theme', palette: 'original' }));
    recordSelection(id);
  }
  const stats = useMemo(() => {
    const clean = markdown.replace(/[#>*_`\-|]/g, '').trim();
    const chars = clean.length;
    return { chars, minutes: Math.max(1, Math.ceil(chars / 500)) };
  }, [markdown]);
  const localImageCount = useMemo(() => countLocalImages(markdown), [markdown]);
  const publishedImageCount = imageRows.filter((row) => isPublishedImageUrl(row.publishedUrl)).length;
  const matchedImageCount = imageRows.filter((row) => row.match).length;
  const unresolvedImageCount = localImageCount - publishedImageCount;
  const publishCheckReport = useMemo(
    () => analyzePublishReadiness(markdown, unresolvedImageCount),
    [markdown, unresolvedImageCount],
  );

  function update<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  }

  function revealHeading(index: number) {
    if (!outlinePinned) setOutlineOpen(false);
    setFocusMode(false);
    setPreviewZoom('fit');
    setShowEditor(true);
    // Wait for layout and the textarea mirror to reflect the restored editor width.
    requestAnimationFrame(() => requestAnimationFrame(() => locateHeading(index, true)));
  }

  function associateImageFiles(files: Array<{ file: File; relativePath: string }>) {
    const valid = files.filter(({ file, relativePath }) =>
      file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(relativePath),
    );
    if (!valid.length) {
      flash('没有找到可用的图片文件');
      return;
    }
    const nextImages = valid
      .filter(({ file }) => file.size <= 15 * 1024 * 1024)
      .map(({ file, relativePath }) => {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);
        return {
          file,
          relativePath: relativePath.replace(/\\/g, '/'),
          key: normalizeLocalImagePath(relativePath),
          previewUrl,
        } satisfies AssociatedImage;
      });

    setAssociatedImages((current) => {
      const incomingKeys = new Set(nextImages.map((image) => image.key));
      current
        .filter((image) => incomingKeys.has(image.key))
        .forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [
        ...current.filter((image) => !incomingKeys.has(image.key)),
        ...nextImages,
      ];
    });
    const skipped = valid.length - nextImages.length;
    flash(`已关联 ${nextImages.length} 张图片${skipped ? `，${skipped} 张超过 15MB` : ''}`);
  }

  async function importArchive(file: File, imagesOnly = false) {
    if (file.size > 100 * 1024 * 1024) {
      flash('ZIP 超过 100MB，暂时无法导入');
      return;
    }
    try {
      const entries = await unzipArchive(file);
      const entryNames = Object.keys(entries).filter((name) => !name.endsWith('/'));
      const markdownName = entryNames.find((name) => MARKDOWN_EXTENSIONS.test(name));
      const imageEntries = entryNames.filter((name) => IMAGE_EXTENSIONS.test(name));

      if (!imagesOnly && !markdownName) {
        flash('ZIP 中没有找到 Markdown 文件');
        return;
      }
      if (!imagesOnly && markdownName) {
        if (markdown.trim() && markdown !== sampleMarkdown) {
          const shouldReplace = window.confirm('当前编辑器中已有内容，导入 ZIP 将覆盖现有内容。是否继续？');
          if (!shouldReplace) return;
        }
        const content = new TextDecoder('utf-8').decode(entries[markdownName]).replace(/^\uFEFF/, '');
        setMarkdown(content);
        setCurrentFileName(markdownName.split('/').pop() ?? '导入文章.md');
        setPublishedImageUrls({});
      }

      associateImageFiles(imageEntries.map((name) => ({
        file: new File([entries[name].slice().buffer as ArrayBuffer], name.split('/').pop() ?? 'image', {
          type: imageMimeType(name),
        }),
        relativePath: name,
      })));
      setImageManagerOpen(true);
      flash(`ZIP 已读取：${markdownName && !imagesOnly ? '1 篇文章，' : ''}${imageEntries.length} 张图片`);
    } catch {
      flash('ZIP 读取失败，请确认压缩包没有损坏或加密');
    }
  }

  async function importMarkdown(file?: File) {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'zip') {
      await importArchive(file);
      return;
    }
    if (!extension || !['md', 'markdown', 'mdown', 'txt'].includes(extension)) {
      flash('请选择 Markdown、文本或 ZIP 文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash('文件超过 5MB，暂时无法导入');
      return;
    }
    if (markdown.trim() && markdown !== sampleMarkdown) {
      const shouldReplace = window.confirm('当前编辑器中已有内容，导入文件将覆盖现有内容。是否继续？');
      if (!shouldReplace) return;
    }
    try {
      const content = (await file.text()).replace(/^\uFEFF/, '');
      setMarkdown(content);
      setCurrentFileName(file.name);
      setPublishedImageUrls({});
      flash(`已导入 ${file.name}`);
    } catch {
      flash('文件读取失败，请确认文件编码为 UTF-8');
    }
  }

  async function uploadImage(key: string) {
    const row = imageRows.find((item) => item.reference.key === key);
    if (!row?.match) {
      flash('请先关联这张图片所在的文件夹');
      return;
    }
    if (!/^https?:\/\//i.test(uploadEndpoint.trim())) {
      flash('请先填写有效的图片上传接口');
      return;
    }
    setImageUploadStates((current) => ({ ...current, [key]: 'uploading' }));
    try {
      const body = new FormData();
      body.append('file', row.match.file, row.match.file.name);
      body.append('path', row.reference.source);
      const response = await fetch(uploadEndpoint.trim(), { method: 'POST', body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as {
        url?: string;
        location?: string;
        data?: { url?: string; location?: string };
      };
      const url = result.url ?? result.location ?? result.data?.url ?? result.data?.location ?? '';
      if (!isPublishedImageUrl(url)) throw new Error('Missing image URL');
      setPublishedImageUrls((current) => ({ ...current, [key]: url }));
      setImageUploadStates((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      flash(`已上传 ${row.match.file.name}`);
    } catch {
      setImageUploadStates((current) => ({ ...current, [key]: 'error' }));
      flash('上传失败，请检查接口地址、跨域设置和返回格式');
    }
  }

  async function uploadAllImages() {
    const pending = imageRows.filter((row) => row.match && !isPublishedImageUrl(row.publishedUrl));
    if (!pending.length) {
      flash('没有需要上传的图片');
      return;
    }
    for (const row of pending) await uploadImage(row.reference.key);
  }

  function clearAssociatedImages() {
    associatedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setAssociatedImages([]);
    flash('已清除本地图片关联');
  }

  async function copyRichText() {
    try {
      const plain = previewRef.current?.innerText ?? markdown;
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const item = new ClipboardItem({
          'text/html': new Blob([publishedHtml], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        if (!copyRichTextFallback(publishedHtml)) throw new Error('浏览器拒绝复制富文本');
      }
      flash(unresolvedImageCount
        ? '已复制富文本，未处理图片以文字占位，可在公众号中补充'
        : '已复制富文本，可直接粘贴到公众号');
    } catch {
      flash('复制失败，请使用“复制 HTML”重试');
    }
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(publishedHtml);
      flash(unresolvedImageCount ? 'HTML 源码已复制，未处理图片以文字占位' : 'HTML 源码已复制');
    } catch {
      flash('浏览器没有授予剪贴板权限');
    }
  }

  function downloadHtml() {
    const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号文章</title></head><body>${publishedHtml}</body></html>`;
    const url = URL.createObjectURL(
      new Blob([page], { type: 'text/html;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = currentFileName.replace(/\.(md|markdown|mdown|txt)$/i, '') + '.html';
    anchor.click();
    URL.revokeObjectURL(url);
    flash(unresolvedImageCount ? 'HTML 文件已导出，未处理图片以文字占位' : 'HTML 文件已导出');
  }

  return (
    <main className={`studio-shell ${galleryOpen ? 'is-gallery' : ''} min-h-screen bg-[#f3f0e9] text-[#25231f]`}>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-start border-b border-[#ddd7ca] bg-[#f8f6f1]/95 px-4 backdrop-blur md:px-7">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#b83a2d] text-white shadow-[0_5px_18px_rgba(184,58,45,.24)]">
            <span className="font-serif text-lg font-bold" aria-hidden="true">文</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[17px] font-bold tracking-[.08em]" title={brand.tagline}>{brand.name}</h1>
              <span className="hidden rounded-full bg-[#e9e3d6] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#766e61] sm:inline-block">
                {brand.label}
              </span>
            </div>
            <p className="text-[11px] tracking-[.03em] text-[#8b8478]">
              {brand.studio}
            </p>
          </div>
        </div>

        <nav className="studio-navigation" aria-label="主导航">
          <Button variant="ghost" aria-current={!galleryOpen ? 'page' : undefined} onClick={closeGallery}><FilePenLine aria-hidden="true" />编辑器</Button>
          <Button variant="ghost" aria-current={galleryOpen ? 'page' : undefined} onClick={openGallery}><Palette aria-hidden="true" />主题画廊</Button>
        </nav>

        <div className="editor-header-actions flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".md,.markdown,.mdown,.txt,.zip,text/markdown,text/plain,application/zip"
            onChange={(event) => {
              void importMarkdown(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={imageFolderInputRef}
            type="file"
            className="sr-only"
            accept="image/*"
            multiple
            {...({ webkitdirectory: '', directory: '' } as { webkitdirectory: string; directory: string })}
            onChange={(event) => {
              associateImageFiles(Array.from(event.target.files ?? []).map((file) => ({
                file,
                relativePath: file.webkitRelativePath || file.name,
              })));
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={imageZipInputRef}
            type="file"
            className="sr-only"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importArchive(file, true);
              event.currentTarget.value = '';
            }}
          />
          <Button
            variant="outline"
            className="hidden border-[#d8d1c3] bg-transparent text-[#514c43] lg:inline-flex"
            onClick={() => setImageManagerOpen(true)}
          >
            <Images /> 图片
            {localImageCount > 0 && (
              <span className={`image-count-badge ${unresolvedImageCount ? 'has-warning' : ''}`}>
                {publishedImageCount}/{localImageCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="border-[#d8d1c3] bg-transparent text-[#514c43]"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp />
            <span className="hidden sm:inline">导入 Markdown</span>
          </Button>
          <Button
            variant="outline"
            className="hidden border-[#d8d1c3] bg-transparent text-[#514c43] md:inline-flex"
            onClick={downloadHtml}
          >
            <Download /> 导出 HTML
          </Button>
          <Button
            className="h-9 bg-[#b83a2d] px-4 text-white shadow-[0_5px_16px_rgba(184,58,45,.2)] hover:bg-[#9f3026]"
            onClick={() => setPublishCheckOpen(true)}
          >
            <Clipboard />
            复制到公众号
          </Button>
        </div>
      </header>

      <ThemeGallery active={galleryOpen} settings={settings} markdown={previewMarkdown} library={themeLibrary} onFavorite={toggleFavorite} onApply={(id, palette, codeTheme) => { setSettings(current => ({ ...current, theme: id, headingStyle: 'theme', palette, codeTheme: codeTheme ?? current.codeTheme })); recordSelection(id); closeGallery(); }} onBack={closeGallery} />

      <div className="workspace-toolbar" aria-label="工作区工具">
        <div className="workspace-toolbar-group">
          <Button variant="ghost" size="sm" aria-pressed={editorVisible} title="显示或隐藏编辑区 · Ctrl/⌘+Shift+L" onClick={() => { setFocusMode(false); setPreviewZoom('fit'); setShowEditor(!editorVisible); }}><PanelLeft />编辑区</Button>
          <Button variant="ghost" size="sm" aria-pressed={settingsVisible} title="显示或隐藏样式面板 · Ctrl/⌘+Shift+R" onClick={() => { setFocusMode(false); setPreviewZoom('fit'); setShowSettings(!settingsVisible); }}><PanelRight />样式面板</Button>
          <Button variant="ghost" size="sm" aria-pressed={focusMode} title="专注预览 · Ctrl/⌘+Shift+F，Esc 退出" onClick={() => setFocusMode(!focusMode)}><Maximize2 />{focusMode ? '退出专注' : '专注模式'}</Button>
          <span className="toolbar-divider" aria-hidden="true" />
          <Button variant="ghost" size="sm" className="toolbar-sync" aria-pressed={syncEnabled} title="编辑区与预览区按章节同步位置" onClick={() => setSyncEnabled(!syncEnabled)}><Link2 />同步滚动<span className={`sync-status ${syncEnabled ? 'is-on' : ''}`}>{syncEnabled ? '开' : '关'}</span></Button>
        </div>
        <div className="workspace-toolbar-group workspace-preview-controls">
          {previewMode === 'desktop' && <div className="device-switch" aria-label="PC 预览缩放">
            <button aria-pressed={previewZoom === 'fit'} className={previewZoom === 'fit' ? 'is-active' : ''} onClick={() => setPreviewZoom('fit')}>适配宽度 <small>{Math.round(geometry.scale * 100)}%</small></button>
            <button aria-pressed={previewZoom === 'original'} className={previewZoom === 'original' ? 'is-active' : ''} title="临时展开预览，切回适配宽度恢复面板；窄屏保持 100% 字号并自适应换行" onClick={() => setPreviewZoom('original')}>100% 原始尺寸</button>
          </div>}
          <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}><Keyboard /><span className="hidden sm:inline">快捷键</span></Button>
        </div>
      </div>
      <section className={`workspace-grid ${!editorVisible ? 'hide-editor' : ''} ${!settingsVisible ? 'hide-settings' : ''}`}>
        <section
          className={`editor-pane panel-border ${isDragging ? 'is-dragging' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void importMarkdown(event.dataTransfer.files[0]);
          }}
        >
          <Collapsible open={outlineOpen} onOpenChange={setOutlineOpen} className="editor-layout">
          <div className="panel-titlebar editor-titlebar">
            <div className="flex min-w-0 items-center gap-2">
              <CollapsibleTrigger ref={outlineTriggerRef} render={<Button variant="ghost" size="sm" className="editor-outline-trigger" />} title="展开或收起文章大纲">
                <ListTree />大纲
              </CollapsibleTrigger>
              <h2 className="truncate">{currentFileName}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs text-[#8c8579]">
              <span>{stats.chars} 字</span>
              <span className="editor-reading-time">约 {stats.minutes} 分钟</span>
            </div>
          </div>
          <div className="editor-body">
            <CollapsibleContent className={`editor-outline-drawer ${outlinePinned ? 'is-pinned' : ''}`} onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation(); setOutlineOpen(false); outlineTriggerRef.current?.focus();
              }
            }}>
              <div className="outline-drawer-head">
                <strong>文章大纲 <small>{outline.length}</small></strong>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" aria-label={outlinePinned ? '取消固定大纲' : '固定展开大纲'} aria-pressed={outlinePinned} title={outlinePinned ? '取消固定，定位后自动收起' : '固定展开，定位后保持显示'} onClick={() => setOutlinePinned(!outlinePinned)}>{outlinePinned ? <PinOff /> : <Pin />}</Button>
                  <Button variant="ghost" size="icon-xs" aria-label="收起文章大纲" onClick={() => { setOutlineOpen(false); outlineTriggerRef.current?.focus(); }}><X /></Button>
                </div>
              </div>
              <p className="outline-drawer-hint">{outlinePinned ? '已固定 · 定位后保持展开' : '点击标题定位 · 可固定展开'}</p>
              <nav ref={outlineNavRef} className="article-outline" aria-label="文章大纲">
                {outline.map((heading) => <button key={heading.index} className={activeIndex === heading.index ? 'is-active' : ''} aria-current={activeIndex === heading.index ? 'location' : undefined} style={{ paddingLeft: 10 + (heading.depth - 1) * 12 }} title={`第 ${heading.line} 行 · ${heading.text}`} onClick={() => revealHeading(heading.index)}>{heading.text || '未命名标题'}</button>)}
                {!outline.length && <p>添加 # 或 ## 标题后，大纲将自动生成。</p>}
              </nav>
            </CollapsibleContent>
          <textarea
            ref={editorRef}
            onScroll={() => onScroll('editor')}
            onFocus={() => { if (!outlinePinned) setOutlineOpen(false); }}
            aria-label="Markdown 原文"
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              if (currentFileName === '示例文章.md') setCurrentFileName('未命名文章.md');
            }}
            spellCheck={false}
            className="markdown-editor"
            placeholder="在这里粘贴 Markdown 文章…"
          />
          </div>
          </Collapsible>
          {isDragging && (
            <div className="drop-overlay">
              <UploadCloud className="size-9" />
              <strong>松开即可导入 Markdown</strong>
              <span>支持 .md、.markdown、.mdown、.txt</span>
            </div>
          )}
          <div className="editor-footer">
            <button
              onClick={() => {
                setMarkdown(sampleMarkdown);
                setCurrentFileName('示例文章.md');
              }}
            >
              载入示例
            </button>
            {localImageCount > 0 ? (
              <button
                className={`flex items-center gap-1 ${unresolvedImageCount ? 'text-[#a04a35]' : 'text-[#39755a]'}`}
                onClick={() => setImageManagerOpen(true)}
              >
                {unresolvedImageCount ? <AlertTriangle className="size-3" /> : <Check className="size-3" />}
                {unresolvedImageCount
                  ? `${matchedImageCount}/${localImageCount} 已匹配，${unresolvedImageCount} 张待发布`
                  : `${localImageCount} 张图片已准备完成`}
              </button>
            ) : (
              <span>内容仅在当前浏览器中处理</span>
            )}
          </div>
        </section>

        <section className="preview-pane panel-border">
          <div className="panel-titlebar">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#b83a2d]" />
              <h2>公众号预览</h2>
            </div>
            <div className="device-switch" aria-label="预览设备">
              <button
                className={previewMode === 'mobile' ? 'is-active' : ''}
                onClick={() => setPreviewMode('mobile')}
                aria-pressed={previewMode === 'mobile'}
              >
                <Smartphone /> 手机 <small>375</small>
              </button>
              <button
                className={previewMode === 'desktop' ? 'is-active' : ''}
                onClick={() => setPreviewMode('desktop')}
                aria-pressed={previewMode === 'desktop'}
              >
                <Monitor /> PC <small>760</small>
              </button>
            </div>
          </div>
          <div ref={scrollRef} onScroll={() => onScroll('preview')} className={`preview-scroll ${previewMode === 'desktop' ? 'is-desktop' : ''}`}>
            <div className="preview-stage" style={{ width: geometry.renderedWidth, height: paperHeight * geometry.scale }}>
            <div ref={paperRef} className={`preview-paper ${previewMode === 'desktop' ? 'desktop-paper' : 'phone-paper'}`} style={{ width: geometry.width, transform: `scale(${geometry.scale})` }}>
              <div className="mb-6 flex items-center justify-between border-b border-[#eeeae2] pb-3 text-[11px] text-[#9a9388]">
                <span>{previewMode === 'mobile' ? '手机端 · 375 px' : `PC 端 · ${Math.round(geometry.width)} px`}</span>
                <span>{themes[settings.theme].name}</span>
              </div>
              <div
                ref={previewRef}
                className="article-preview-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
            </div>
          </div>
        </section>

        <aside className="settings-pane">
          <div className="panel-titlebar">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-[#b83a2d]" />
              <h2>样式工坊</h2>
            </div>
            <button
              className="rounded-md p-1 text-[#8b8478] hover:bg-[#e9e3d8] hover:text-[#3b3832]"
              aria-label="重置样式"
              onClick={() => setSettings(defaultSettings)}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          <div className="settings-scroll">
            <div className="setting-section">
              <div className="mb-2 flex items-center justify-between">
                <span className="setting-label mb-0">文章主题</span>
                <span className="text-[10px] text-[#9a9388]">{Object.keys(themes).length} 套</span>
              </div>
              <ArticleThemePicker selected={settings.theme} library={themeLibrary} onSelect={selectArticleTheme} onOpenGallery={openGallery} />
              <ThemePaletteControl value={settings.palette} onChange={value => update('palette', value)} />
            </div>


            <div className="setting-section grid grid-cols-2 gap-3">
              <Control label="正文字号">
                <NativeSelect
                  value={settings.fontSize}
                  onChange={(event) => update('fontSize', Number(event.target.value))}
                  className="w-full"
                >
                  {FONT_SIZES.map((size) => (
                    <NativeSelectOption key={size} value={size}>{size} px</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Control>
              <Control label="正文行高">
                <NativeSelect
                  value={settings.lineHeight}
                  onChange={(event) => update('lineHeight', Number(event.target.value))}
                  className="w-full"
                >
                  {LINE_HEIGHTS.map((height) => (
                    <NativeSelectOption key={height} value={height}>{height}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Control>
              <Control label="标题样式">
                <NativeSelect
                  value={settings.headingStyle}
                  onChange={(event) => update('headingStyle', event.target.value as EditorSettings['headingStyle'])}
                  className="w-full"
                >
                  <NativeSelectOption value="theme">跟随主题</NativeSelectOption>
                  <NativeSelectOption value="left-border">左侧强调</NativeSelectOption>
                  <NativeSelectOption value="underline">底线标题</NativeSelectOption>
                  <NativeSelectOption value="label">标签标题</NativeSelectOption>
                  <NativeSelectOption value="plain">简洁标题</NativeSelectOption>
                </NativeSelect>
              </Control>
            </div>

            <div className="setting-section">
              <div className="mb-3 flex items-center justify-between">
                <span className="setting-label mb-0">代码样式</span>
                <span className={`code-mode ${codeThemes[settings.codeTheme].mode}`}>
                  {codeThemes[settings.codeTheme].mode === 'dark' ? '深色' : '浅色'}
                </span>
              </div>

              <Dialog>
                <DialogTrigger
                  className="code-theme-trigger"
                  aria-label={`选择代码主题，当前为 ${codeThemes[settings.codeTheme].name}`}
                >
                  <span className="code-theme-trigger-head">
                    <span>
                      <strong>{codeThemes[settings.codeTheme].name}</strong>
                      <small>点击查看并比较全部主题</small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </span>
                  <CodeThemePreview themeId={settings.codeTheme} compact />
                </DialogTrigger>

                <DialogContent className="code-theme-dialog sm:max-w-[760px]">
                  <DialogHeader className="pr-10">
                    <DialogTitle className="flex items-center gap-2 text-[17px]">
                      <Code2 className="size-4 text-[#b83a2d]" />
                      选择代码主题
                    </DialogTitle>
                    <DialogDescription>
                      所有卡片使用同一段 TypeScript 代码，点击即可实时应用到文章预览。
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs
                    value={codeThemeFilter}
                    onValueChange={(value) => setCodeThemeFilter(value as CodeThemeFilter)}
                    className="min-h-0"
                  >
                    <TabsList className="code-theme-tabs">
                      <TabsTrigger value="recommended">推荐</TabsTrigger>
                      <TabsTrigger value="light">浅色</TabsTrigger>
                      <TabsTrigger value="dark">深色</TabsTrigger>
                    </TabsList>

                    <div className="code-theme-grid">
                      {visibleCodeThemes.map((id) => {
                        const theme = codeThemes[id];
                        const selected = settings.codeTheme === id;
                        return (
                          <button
                            key={id}
                            className={`code-theme-option ${selected ? 'is-active' : ''}`}
                            onClick={() => update('codeTheme', id)}
                            aria-pressed={selected}
                          >
                            <span className="code-theme-option-head">
                              <span>
                                <strong>{theme.name}</strong>
                                <small>{theme.mode === 'dark' ? '深色主题' : '浅色主题'}</small>
                              </span>
                              {selected && (
                                <span className="code-theme-check">
                                  <Check aria-hidden="true" />
                                  已选
                                </span>
                              )}
                            </span>
                            <CodeThemePreview themeId={id} />
                          </button>
                        );
                      })}
                    </div>
                  </Tabs>
                </DialogContent>
              </Dialog>

              <div className="mt-4">
                <Control label="代码字号">
                  <NativeSelect
                    value={settings.codeFontSize}
                    onChange={(event) => update('codeFontSize', Number(event.target.value))}
                    className="w-full"
                  >
                    {CODE_FONT_SIZES.map((size) => (
                      <NativeSelectOption key={size} value={size}>{size} px</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Control>
              </div>
              <div className="mt-4 space-y-3">
                <SwitchRow
                  label="显示语言名称"
                  checked={settings.showCodeLanguage}
                  onChange={() => update('showCodeLanguage', !settings.showCodeLanguage)}
                />
                <SwitchRow
                  label="自动识别未标注语言"
                  checked={settings.autoDetectLanguage}
                  onChange={() => update('autoDetectLanguage', !settings.autoDetectLanguage)}
                />
                <SwitchRow
                  label="长代码自动换行"
                  checked={settings.wrapLongCode}
                  onChange={() => update('wrapLongCode', !settings.wrapLongCode)}
                />
              </div>
            </div>

            <div className="setting-section space-y-3">
              <SwitchRow
                label="显示图片说明"
                checked={settings.showImageCaption}
                onChange={() => update('showImageCaption', !settings.showImageCaption)}
              />
              <SwitchRow
                label="将链接转换为脚注"
                checked={settings.footnoteLinks}
                onChange={() => update('footnoteLinks', !settings.footnoteLinks)}
              />
            </div>

            <div className="setting-section space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-[#d8d1c3] bg-white/60"
                onClick={copyHtml}
              >
                <Code2 /> 复制 HTML 源码
              </Button>
              <button
                className="w-full text-center text-xs text-[#817a6e] underline decoration-[#cfc7b8] underline-offset-4"
                onClick={() => setShowHtml((current) => !current)}
              >
                {showHtml ? '收起最终 HTML' : '检查最终 HTML'}
              </button>
              {showHtml && <pre className="html-inspector">{publishedHtml}</pre>}
            </div>
          </div>
        </aside>
      </section>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="shortcuts-dialog sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>快捷键与专注模式</DialogTitle>
            <DialogDescription>Windows 使用 Ctrl，Mac 使用 ⌘。主题选择支持普通 Ctrl / ⌘ + K，其余工作区快捷键使用 Shift 组合键。</DialogDescription>
          </DialogHeader>
          <dl className="shortcut-list">
            {[
              ['打开主题选择', 'Ctrl / ⌘ + K'],
              ['导入 Markdown / ZIP', 'Ctrl / ⌘ + Shift + O'],
              ['发布检查并确认复制', 'Ctrl / ⌘ + Shift + C'],
              ['切换手机 / PC 预览', 'Ctrl / ⌘ + Shift + P'],
              ['进入 / 退出专注预览', 'Ctrl / ⌘ + Shift + F'],
              ['显示 / 隐藏编辑区', 'Ctrl / ⌘ + Shift + L'],
              ['显示 / 隐藏样式面板', 'Ctrl / ⌘ + Shift + R'],
              ['打开快捷键帮助', 'Ctrl / ⌘ + Shift + K'],
              ['退出专注模式', 'Esc'],
            ].map(([label, keys]) => <div key={keys}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}
          </dl>
          <p className="publish-check-note">普通 Ctrl / ⌘ + C 仍用于复制选中文字。专注模式临时隐藏左右面板，退出后恢复之前的布局；页面需获得焦点。</p>
        </DialogContent>
      </Dialog>

      <Dialog open={publishCheckOpen} onOpenChange={setPublishCheckOpen}>
        <DialogContent className="publish-check-dialog sm:max-w-[680px]">
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <ShieldCheck className="size-4 text-[#b83a2d]" />
              发布检查中心
            </DialogTitle>
            <DialogDescription>
              复制前检查图片、表格、代码与链接。评分为本工具的规则估算，非公众号官方评分。
            </DialogDescription>
          </DialogHeader>

          <section className={`publish-score-card ${publishCheckReport.hasBlockingIssues ? 'has-blocking' : publishCheckReport.score >= 90 ? 'is-good' : 'has-warning'}`}>
            <div className="publish-score-value">
              <span className="sr-only">公众号兼容性评分</span>
              <strong>{publishCheckReport.score}</strong>
              <span>/ 100</span>
            </div>
            <div className="publish-score-copy">
              <strong>
                {publishCheckReport.isEmpty
                  ? '文章内容为空'
                  : publishCheckReport.score >= 90
                    ? '规则检查风险较低'
                    : publishCheckReport.score >= 70
                      ? '建议优化后发布'
                      : '存在较多兼容风险'}
              </strong>
              <p>
                {publishCheckReport.isEmpty
                  ? '请先输入或导入文章，再进行检查。'
                  : publishCheckReport.warningCount
                    ? `发现 ${publishCheckReport.warningCount} 项潜在风险，可确认后继续。`
                    : '本次四项规则检查未发现问题。'}
              </p>
              <div className="publish-score-track" aria-hidden="true">
                <span style={{ width: `${publishCheckReport.score}%` }} />
              </div>
            </div>
          </section>

          <div className="publish-check-list">
            {publishCheckReport.items.map((item) => (
              <article className={`publish-check-item is-${item.severity}`} key={item.id}>
                <div className="publish-check-icon">
                  <PublishCheckIcon item={item} />
                </div>
                <div className="publish-check-copy">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.message}</span>
                  </div>
                  <p>{item.suggestion}</p>
                </div>
                {item.id === 'images' && item.count > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPublishCheckOpen(false);
                      setImageManagerOpen(true);
                    }}
                  >
                    处理图片
                  </Button>
                )}
              </article>
            ))}
          </div>

          <p className="publish-check-note">
            从 100 分起扣：未处理图片每张 12 分（最多 30），高风险表格每个 8 分（最多 20），未声明语言每块 3 分（最多 15），异常链接每个 6 分（最多 20）。表格为宽度风险估算，链接仅检查格式；仍需在公众号内预览确认。
          </p>

          <div className="publish-check-footer">
            <div>
              {publishCheckReport.hasBlockingIssues ? (
                <span className="publish-blocking-note">
                  <CircleAlert /> 请先输入文章内容
                </span>
              ) : (
                <span className="publish-ready-note">
                  <CircleCheckBig /> {unresolvedImageCount ? '图片可稍后补充，不影响复制' : '无阻断项，可确认复制'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPublishCheckOpen(false)}>
                返回修改
              </Button>
              <Button
                className="bg-[#b83a2d] text-white hover:bg-[#9f3026]"
                disabled={publishCheckReport.hasBlockingIssues}
                onClick={() => {
                  setPublishCheckOpen(false);
                  void copyRichText();
                }}
              >
                <Clipboard />
                {publishCheckReport.warningCount ? '确认并复制' : '复制到公众号'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imageManagerOpen} onOpenChange={setImageManagerOpen}>
        <DialogContent className="image-manager-dialog sm:max-w-[820px]">
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <Images className="size-4 text-[#b83a2d]" />
              图片管理
            </DialogTitle>
            <DialogDescription>
              关联本地文件用于预览，可填写远程地址或通过自有接口上传。未处理图片不影响复制，会以文字占位，可在公众号中补充。
            </DialogDescription>
          </DialogHeader>

          <div className="image-manager-summary">
            <span><strong>{localImageCount}</strong> 本地引用</span>
            <span><strong>{matchedImageCount}</strong> 已匹配</span>
            <span className={publishedImageCount === localImageCount ? 'is-ready' : ''}>
              <strong>{publishedImageCount}</strong> 已发布
            </span>
            {unresolvedImageCount > 0 && (
              <span className="has-warning"><strong>{unresolvedImageCount}</strong> 待处理</span>
            )}
          </div>

          <div className="image-manager-actions">
            <Button
              variant="outline"
              className="border-[#d8d1c3] bg-white"
              onClick={() => imageFolderInputRef.current?.click()}
            >
              <FolderOpen /> 关联图片目录
            </Button>
            <Button
              variant="outline"
              className="border-[#d8d1c3] bg-white"
              onClick={() => imageZipInputRef.current?.click()}
            >
              <Archive /> 导入图片 ZIP
            </Button>
            {associatedImages.length > 0 && (
              <Button
                variant="ghost"
                className="text-[#8a4d43]"
                onClick={clearAssociatedImages}
              >
                <Trash2 /> 清除关联
              </Button>
            )}
          </div>

          {localImageCount === 0 ? (
            <div className="image-manager-empty">
              <Images />
              <strong>当前文章没有本地图片</strong>
              <p>导入包含相对路径图片的 Markdown 或 ZIP 后，图片会出现在这里。</p>
            </div>
          ) : (
            <div className="image-manager-list">
              {imageRows.map((row) => {
                const isPublished = isPublishedImageUrl(row.publishedUrl);
                const isUploading = row.uploadState === 'uploading';
                return (
                  <article className="image-manager-item" key={row.reference.key}>
                    <div className="image-manager-thumb">
                      {row.match ? (
                        // Local blob previews cannot use framework image optimization.
                        // oxlint-disable-next-line next/no-img-element
                        <img src={row.match.previewUrl} alt="" />
                      ) : (
                        <CircleAlert aria-hidden="true" />
                      )}
                    </div>
                    <div className="image-manager-meta">
                      <div className="image-manager-item-head">
                        <div className="min-w-0">
                          <strong>{row.reference.alt || row.reference.source.split(/[\\/]/).pop()}</strong>
                          <small title={row.reference.source}>{row.reference.source}</small>
                        </div>
                        <span className={`image-status ${isPublished ? 'is-published' : row.match ? 'is-matched' : 'is-missing'}`}>
                          {isPublished ? '已发布' : row.match ? '已匹配' : '缺少文件'}
                        </span>
                      </div>
                      {row.match && (
                        <p className="image-file-detail">
                          {row.match.relativePath} · {formatBytes(row.match.file.size)}
                        </p>
                      )}
                      <div className="image-url-row">
                        <Link2 aria-hidden="true" />
                        <Input
                          aria-label={`${row.reference.alt || row.reference.source} 的远程图片地址`}
                          placeholder="粘贴 HTTPS 图片地址，或使用下方接口上传"
                          value={row.publishedUrl}
                          onChange={(event) => setPublishedImageUrls((current) => ({
                            ...current,
                            [row.reference.key]: event.target.value,
                          }))}
                        />
                        {row.match && !isPublished && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUploading}
                            onClick={() => void uploadImage(row.reference.key)}
                          >
                            {isUploading
                              ? <LoaderCircle className="animate-spin" />
                              : <CloudUpload />}
                            {isUploading ? '上传中' : '上传'}
                          </Button>
                        )}
                      </div>
                      {row.uploadState === 'error' && (
                        <p className="image-upload-error">上传失败，可重试或手动填写远程地址。</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {localImageCount > 0 && (
            <div className="image-upload-config">
              <div>
                <strong>自有图片上传接口</strong>
                <p>以 multipart/form-data POST 文件；接口需返回 url、location 或 data.url。</p>
              </div>
              <div className="image-upload-endpoint">
                <Input
                  type="url"
                  aria-label="图片上传接口"
                  placeholder="https://your-domain.com/api/images"
                  value={uploadEndpoint}
                  onChange={(event) => setUploadEndpoint(event.target.value)}
                />
                <Button
                  className="bg-[#b83a2d] text-white hover:bg-[#9f3026]"
                  disabled={!imageRows.some((row) => row.match && !isPublishedImageUrl(row.publishedUrl))}
                  onClick={() => void uploadAllImages()}
                >
                  <CloudUpload /> 上传全部
                </Button>
              </div>
              <p className="image-upload-safety">
                不要在地址中填写 OSS/COS 密钥。上传签名应由你自己的服务端接口完成。
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {notice && (
        <output className="notice">
          <Check className="size-4" />
          {notice}
        </output>
      )}
    </main>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="setting-label">{label}</span>
      {children}
    </label>
  );
}

function PublishCheckIcon({ item }: { item: PublishCheckItem }) {
  if (item.severity === 'pass') return <CircleCheckBig aria-hidden="true" />;
  if (item.id === 'images') return <ImageOff aria-hidden="true" />;
  if (item.id === 'tables') return <Table2 aria-hidden="true" />;
  if (item.id === 'code-language') return <Braces aria-hidden="true" />;
  return <Link2 aria-hidden="true" />;
}

function CodeThemePreview({
  themeId,
  compact = false,
}: {
  themeId: CodeThemeId;
  compact?: boolean;
}) {
  const theme = codeThemes[themeId];
  const token = theme.tokens;

  return (
    <span
      className={`code-theme-preview ${compact ? 'is-compact' : ''}`}
      style={{
        background: theme.background,
        borderColor: theme.border,
        color: theme.foreground,
      }}
      aria-hidden="true"
    >
      <code>
        <span style={{ color: token.keyword }}>type</span>{' '}
        <span style={{ color: token.type }}>Result</span> = {'{'} ok: {' '}
        <span style={{ color: token.type }}>boolean</span> {'}'};{`\n`}
        <span style={{ color: token.keyword }}>export async function</span>{' '}
        <span style={{ color: token.function }}>allow</span>(
        <span style={{ color: token.variable }}>key</span>: {' '}
        <span style={{ color: token.type }}>string</span>) {'{'}{`\n`}
        {'  '}<span style={{ color: token.comment }}>{'// sliding window limit'}</span>{`\n`}
        {'  '}<span style={{ color: token.keyword }}>return</span>{' '}
        <span style={{ color: token.variable }}>requests</span>.
        <span style={{ color: token.property }}>length</span> {'<'} {' '}
        <span style={{ color: token.number }}>100</span>;{`\n`}
        {'}'}
      </code>
    </span>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="setting-label mb-0">{label}</span>
      <button
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={onChange}
        className={`toggle ${checked ? 'is-on' : ''}`}
      >
        <span />
      </button>
    </div>
  );
}
