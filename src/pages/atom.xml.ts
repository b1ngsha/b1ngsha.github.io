import type { APIContext } from 'astro';
import { site } from '../data/site';
import { getPosts, summaryOf } from '../lib/posts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 订阅地址一直是 /atom.xml，和 Hexo 时代保持一致，已订阅的人不用换。 */
export async function GET(context: APIContext) {
  const base = (context.site ?? new URL(site.url)).toString().replace(/\/$/, '');
  const posts = (await getPosts()).slice(0, 20);
  const updated = (posts[0]?.data.updated ?? posts[0]?.data.date ?? new Date()).toISOString();
  const entries = posts
    .map((p) => {
      const url = `${base}/posts/${p.id}/`;
      return `  <entry>
    <title>${esc(p.data.title)}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <published>${p.data.date.toISOString()}</published>
    <updated>${(p.data.updated ?? p.data.date).toISOString()}</updated>
    <summary>${esc(summaryOf(p, 140))}</summary>
${p.data.series ? `    <category term="${esc(p.data.series.id)}"/>\n` : ''}${p.data.tags.map((t) => `    <category term="${esc(t)}"/>\n`).join('')}  </entry>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)}</title>
  <subtitle>${esc(site.description)}</subtitle>
  <link href="${base}/atom.xml" rel="self"/>
  <link href="${base}/"/>
  <updated>${updated}</updated>
  <id>${base}/</id>
  <author><name>${esc(site.handle)}</name></author>
${entries}
</feed>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
