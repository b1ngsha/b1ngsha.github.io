#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};

function nowShanghai() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().replace(/\.\d+Z$/, '+08:00');
}
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

if (args[0] === 'now') {
  const date = nowShanghai().slice(0, 10);
  const dir = join(root, 'src/content/now');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${date}.md`);
  if (existsSync(file)) die(`今天的近况已经有了：${file}`);
  writeFileSync(file, `---\ndate: ${date}\nquote: ""\nmark: ""\nplansTitle: ""\nplans: []\n---\n这里写最近在做什么、想什么。\n`);
  console.log(`✓ ${file}`);
  process.exit(0);
}

const series = flag('series');
const tags = (flag('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
const [slug, title] = args;
if (!slug || !title) die('用法：npm run new -- <slug> "<标题>" [--series <系列id>] [--tags a,b]');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die('slug 只能是小写英文、数字和连字符，例如 rust-lifetimes');
for (const t of tags) if (!/^[a-z0-9-]+$/.test(t)) die(`标签只能是小写英文、数字和连字符：${t}`);

const postsDir = join(root, 'src/content/posts');
const all = readdirSync(postsDir, { recursive: true, withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith('.md'));
if (all.some((f) => f.name === `${slug}.md`)) die(`slug 已被占用：${slug}`);

let part;
if (series) {
  const ids = [...readFileSync(join(root, 'src/content/series.yml'), 'utf8').matchAll(/^- id: (\S+)/gm)].map((m) => m[1]);
  if (!ids.includes(series)) die(`没有这个系列：${series}。已有：${ids.join('、')}；新系列请先在 src/content/series.yml 里登记。`);
  const parts = all
    .filter((f) => f.parentPath.endsWith(`/${series}`))
    .map((f) => Number(/^part:\s*(\d+)/m.exec(readFileSync(join(f.parentPath, f.name), 'utf8'))?.[1] ?? 0));
  part = Math.max(0, ...parts) + 1;
}

const dir = join(postsDir, series ?? 'misc');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${slug}.md`);
const lines = ['---', `title: ${JSON.stringify(title)}`, `date: ${nowShanghai()}`];
if (series) lines.push(`series: ${series}`, `part: ${part}`);
lines.push(`tags: [${tags.join(', ')}]`, 'draft: true', '---', '', '这里写摘要，到 `<!-- more -->` 为止的文字会出现在列表和订阅里。', '', '<!-- more -->', '', '## 正文', '');
writeFileSync(file, lines.join('\n'));
console.log(`✓ ${file.replace(root, '')}`);
console.log('  写完后删掉 front matter 里的 draft: true，再 git push 就发布。');
