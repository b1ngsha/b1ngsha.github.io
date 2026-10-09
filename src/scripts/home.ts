import { f1, poly, seeded, type Pt } from '../art/draw';
import { mountEye } from './eye';

const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
}
function pen(parent: Element, d: string, cls = '', dl = 0, dur?: number) {
  const p = svgEl('path', { d, class: 'ln ' + cls, pathLength: 1 }, parent);
  p.style.setProperty('--dl', dl + 's');
  if (dur) p.style.setProperty('--dur', dur + 's');
  return p;
}

const eye = document.getElementById('eye') as SVGSVGElement | null;
if (eye) mountEye(eye);

const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('go'); io.unobserve(e.target); }
}), { threshold: 0.25 });
document.querySelectorAll('.sketch, #todo, #quote, #tally, .coda svg.art').forEach((n) => io.observe(n));

function rough(host: HTMLElement) {
  const w = host.offsetWidth, h = host.offsetHeight, r = seeded(w + h);
  const s = svgEl('svg', { class: 'rough', 'data-boil': '', width: w + 24, height: h + 24, viewBox: `-12 -12 ${w + 24} ${h + 24}`, 'aria-hidden': 'true' });
  const j = () => (r() - 0.5) * 5;
  const e = () => 6 + r() * 10;
  const side = (x1: number, y1: number, x2: number, y2: number, dl: number) => {
    for (let p = 0; p < 2; p++) {
      const o = p ? 3.2 : 0, mx = (x1 + x2) / 2 + j(), my = (y1 + y2) / 2 + j();
      pen(s, `M${f1(x1 + j() + o)} ${f1(y1 + j() + o)} Q${f1(mx + o)} ${f1(my + o)} ${f1(x2 + j() + o)} ${f1(y2 + j() + o)}`, p ? 't' : '', dl + p * 0.15, 0.9);
    }
  };
  side(-e(), 0, w + e(), 0, 0); side(w, -e(), w, h + e(), 0.3); side(w + e(), h, -e(), h, 0.6); side(0, h + e(), 0, -e(), 0.9);
  host.appendChild(s);
  io.observe(s);
}
document.querySelectorAll<HTMLElement>('[data-rough]').forEach((h) => { h.style.position = 'relative'; requestAnimationFrame(() => rough(h)); });

const wrap = document.getElementById('entwrap');
const vine = document.getElementById('vine') as SVGSVGElement | null;
const lily = document.getElementById('lily');
let main: SVGPathElement | null = null;
let thorns: SVGPathElement[] = [];
let nodes: SVGGElement[] = [];
let vineH = 0;
let reached = 0;

function still(p: SVGPathElement) { p.style.animation = 'none'; p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; }
function buildVine() {
  if (!wrap || !vine) return;
  vine.replaceChildren(); thorns = []; nodes = [];
  const pad = parseFloat(getComputedStyle(wrap).paddingBottom) || 0;
  const H = wrap.offsetHeight - pad, vr = seeded(21);
  vineH = H;
  const W = vine.clientWidth || 110;
  vine.setAttribute('viewBox', `0 0 ${W} ${H}`); vine.setAttribute('width', String(W)); vine.setAttribute('height', String(H));
  const pts: Pt[] = [];
  for (let y = 0; y <= H; y += 14) pts.push([Math.min(46, W / 2 - 10) + Math.sin(y * 0.021) * 10 + Math.sin(y * 0.07) * 3 + (vr() - 0.5) * 1.4, y]);
  main = pen(vine, poly(pts), 'b', 0, 1);
  main.style.strokeWidth = '1.6'; main.style.animation = 'none'; main.style.strokeDasharray = '1'; main.style.strokeDashoffset = '1';
  for (let y = 30; y < H - 10; y += 52 + vr() * 30) {
    const p = pts[Math.floor(y / 14)], s = vr() < 0.5 ? -1 : 1, l = 12 + vr() * 10;
    const t = pen(vine, `M${f1(p[0])} ${f1(p[1])} l${f1(s * l)} ${f1(-l * 0.8)} M${f1(p[0])} ${f1(p[1])} l${f1(s * l * 0.5)} ${f1(-l * 0.2)}`, 't');
    still(t); t.dataset.y = String(y); t.style.opacity = '0'; t.style.transition = reduce ? 'none' : 'opacity .5s ease';
    thorns.push(t);
  }
  wrap.querySelectorAll<HTMLElement>('.ent').forEach((e) => {
    const y = e.offsetTop + 34, p = pts[Math.min(pts.length - 1, Math.floor(y / 14))];
    const g = svgEl('g', {}, vine); g.dataset.y = String(y); g.style.opacity = '0'; g.style.transition = reduce ? 'none' : 'opacity .5s ease';
    still(pen(g, `M${f1(p[0] - 7)} ${f1(y)} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`, e.classList.contains('next') ? 'r' : ''));
    still(pen(g, `M${f1(p[0] + 8)} ${f1(y)} H${W - 8}`, 't'));
    nodes.push(g);
  });
}
function updateVine() {
  if (!main || !wrap) return;
  const r = wrap.getBoundingClientRect(), vh = innerHeight;
  const p = reduce ? 1 : (reached = Math.max(reached, clamp((vh * 0.72 - r.top) / (vineH || 1), 0, 1)));
  main.style.strokeDashoffset = String(1 - p);
  const reach = p > 0.93 ? Infinity : p * vineH;
  if (p > 0.93) main.style.strokeDashoffset = '0';
  thorns.forEach((t) => (t.style.opacity = Number(t.dataset.y) < reach ? '1' : '0'));
  nodes.forEach((n) => (n.style.opacity = Number(n.dataset.y) < reach ? '1' : '0'));
  if (p > 0.93) lily?.classList.add('go');
}
buildVine(); updateVine();
addEventListener('scroll', () => requestAnimationFrame(updateVine), { passive: true });
if (wrap) {
  let lastH = wrap.offsetHeight, lastW = wrap.offsetWidth;
  new ResizeObserver(() => {
    if (wrap.offsetHeight !== lastH || wrap.offsetWidth !== lastW) {
      lastH = wrap.offsetHeight; lastW = wrap.offsetWidth;
      buildVine(); updateVine();
    }
  }).observe(wrap);
}
document.fonts?.ready.then(() => { buildVine(); updateVine(); });
