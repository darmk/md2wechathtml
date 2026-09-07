'use client';

import { useEffect, useState } from 'react';
import { themes, type ThemeId } from '@/lib/article-themes';
import { readThemeLibrary, themeLibraryKey, type ThemeLibrary } from '@/lib/theme-library';
import { recentSelection } from '@/lib/workspace-tools';

export function useThemeLibrary() {
  const [library, setLibrary] = useState<ThemeLibrary>({ favorites: [], recent: [] });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let restored: ThemeLibrary = { favorites: [], recent: [] };
    try { restored = readThemeLibrary(localStorage.getItem(themeLibraryKey), Object.keys(themes)); } catch { /* Storage can be disabled. */ }
    queueMicrotask(() => { setLibrary(restored); setLoaded(true); });
  }, []);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(themeLibraryKey, JSON.stringify(library)); } catch { /* Preferences stay in memory. */ }
  }, [library, loaded]);
  return {
    library,
    toggleFavorite: (id: ThemeId) => setLibrary((current) => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter((item) => item !== id) : [...current.favorites, id] })),
    recordSelection: (id: ThemeId) => setLibrary((current) => ({ ...current, recent: recentSelection(current.recent, id) })),
  };
}
