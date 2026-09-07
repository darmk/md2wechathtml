'use client';

import { paletteVariants, type PaletteId } from '@/lib/article-themes';

export function ThemePaletteControl({ value = 'original', onChange }: { value?: PaletteId; onChange: (id: PaletteId) => void }) {
  return <label className="theme-extra-label">主题配色<select aria-label="主题配色" value={value} onChange={event => onChange(event.target.value as PaletteId)}>{Object.entries(paletteVariants).map(([id, palette]) => <option key={id} value={id}>{palette.name}</option>)}</select></label>;
}
