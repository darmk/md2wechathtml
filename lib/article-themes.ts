export type ThemeCategory =
  | 'minimal'
  | 'tech'
  | 'editorial'
  | 'oriental'
  | 'lifestyle'
  | 'brand';

type BaseThemeId =
  | 'minimalist'
  | 'apple'
  | 'byte'
  | 'vercel'
  | 'notion'
  | 'tech-blue'
  | 'github'
  | 'future-purple'
  | 'magazine'
  | 'editorial'
  | 'green'
  | 'orange'
  | 'ink'
  | 'book'
  | 'neo-chinese'
  | 'dark-code';

export type ThemeId = BaseThemeId | 'apple-paper' | 'swiss-grid' | 'linear' | 'blueprint' | 'terminal' | 'neon-lab' | 'weekend' | 'newsbrief' | 'casefile' | 'rice-paper' | 'indigo' | 'song' | 'cream' | 'forest-letter' | 'bauhaus' | 'orange-release';
export const articleUseCaseLabels = { all: '全部用途', tutorial: '技术教程', release: '产品发布', essay: '深度长文', news: '资讯简报', journal: '随笔分享' } as const;
export const useCases = articleUseCaseLabels;
export type UseCase = Exclude<keyof typeof articleUseCaseLabels, 'all'>;
export type ThemeLayout = 'classic' | 'paper' | 'swiss' | 'blueprint' | 'terminal' | 'column' | 'archive' | 'letter' | 'geometric';

export type ArticleTheme = {
  name: string;
  englishName: string;
  category: ThemeCategory;
  recommended?: boolean;
  description: string;
  accent: string;
  accent2: string;
  soft: string;
  text: string;
  muted: string;
  border: string;
  quote: string;
  titleFont: string;
  h1Align: 'left' | 'center';
  h1Border: 'none' | 'bottom' | 'top-bottom';
  h1SizeOffset: number;
  headingWeight: number;
  paragraphSpacing: number;
  quoteRadius: number;
  layout?: ThemeLayout;
  useCases?: UseCase[];
  recommendedCodeTheme?: import('./code-themes').CodeThemeId;
};

export const themeCategories: Array<{
  id: 'all' | 'featured' | ThemeCategory;
  name: string;
}> = [
  { id: 'all', name: '全部' },
  { id: 'featured', name: '精选' },
  { id: 'minimal', name: '极简' },
  { id: 'tech', name: '科技' },
  { id: 'editorial', name: '内容' },
  { id: 'oriental', name: '东方' },
  { id: 'lifestyle', name: '生活' },
  { id: 'brand', name: '品牌' },
];

