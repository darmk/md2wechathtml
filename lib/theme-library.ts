import { themeUseCases, useCases, type ArticleTheme, type ThemeId, type ThemeCategory } from './article-themes.ts';

export type ThemeFilter = 'all' | 'featured' | 'favorites' | 'recent' | ThemeCategory;
export type ThemeLibrary = { favorites: ThemeId[]; recent: ThemeId[] };
export const themeLibraryKey = 'inkgrid-article-theme-library';

export function readThemeLibrary(raw: string | null, validIds: string[]): ThemeLibrary {
  try {
    const saved = JSON.parse(raw ?? '{}');
    const clean = (value: unknown): ThemeId[] => Array.isArray(value)
      ? [...new Set(value.filter((id): id is ThemeId => typeof id === 'string' && validIds.includes(id)))] : [];
    return { favorites: clean(saved?.favorites), recent: clean(saved?.recent).slice(0, 8) };
  } catch { return { favorites: [], recent: [] }; }
}

export function filterArticleThemes(catalog: Record<ThemeId, ArticleTheme>, filter: ThemeFilter, query: string, library: ThemeLibrary, useCase: keyof typeof useCases = 'all'): ThemeId[] {
  const categories = { minimal: '极简', tech: '科技', editorial: '内容 杂志', oriental: '东方', lifestyle: '生活 清新', brand: '品牌 视觉' };
  const candidates = filter === 'recent' ? library.recent : Object.keys(catalog) as ThemeId[];
  const search = query.trim().toLocaleLowerCase();
  return candidates.filter((id) => {
    const theme = catalog[id];
    if (!theme) return false;
    const matches = filter === 'all' || filter === 'recent' || (filter === 'favorites' ? library.favorites.includes(id) : filter === 'featured' ? theme.recommended : theme.category === filter);
    const purposes = themeUseCases(theme);
    return matches && (useCase === 'all' || purposes.includes(useCase)) && `${theme.name} ${theme.englishName} ${theme.description} ${categories[theme.category]} ${purposes.map(id => useCases[id]).join(' ')}`.toLocaleLowerCase().includes(search);
  });
}

export const galleryCardSample = '# 让技术表达更清晰\n\n好的文章，需要清晰的结构与**恰到好处的强调**。\n\n## 从想法到实践\n\n> 留白，让信息更容易被理解。';

export function galleryFullSample(imageUrl: string) {
  return `# 从想法到上线：一份清晰的技术指南

技术文章不只需要准确，也需要让读者愿意读下去。**明确重点**、适当留白和稳定的阅读节奏，可以让复杂知识更易理解。

## 一、建立清晰的结构

这是正文段落示例。你可以观察字号、行高、段间距，以及中英文混排的效果：TypeScript、API 和 Markdown。

### 用层次引导阅读

重点内容可以使用**加粗强调**，补充说明可以使用*斜体*，过时方案使用~~删除线~~。行内代码如 \`fetchData()\` 应当清晰可辨。

#### 四级标题：实现细节

把一个大问题拆成可验证的小步骤，让读者知道每一步要做什么。

> 好的排版不会抢走内容的注意力，而是让关键的信息更容易被看见。

> [!TIP]
> 提示信息适合放置操作建议，也可以用来强调容易忽略的细节。

> [!WARNING]
> 发布前请检查图片、链接和手机端表格显示。

## 二、列表与行动步骤

- 明确目标与使用场景
- 选择适合内容的排版风格
  - 技术教程关注代码可读性
  - 长篇分析关注段落节奏
- 最后检查实际阅读效果

1. 准备 Markdown 原文。
2. 用同一篇文章比较主题。
3. 确认后应用，再复制到公众号。

## 三、代码也需要阅读体验

### TypeScript

\`\`\`typescript
type Article = { title: string; published: boolean };

export function publish(article: Article): string {
  // 先检查内容，再返回结果
  if (!article.title.trim()) throw new Error('标题不能为空');
  return article.published ? '已发布' : '草稿';
}
\`\`\`

### Python

\`\`\`python
def reading_minutes(text: str) -> int:
    # 估算阅读时长
    return max(1, len(text) // 500)

print(reading_minutes("让技术表达更清晰"))
\`\`\`

### SQL

\`\`\`sql
SELECT title, created_at
FROM articles
WHERE published = true
ORDER BY created_at DESC
LIMIT 10;
\`\`\`

## 四、表格、图片与链接

| 内容 | 排版重点 | 建议 |
| --- | --- | --- |
| 标题 | 层级清楚 | 简短明确 |
| 正文 | 阅读舒适 | 合理留白 |
| 代码 | 颜色区分 | 声明语言 |

![文序 · 公众号排版美化工具 | darmk Studio](${imageUrl})

图片说明应当简短，与正文保持合适间距。更多 Markdown 写法可以参考 [CommonMark 规范](https://spec.commonmark.org/)。

---

## 五、总结

主题决定内容的视觉气质，**清晰的结构决定内容是否容易理解**。选择适合你的主题，让排版服务于表达。
`;
}
