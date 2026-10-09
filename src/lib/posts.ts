import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../data/site';

export type Post = CollectionEntry<'posts'>;
export type Series = CollectionEntry<'series'>;

/** 已发布的文章，新的在前。开发时（npm run dev）草稿也能看到。 */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id));
}

export async function getSeries(): Promise<Series[]> {
  return getCollection('series');
}

/** 一个系列里的文章，按序号排 */
export function inSeries(posts: Post[], seriesId: string): Post[] {
  return posts.filter((p) => p.data.series?.id === seriesId).sort((a, b) => (a.data.part ?? 0) - (b.data.part ?? 0));
}

/** 上一篇、下一篇：只在同一个系列里找 */
export function neighbours(posts: Post[], post: Post): { prev?: Post; next?: Post } {
  if (!post.data.series) return {};
  const list = inSeries(posts, post.data.series.id);
  const i = list.findIndex((p) => p.id === post.id);
  return { prev: list[i - 1], next: list[i + 1] };
}

export function allTags(posts: Post[]): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  posts.forEach((p) => p.data.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
  return [...m].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 首页：置顶的在前，再补最新的，一共 homePostCount 篇 */
export function homePosts(posts: Post[]): Post[] {
  const pinned = posts.filter((p) => p.data.featured);
  const rest = posts.filter((p) => !p.data.featured);
  return [...pinned, ...rest].slice(0, site.homePostCount);
}

/** 摘要：头信息里写了就用，没写取 <!-- more --> 之前的文字，再没有就取开头 */
export function summaryOf(post: Post, max = 110): string {
  if (post.data.summary) return post.data.summary;
  const body = post.body ?? '';
  const head = body.includes('<!-- more -->') ? body.split('<!-- more -->')[0] : body;
  const text = head
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}
