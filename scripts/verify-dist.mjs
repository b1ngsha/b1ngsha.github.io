#!/usr/bin/env node
/**
 * 构建之后的检查：
 *  1. 站内链接和资源都指向真实存在的文件（死链检查）；
 *  2. 每个老 Hexo 网址都有跳转页，而且跳转目标存在；
 *  3. /atom.xml、sitemap、搜索索引都在。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
if (!existsSync(dist)) { console.error('✗ 还没有构建：先运行 npm run build'); process.exit(1); }

const problems = [];
const html = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith('.html'));
const resolves = (url) => {
  const clean = decodeURIComponent(url.split('#')[0].split('?')[0]);
  const p = join(dist, clean);
  return existsSync(clean.endsWith('/') ? join(p, 'index.html') : p) || existsSync(p + '/index.html');
};

let links = 0;
for (const f of html) {
  const file = join(f.parentPath, f.name);
  const rel = file.replace(dist, '');
  if (rel.startsWith('/pagefind/')) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = m[1];
    if (url.startsWith('//')) continue;
    links++;
    if (!resolves(url)) problems.push(`死链：${rel} → ${url}`);
  }
}

const redirects = JSON.parse(readFileSync(join(root, 'src/data/redirects.json'), 'utf8'));
for (const [from, to] of Object.entries(redirects)) {
  if (!resolves(from)) problems.push(`老网址没有跳转页：${from}`);
  if (!resolves(to)) problems.push(`跳转目标不存在：${from} → ${to}`);
}

for (const must of ['atom.xml', 'sitemap-index.xml', 'pagefind/pagefind.js', '404.html', 'CNAME']) {
  if (!existsSync(join(dist, must))) problems.push(`缺少 ${must}`);
}
const atom = existsSync(join(dist, 'atom.xml')) ? readFileSync(join(dist, 'atom.xml'), 'utf8') : '';
if (!atom.startsWith('<?xml') || !atom.includes('<feed') || !atom.includes('</feed>')) problems.push('atom.xml 不是有效的 Atom');

if (problems.length) {
  console.error(`✗ ${problems.length} 个问题：\n` + problems.slice(0, 40).map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log(`✓ ${html.length} 个页面，${links} 条站内链接，${Object.keys(redirects).length} 个老网址跳转，订阅与搜索索引都在。`);
