'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Monitor, Search, Smartphone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteAssetPath } from '@/lib/site-path';
import { Input } from '@/components/ui/input';
import { buildWechatHtml, codeThemes, themes, themeCategories, type EditorSettings, type ThemeId } from '@/lib/wechat-markdown';
import { filterArticleThemes, galleryCardSample, galleryFullSample, type ThemeFilter, type ThemeLibrary } from '@/lib/theme-library';
import { articleUseCaseLabels as purposeLabels, themeUseCases, resolveArticleTheme, type PaletteId, type UseCase } from '@/lib/article-themes';
import { ThemePaletteControl } from '@/components/theme-extras';

type GalleryPurpose = 'all' | UseCase;

function previewDocument(html: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html{background:white}body{margin:0;padding:28px 24px;box-sizing:border-box}a{pointer-events:none}img{max-width:100%}</style></head><body>${html}</body></html>`;
}

export function ThemeGallery({ active, settings, markdown, library, onFavorite, onApply, onBack }: {
  active: boolean; settings: EditorSettings; markdown: string; library: ThemeLibrary;
  onFavorite: (id: ThemeId) => void; onApply: (id: ThemeId, palette: PaletteId, codeTheme?: EditorSettings['codeTheme']) => void; onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ThemeFilter>('all');
  const [purpose, setPurpose] = useState<GalleryPurpose>('all');
  const [palette, setPalette] = useState<PaletteId>('original');
  const [pairCode, setPairCode] = useState(false);
  const [detail, setDetail] = useState<ThemeId | null>(null);
  const [source, setSource] = useState<'sample' | 'article'>('sample');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const listPositionRef = useRef({ top: 0, pageY: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const lastCardRef = useRef<ThemeId | null>(null);
  const ids = useMemo(() => filterArticleThemes(themes, filter, query, library, purpose), [filter, query, library, purpose]);
  const cards = useMemo(() => active ? Object.fromEntries(ids.map((id) => [id, previewDocument(buildWechatHtml(galleryCardSample, { ...settings, theme: id, headingStyle: 'theme', palette: 'original' }))])) : {}, [active, ids, settings]);
  const fullPreview = useMemo(() => {
    if (!active || !detail) return '';
    const content = source === 'article' ? markdown : galleryFullSample(new URL(siteAssetPath('og.png'), window.location.origin).href);
    return previewDocument(buildWechatHtml(content, { ...settings, theme: detail, headingStyle: 'theme', palette, codeTheme: pairCode ? themes[detail].recommendedCodeTheme ?? settings.codeTheme : settings.codeTheme }));
  }, [active, detail, source, markdown, settings, palette, pairCode]);

  function viewDetail(id: ThemeId) {
    listPositionRef.current = { top: galleryRef.current?.scrollTop ?? 0, pageY: window.scrollY };
    lastCardRef.current = id;
    setDetail(id);
    setPalette(id === settings.theme ? settings.palette ?? 'original' : 'original');
    setPairCode(false);
    requestAnimationFrame(() => {
      if (galleryRef.current) galleryRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
      detailTitleRef.current?.focus({ preventScroll: true });
    });
  }
  function backToGrid() {
    setDetail(null);
    requestAnimationFrame(() => {
      if (galleryRef.current) galleryRef.current.scrollTop = listPositionRef.current.top;
      window.scrollTo({ top: listPositionRef.current.pageY, behavior: 'instant' });
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-theme-card="${lastCardRef.current}"]`)?.focus({ preventScroll: true });
    });
  }
  function favoriteButton(id: ThemeId) {
    const saved = library.favorites.includes(id);
    return <Button variant="ghost" size="sm" className="gallery-favorite" aria-label={`${saved ? '取消收藏' : '收藏'} ${themes[id].name}`} aria-pressed={saved} onClick={() => onFavorite(id)}><Star className={saved ? 'is-favorite' : ''} />{saved ? '已收藏' : '收藏'}</Button>;
  }

  return <section ref={galleryRef} className="theme-gallery" hidden={!active} aria-label="主题画廊">
    <div className="gallery-list-view" hidden={detail !== null}>
      <div className="gallery-heading">
        <div><span className="gallery-eyebrow">THEME COLLECTION</span><h2>为好内容，找到好风格。</h2><p>完整浏览 {Object.keys(themes).length} 套主题。查看不会修改文章，确认应用后才会生效。</p></div>
        <Button variant="outline" onClick={onBack}><ArrowLeft />返回编辑器</Button>
      </div>
      <div className="gallery-filters">
        <div className="theme-search"><Search className="size-4" /><Input aria-label="搜索画廊主题" placeholder="搜索名称或风格，例如 Apple、科技、东方…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="theme-filters article-theme-filters" aria-label="主题分类">
          {[...themeCategories, { id: 'favorites', name: '我的收藏' }, { id: 'recent', name: '最近使用' }].map((item) => <Button key={item.id} variant="ghost" size="sm" aria-pressed={filter === item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id as ThemeFilter)}>{item.name}</Button>)}
        </div>
        <label className="gallery-purpose">文章用途 <select aria-label="按文章用途筛选" value={purpose} onChange={event => setPurpose(event.target.value as GalleryPurpose)}>{Object.entries(purposeLabels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <p className="gallery-count">{ids.length} 套主题 · 当前使用 {themes[settings.theme].name} · 卡片为示例节选，详情展示完整文章</p>
      </div>
      <div ref={gridRef} className="gallery-card-grid">
        {ids.map((id) => <article key={id} className={`gallery-card ${settings.theme === id ? 'is-current' : ''}`}>
          <div className="gallery-card-heading"><div><h3>{themes[id].name}{settings.theme === id && <Check className="size-4" />}</h3><p>{themes[id].englishName} · {themes[id].description}</p></div>{favoriteButton(id)}</div>
          <p className="gallery-tags">{themeUseCases(themes[id]).map(key => <span key={key}>{purposeLabels[key]}</span>)}</p>
          <button className="gallery-card-open" data-theme-card={id} aria-label={`查看 ${themes[id].name} 完整示例`} onClick={() => viewDetail(id)}>
            {active && <iframe title={`${themes[id].name} 主题节选`} sandbox="" tabIndex={-1} inert srcDoc={cards[id] ?? ''} loading="lazy" />}
            <span>查看完整示例 <ArrowRight className="size-4" /></span>
          </button>
        </article>)}
        {!ids.length && <div className="gallery-empty"><h3>没有符合筛选条件的主题</h3><p>试试其他用途或分类，也可以收藏喜欢的主题。</p><Button variant="outline" onClick={() => { setQuery(''); setFilter('all'); setPurpose('all'); }}>查看全部主题</Button></div>}
      </div>
    </div>

    {detail && <div className="gallery-detail-view">
      <div className="gallery-detail-toolbar"><Button variant="ghost" onClick={backToGrid}><ArrowLeft />返回画廊</Button><span>主题详情 / {themes[detail].name}</span><Button variant="outline" onClick={onBack}>返回编辑器</Button></div>
      <div className="gallery-detail-layout">
        <aside className="gallery-detail-info">
          <span className="gallery-eyebrow">{themes[detail].englishName}</span>
          <h2 ref={detailTitleRef} tabIndex={-1}>{themes[detail].name}</h2><p>{themes[detail].description}</p>
          <div className="gallery-swatches" aria-label="主题颜色示例">{[resolveArticleTheme(detail, palette).accent, themes[detail].text, resolveArticleTheme(detail, palette).quote].map((color, index) => <span key={index} title={color} style={{ background: color }} />)}</div>
          <ThemePaletteControl value={palette} onChange={setPalette} />
          {favoriteButton(detail)}
          <dl><dt>正文</dt><dd>{settings.fontSize}px · {settings.lineHeight} 倍行高</dd><dt>代码主题</dt><dd>{codeThemes[pairCode ? themes[detail].recommendedCodeTheme ?? settings.codeTheme : settings.codeTheme].name}{pairCode ? '（推荐搭配）' : '（保持不变）'}</dd><dt>标准示例包含</dt><dd>多级标题、强调、引用、列表、图片、表格、链接及三种语言代码。</dd></dl>
          {themes[detail].recommendedCodeTheme && <label className="gallery-code-pair"><input type="checkbox" checked={pairCode} onChange={event => setPairCode(event.target.checked)} />同时应用推荐代码主题：{codeThemes[themes[detail].recommendedCodeTheme!].name}</label>}
          <p className="theme-extra-note">兼容状态：本地规则验证 · 待公众号实测。配色不会改变原文。</p>
          <p className="gallery-safety-note">仅试看，不会替换你的原文或更改当前主题。我的文章预览使用现有图片关联。</p>
          <Button className="gallery-apply" onClick={() => onApply(detail, palette, pairCode ? themes[detail].recommendedCodeTheme : undefined)}><Check />应用主题与配色并返回</Button>
        </aside>
        <div className="gallery-reader">
          <div className="gallery-reader-controls">
            <div className="device-switch" aria-label="示例来源"><button className={source === 'sample' ? 'is-active' : ''} aria-pressed={source === 'sample'} onClick={() => setSource('sample')}>标准示例</button><button className={source === 'article' ? 'is-active' : ''} aria-pressed={source === 'article'} onClick={() => setSource('article')}>用我的文章预览</button></div>
            <div className="device-switch" aria-label="画廊预览设备"><button className={device === 'mobile' ? 'is-active' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone />手机</button><button className={device === 'desktop' ? 'is-active' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor />PC</button></div>
          </div>
          {source === 'article' && !markdown.trim() ? <div className="gallery-empty"><h3>当前文章为空</h3><p>先返回编辑器输入文章，或使用标准示例查看主题。</p><Button onClick={() => setSource('sample')}>查看标准示例</Button></div> : active && <iframe key={`${detail}-${source}-${device}`} className={`gallery-full-preview ${device}`} title={`${themes[detail].name} ${source === 'sample' ? '完整标准示例' : '我的文章'}预览`} sandbox="" srcDoc={fullPreview} />}
          <p className="gallery-reader-note">正常字号预览，可在文章内向下滚动查看全部内容。窄屏自动适配宽度。</p>
        </div>
      </div>
    </div>}
  </section>;
}