const baseThemes: Record<BaseThemeId, ArticleTheme> = {
  minimalist: {
    name: '简约白', englishName: 'Minimal', category: 'minimal', recommended: true,
    description: '克制留白，通用耐读', accent: '#242424', accent2: '#707070', soft: '#f4f4f2', text: '#333333', muted: '#77736c', border: '#dedbd5', quote: '#f5f5f3', titleFont: 'system-ui', h1Align: 'center', h1Border: 'bottom', h1SizeOffset: 8, headingWeight: 760, paragraphSpacing: 1, quoteRadius: 7,
  },
  apple: {
    name: 'Apple 简约', englishName: 'Apple', category: 'minimal', recommended: true,
    description: '大留白，精致产品感', accent: '#0071e3', accent2: '#1d1d1f', soft: '#f5f5f7', text: '#1d1d1f', muted: '#6e6e73', border: '#d2d2d7', quote: '#f5f5f7', titleFont: '-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', h1Align: 'left', h1Border: 'none', h1SizeOffset: 14, headingWeight: 720, paragraphSpacing: 1.18, quoteRadius: 14,
  },
  byte: {
    name: '字节科技', englishName: 'Byte Tech', category: 'tech', recommended: true,
    description: '清晰锐利，信息密度高', accent: '#2f7cf6', accent2: '#f54a45', soft: '#eef4ff', text: '#1f2329', muted: '#646a73', border: '#cbd9ef', quote: '#f2f6ff', titleFont: 'system-ui', h1Align: 'left', h1Border: 'top-bottom', h1SizeOffset: 10, headingWeight: 780, paragraphSpacing: .95, quoteRadius: 4,
  },
  vercel: {
    name: 'Vercel 黑白', englishName: 'Vercel', category: 'minimal',
    description: '黑白几何，前端感强', accent: '#000000', accent2: '#666666', soft: '#fafafa', text: '#111111', muted: '#666666', border: '#e5e5e5', quote: '#fafafa', titleFont: 'Arial,system-ui,sans-serif', h1Align: 'left', h1Border: 'bottom', h1SizeOffset: 12, headingWeight: 800, paragraphSpacing: 1.08, quoteRadius: 0,
  },
  notion: {
    name: 'Notion 文档', englishName: 'Notion', category: 'minimal',
    description: '知识库感，清爽实用', accent: '#37352f', accent2: '#9b9a97', soft: '#f7f6f3', text: '#37352f', muted: '#787774', border: '#deddda', quote: '#f7f6f3', titleFont: 'ui-sans-serif,system-ui', h1Align: 'left', h1Border: 'none', h1SizeOffset: 11, headingWeight: 720, paragraphSpacing: .92, quoteRadius: 3,
  },
  'tech-blue': {
    name: '科技蓝', englishName: 'Tech Blue', category: 'tech', recommended: true,
    description: '理性清晰，适合教程', accent: '#1769aa', accent2: '#36a9e1', soft: '#eaf4fb', text: '#27313a', muted: '#697986', border: '#bfd7e8', quote: '#eef7fc', titleFont: 'system-ui', h1Align: 'center', h1Border: 'bottom', h1SizeOffset: 8, headingWeight: 750, paragraphSpacing: 1, quoteRadius: 7,
  },
  github: {
    name: 'GitHub 风', englishName: 'GitHub', category: 'tech',
    description: '开发者熟悉的阅读感', accent: '#0969da', accent2: '#1f883d', soft: '#f6f8fa', text: '#24292f', muted: '#57606a', border: '#d0d7de', quote: '#f6f8fa', titleFont: 'system-ui', h1Align: 'left', h1Border: 'bottom', h1SizeOffset: 8, headingWeight: 650, paragraphSpacing: 1, quoteRadius: 6,
  },
  'future-purple': {
    name: '未来紫', englishName: 'Future AI', category: 'tech',
    description: '蓝紫渐进，适合 AI 内容', accent: '#6750d8', accent2: '#2489e8', soft: '#f0edff', text: '#28243a', muted: '#716b82', border: '#d5cef4', quote: '#f4f1ff', titleFont: 'system-ui', h1Align: 'left', h1Border: 'bottom', h1SizeOffset: 11, headingWeight: 780, paragraphSpacing: 1, quoteRadius: 12,
  },
  magazine: {
    name: '杂志风', englishName: 'Magazine', category: 'editorial', recommended: true,
    description: '强层级，醒目有张力', accent: '#c92b34', accent2: '#282424', soft: '#f9ecec', text: '#2b2525', muted: '#7d6b6c', border: '#e2c7c8', quote: '#fbf1ef', titleFont: 'Georgia,"Songti SC",serif', h1Align: 'left', h1Border: 'top-bottom', h1SizeOffset: 14, headingWeight: 800, paragraphSpacing: 1.12, quoteRadius: 0,
  },
  editorial: {
    name: '编辑部', englishName: 'Editorial', category: 'editorial',
    description: '深度报道，专业媒体感', accent: '#8c2d26', accent2: '#c89a52', soft: '#f8f2e8', text: '#2b2925', muted: '#756f65', border: '#ded1be', quote: '#faf5ec', titleFont: 'Georgia,"Songti SC",serif', h1Align: 'center', h1Border: 'top-bottom', h1SizeOffset: 13, headingWeight: 700, paragraphSpacing: 1.18, quoteRadius: 0,
  },
  green: {
    name: '清新绿', englishName: 'Fresh Green', category: 'editorial',
    description: '轻盈柔和，知识分享', accent: '#258460', accent2: '#64b58d', soft: '#eaf6f0', text: '#26372f', muted: '#657a70', border: '#bfdccd', quote: '#edf8f3', titleFont: 'system-ui', h1Align: 'center', h1Border: 'bottom', h1SizeOffset: 8, headingWeight: 740, paragraphSpacing: 1, quoteRadius: 10,
  },
  orange: {
    name: '活力橙', englishName: 'Orange', category: 'editorial',
    description: '温暖突出，实战复盘', accent: '#c45b20', accent2: '#e2a137', soft: '#fff1e7', text: '#3a2e27', muted: '#816f63', border: '#ecc9ae', quote: '#fff5ed', titleFont: 'system-ui', h1Align: 'center', h1Border: 'bottom', h1SizeOffset: 9, headingWeight: 780, paragraphSpacing: 1, quoteRadius: 10,
  },
  ink: {
    name: '水墨风', englishName: 'Ink', category: 'oriental', recommended: true,
    description: '温润克制，适合长文', accent: '#485248', accent2: '#8b312b', soft: '#eff1eb', text: '#302f2b', muted: '#77766d', border: '#cfd2c7', quote: '#f2f3ed', titleFont: 'STSong,SimSun,serif', h1Align: 'center', h1Border: 'none', h1SizeOffset: 12, headingWeight: 700, paragraphSpacing: 1.2, quoteRadius: 0,
  },
  book: {
    name: '书卷', englishName: 'Book', category: 'oriental',
    description: '米白暖棕，中文长文感', accent: '#6f3f2c', accent2: '#a24135', soft: '#f6efe4', text: '#392f28', muted: '#7e6f64', border: '#ddcdbb', quote: '#f8f1e8', titleFont: 'STKaiti,KaiTi,"Songti SC",serif', h1Align: 'center', h1Border: 'top-bottom', h1SizeOffset: 13, headingWeight: 650, paragraphSpacing: 1.25, quoteRadius: 2,
  },
  'neo-chinese': {
    name: '新中式', englishName: 'Neo Chinese', category: 'oriental',
    description: '墨黑朱红，传统与现代', accent: '#a12c23', accent2: '#22211f', soft: '#f6eee8', text: '#292724', muted: '#746e66', border: '#dec9bd', quote: '#f8f1ec', titleFont: '"Songti SC",STSong,serif', h1Align: 'center', h1Border: 'bottom', h1SizeOffset: 12, headingWeight: 730, paragraphSpacing: 1.16, quoteRadius: 2,
  },
  'dark-code': {
    name: '深色代码', englishName: 'Dark Code', category: 'tech',
    description: '浅色正文，突出代码块', accent: '#6956a8', accent2: '#2e8bba', soft: '#f0edfa', text: '#2f2b38', muted: '#756f83', border: '#d2c9eb', quote: '#f4f1fb', titleFont: 'system-ui', h1Align: 'left', h1Border: 'bottom', h1SizeOffset: 9, headingWeight: 780, paragraphSpacing: 1, quoteRadius: 8,
  },
};

