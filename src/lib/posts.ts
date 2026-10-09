import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Series = CollectionEntry<'series'>;

export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id));
}

export async function getSeries(): Promise<Series[]> {
  return getCollection('series');
}

export function inSeries(posts: Post[], seriesId: string): Post[] {
  return posts.filter((p) => p.data.series?.id === seriesId).sort((a, b) => (a.data.part ?? 0) - (b.data.part ?? 0));
}

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
