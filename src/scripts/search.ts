interface PagefindResult { url: string; excerpt: string; meta: { title?: string } }
interface Pagefind {
  search(q: string): Promise<{ results: { data(): Promise<PagefindResult> }[] }>;
}

const input = document.getElementById('q') as HTMLInputElement;
const list = document.getElementById('results') as HTMLOListElement;
const note = document.getElementById('note') as HTMLElement;
let pf: Pagefind | null | undefined;
let timer = 0;

async function engine(): Promise<Pagefind | null> {
  if (pf !== undefined) return pf;
  try {
    const url = '/pagefind/pagefind.js';
    pf = (await import(/* @vite-ignore */ url)) as Pagefind;
  } catch {
    pf = null;
  }
  return pf;
}

async function run() {
  const q = input.value.trim();
  list.replaceChildren();
  if (!q) { note.textContent = ''; return; }
  const e = await engine();
  if (!e) { note.textContent = 'The search index only exists after a build. Run npm run build, then npm run preview.'; return; }
  const r = await e.search(q);
  const hits = await Promise.all(r.results.slice(0, 12).map((x) => x.data()));
  note.textContent = hits.length ? `${r.results.length} result${r.results.length === 1 ? '' : 's'}` : 'Nothing found. Try another word?';
  for (const h of hits) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = h.url;
    a.textContent = h.meta.title ?? h.url;
    const p = document.createElement('p');
    p.innerHTML = h.excerpt;
    li.append(a, p);
    list.append(li);
  }
}
input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(run, 160); });
const initial = new URLSearchParams(location.search).get('q');
if (initial) { input.value = initial; run(); }

export {};