function preset(base: BaseThemeId, name: string, englishName: string, description: string, layout: ThemeLayout, overrides: Partial<ArticleTheme>): ArticleTheme {
  return { ...baseThemes[base], recommended: false, name, englishName, description, layout, ...overrides };
}

export const themes: Record<ThemeId, ArticleTheme> = {
  ...baseThemes,
  'apple-paper': preset('apple', 'Apple Paper', 'Apple Paper', '纸感标题区，柔和引述与宽松留白', 'paper', { recommended: true, useCases: ['essay', 'release'], recommendedCodeTheme: 'github-light', soft: '#f5f3ef', quote: '#f8f7f4', accent: '#456477', h1SizeOffset: 15 }),
  'swiss-grid': preset('vercel', '瑞士网格', 'Swiss Grid', '左对齐层级，粗细线条形成阅读秩序', 'swiss', { recommended: true, useCases: ['tutorial', 'essay'], recommendedCodeTheme: 'github-light', accent: '#bd302c', h1Border: 'top-bottom', h1SizeOffset: 16, paragraphSpacing: 1.15 }),
  linear: preset('notion', 'Linear 工程', 'Linear Engineering', '轻量工程文档，紧凑标题与细边框提示', 'archive', { category: 'tech', useCases: ['tutorial', 'release'], recommendedCodeTheme: 'github-dark', accent: '#5e56bd', soft: '#f2f0fa', border: '#d8d5e9', quote: '#f8f7fc', quoteRadius: 6 }),
  blueprint: preset('tech-blue', '工程蓝图', 'Engineering Blueprint', '蓝色双线与虚线分区，强调工程层次', 'blueprint', { recommended: true, useCases: ['tutorial'], recommendedCodeTheme: 'github-light', h1Align: 'left', accent: '#235b91', h1Border: 'top-bottom', quoteRadius: 0 }),
  terminal: preset('github', '终端手册', 'Terminal Manual', '等宽章节标签，命令教程与清单式阅读', 'terminal', { useCases: ['tutorial'], recommendedCodeTheme: 'vscode-dark', accent: '#23724e', soft: '#edf5ef', quote: '#f3f7f4', border: '#c7d9ce', titleFont: 'Consolas,"Microsoft YaHei",monospace', h1SizeOffset: 9 }),
  'neon-lab': preset('future-purple', '霓虹实验室', 'Neon Lab', '紫色几何强调，浅底正文保持清晰', 'geometric', { useCases: ['release', 'tutorial'], recommendedCodeTheme: 'tokyo-night', accent: '#7243c7', accent2: '#15848a', h1Border: 'bottom', quoteRadius: 0 }),
  weekend: preset('editorial', '周末专栏', 'Weekend Column', '衬线标题、居中引述与舒展段落', 'column', { recommended: true, useCases: ['essay', 'journal'], recommendedCodeTheme: 'solarized-light', accent: '#725347', h1Border: 'none', paragraphSpacing: 1.3 }),
  newsbrief: preset('magazine', '新闻简报', 'News Brief', '紧凑黑红报刊，细双线分隔与醒目小节', 'swiss', { useCases: ['news'], recommendedCodeTheme: 'github-light', h1SizeOffset: 10, paragraphSpacing: .85, accent: '#a12930', quoteRadius: 0 }),
  casefile: preset('notion', '案例档案', 'Case File', '卡片式章节与完整边框引用，便于复盘', 'archive', { category: 'editorial', useCases: ['essay', 'tutorial'], recommendedCodeTheme: 'github-light', accent: '#426774', soft: '#edf3f4', quote: '#f5f8f8', border: '#cbdadb' }),
  'rice-paper': preset('ink', '宣纸', 'Rice Paper', '温润墨色，纸感标题与淡线留白', 'paper', { useCases: ['essay', 'journal'], recommendedCodeTheme: 'solarized-light', accent: '#666049', soft: '#f6f3e9', quote: '#f8f6ef', paragraphSpacing: 1.3 }),
  indigo: preset('ink', '青黛', 'Indigo', '青蓝细线、衬线章节与克制的引用', 'column', { recommended: true, useCases: ['essay', 'journal'], recommendedCodeTheme: 'nord', accent: '#345b68', soft: '#edf3f4', border: '#c8d8dd', quote: '#f3f7f7', h1Border: 'bottom' }),
  song: preset('neo-chinese', '宋韵', 'Song Poetry', '朱红章节签，宋体正文标题与端正边框', 'archive', { useCases: ['essay', 'journal'], recommendedCodeTheme: 'solarized-light', accent: '#994237', quoteRadius: 0, h1Border: 'top-bottom' }),
  cream: preset('book', '奶油手记', 'Cream Notes', '暖杏标题卡与圆角引述，轻松分享', 'letter', { recommended: true, category: 'lifestyle', useCases: ['journal'], recommendedCodeTheme: 'solarized-light', titleFont: '"PingFang SC","Microsoft YaHei",sans-serif', accent: '#9a643e', soft: '#fbf1df', quote: '#fcf6e9', quoteRadius: 12 }),
  'forest-letter': preset('green', '森林来信', 'Forest Letter', '绿意信笺，细线章节与柔和提示卡', 'letter', { category: 'lifestyle', useCases: ['journal', 'essay'], recommendedCodeTheme: 'github-light', accent: '#376b50', soft: '#edf4e9', quote: '#f2f7ee', h1Border: 'none', paragraphSpacing: 1.22 }),
  bauhaus: preset('magazine', '包豪斯', 'Bauhaus', '红蓝双色边框与几何标题，强调视觉节奏', 'geometric', { recommended: true, category: 'brand', useCases: ['release'], recommendedCodeTheme: 'github-dark', titleFont: 'Arial,"Microsoft YaHei",sans-serif', accent: '#be322c', accent2: '#26528c', soft: '#fff3d7', quote: '#fff8e9', border: '#ddcba8', h1SizeOffset: 16 }),
  'orange-release': preset('orange', '橙黑发布', 'Orange Release', '强标题、橙色分区和明确的重点提示', 'geometric', { category: 'brand', useCases: ['release', 'news'], recommendedCodeTheme: 'vscode-dark', h1Align: 'left', text: '#252321', accent: '#b94d18', accent2: '#292623', h1SizeOffset: 15, quoteRadius: 0 }),
};

