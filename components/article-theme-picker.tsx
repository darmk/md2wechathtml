'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Clock3, Palette, Search, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themeCategories, themes, type ThemeId } from '@/lib/article-themes';
import { filterArticleThemes, type ThemeFilter, type ThemeLibrary } from '@/lib/theme-library';

const pickerCategories: Array<{ id: ThemeFilter; name: string }> = [
  ...themeCategories,
  { id: 'favorites', name: '我的收藏' },
  { id: 'recent', name: '最近使用' },
];

export function ArticleThemePicker({ selected, library, onSelect, onOpenGallery }: {
  selected: ThemeId; library: ThemeLibrary; onSelect: (id: ThemeId) => void; onOpenGallery: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ThemeFilter>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const ids = useMemo(
    () => filterArticleThemes(themes, filter, query, library),
    [filter, library, query],
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    const openPicker = () => setOpen(true);
    window.addEventListener('open-theme-picker', openPicker);
    return () => window.removeEventListener('open-theme-picker', openPicker);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function choose(id: ThemeId) {
    onSelect(id);
    setOpen(false);
  }

  const current = themes[selected];
  return <div className="quick-theme-picker">
    <button
      type="button"
      className="quick-theme-current"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`选择文章主题，当前为 ${current.name}`}
      onClick={() => setOpen(true)}
    >
      <span className="theme-color-dot" style={{ background: current.accent }} aria-hidden="true" />
      <span className="quick-theme-current-copy">
        <strong>{current.name}</strong>
        <small>{current.englishName} · {current.description}</small>
      </span>
      <ChevronDown className="quick-theme-current-chevron" aria-hidden="true" />
    </button>

    <Button variant="link" className="quick-gallery-link" onClick={onOpenGallery}>
      <Palette aria-hidden="true" />浏览主题画廊 <span aria-hidden="true">→</span>
    </Button>

    {open && typeof document !== 'undefined' && createPortal(<>
      <button type="button" className="theme-picker-backdrop" aria-label="关闭主题选择" onClick={() => setOpen(false)} />
      <aside className="theme-picker-drawer" aria-label="选择文章主题">
        <header className="theme-picker-drawer-head">
          <div>
            <span className="theme-picker-eyebrow">ARTICLE THEME</span>
            <h3>选择文章主题</h3>
            <p>{Object.keys(themes).length} 套主题 · 点击即可即时切换</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="关闭主题选择" onClick={() => setOpen(false)}><X /></Button>
        </header>

        <label className="theme-picker-search">
          <Search aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、风格或用途…"
            aria-label="搜索文章主题"
          />
          {query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}><X /></button>}
        </label>

        <nav className="theme-picker-filters" aria-label="主题分类">
          {pickerCategories.map((item) => <button
            type="button"
            key={item.id}
            className={filter === item.id ? 'is-active' : ''}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.id === 'recent' && <Clock3 aria-hidden="true" />}
            {item.id === 'favorites' && <Star aria-hidden="true" />}
            {item.name}
          </button>)}
        </nav>

        <div className="theme-picker-result-head">
          <span>{filter === 'recent' ? '最近使用' : filter === 'favorites' ? '我的收藏' : '主题列表'}</span>
          <small>{ids.length} 套</small>
        </div>

        <div className="theme-picker-list" aria-label="主题列表">
          {ids.map((id) => {
            const theme = themes[id];
            const selectedTheme = id === selected;
            const category = themeCategories.find((item) => item.id === theme.category)?.name ?? '通用';
            return <button
              type="button"
              aria-pressed={selectedTheme}
              key={id}
              className={`theme-picker-item ${selectedTheme ? 'is-active' : ''}`}
              onClick={() => choose(id)}
            >
              <span className="theme-picker-item-mark" style={{ background: theme.accent }} aria-hidden="true" />
              <span className="theme-picker-item-copy">
                <strong>{theme.name}</strong>
                <small>{theme.englishName} · {category} · {theme.description}</small>
              </span>
              {library.favorites.includes(id) && <Star className="theme-picker-favorite" aria-label="已收藏" />}
              {selectedTheme && <Check className="theme-picker-check" aria-label="当前主题" />}
            </button>;
          })}
          {!ids.length && <div className="theme-picker-empty">没有找到匹配的主题</div>}
        </div>

        <footer className="theme-picker-drawer-foot">
          <span>当前：{current.name}</span>
          <Button variant="link" onClick={() => { setOpen(false); onOpenGallery(); }}>查看完整主题画廊 <span aria-hidden="true">→</span></Button>
        </footer>
      </aside>
    </>, document.body)}
  </div>;
}