export const paletteVariants = {
  original: { name: '主题原色' },
  ocean: { name: '海蓝', accent: '#2463a0', accent2: '#244566', soft: '#edf4fb', quote: '#f3f7fc', border: '#c9d9eb' },
  jade: { name: '松绿', accent: '#287356', accent2: '#254d3c', soft: '#edf6f0', quote: '#f3f8f4', border: '#c6ddcf' },
  amber: { name: '暖金', accent: '#956029', accent2: '#684522', soft: '#faf2e5', quote: '#fcf7ee', border: '#e3d2b9' },
  plum: { name: '梅紫', accent: '#78509b', accent2: '#503763', soft: '#f5effa', quote: '#f9f5fc', border: '#dccbe8' },
} as const;
export type PaletteId = keyof typeof paletteVariants;
export function resolveArticleTheme(id: ThemeId, palette: PaletteId = 'original'): ArticleTheme {
  const theme = themes[id] ?? themes.apple;
  const variant = paletteVariants[palette] ?? paletteVariants.original;
  if (!('accent' in variant)) return theme;
  const { name: _name, ...colors } = variant;
  return { ...theme, ...colors };
}
export function themeUseCases(theme: ArticleTheme): UseCase[] {
  return theme.useCases ?? (theme.category === 'tech' ? ['tutorial', 'release'] : theme.category === 'oriental' ? ['essay', 'journal'] : theme.category === 'editorial' ? ['essay', 'news'] : ['tutorial', 'essay']);
}
