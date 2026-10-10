import { f1, seeded, type Pt } from './draw';

/**
 * 首屏线稿：一丛彼岸花，和一只会落在花瓣上的蝴蝶。
 * 花在构建时一次画好（静态 SVG），蝴蝶在浏览器里飞（src/scripts/hero.ts）。
 * 花瓣是鲜红的色块，墨线勾边加排线；蝴蝶是深色的翅膀，浅色的翅脉。
 */

const pen = (d: string, cls: string, dl: number, dur = 1.6) =>
  `<path class="ln ${cls}" pathLength="1" d="${d}" style="--dl:${f1(dl * 100) / 100}s;--dur:${dur}s"/>`;
const fill = (d: string, cls: string, dl: number) => `<path class="${cls}" d="${d}" style="--dl:${f1(dl * 100) / 100}s"/>`;

const poly = (pts: Pt[]) => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');

interface PetalSpec { ang: number; len: number; wid: number; curl: number; }
interface PetalGeom { outline: string; rib: string; hatch: string[]; mid: Pt; tip: Pt; heading: number; }

/** 一片花瓣：沿一条逐渐卷曲的中线，两边按宽度外扩。 */
function petal(c: Pt, spec: PetalSpec, seed: number): PetalGeom {
  const N = 34;
  const r = seeded(seed);
  const ripple = r() * 6;
  const centre: Pt[] = [];
  const normals: Pt[] = [];
  const widths: number[] = [];
  let x = c[0], y = c[1];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const th = spec.ang + spec.curl * Math.pow(t, 1.7);
    centre.push([x, y]);
    normals.push([-Math.sin(th), Math.cos(th)]);
    const w = spec.wid * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.9) * (1 + 0.1 * Math.sin(t * 15 + ripple)) + 0.6;
    widths.push(w);
    x += Math.cos(th) * (spec.len / N);
    y += Math.sin(th) * (spec.len / N);
  }
  const L = centre.map((p, i) => [p[0] + normals[i][0] * widths[i] / 2, p[1] + normals[i][1] * widths[i] / 2] as Pt);
  const Rr = centre.map((p, i) => [p[0] - normals[i][0] * widths[i] / 2, p[1] - normals[i][1] * widths[i] / 2] as Pt);
  const outline = poly(L) + poly(Rr.slice().reverse()).replace('M', 'L') + 'Z';
  const rib = poly(centre.slice(2, N - 2));
  const hatch: string[] = [];
  for (let i = 4; i < N - 3; i += 2) {
    const n = normals[i], w = widths[i];
    const a = Rr[i];
    hatch.push(`M${f1(a[0])} ${f1(a[1])} l${f1(n[0] * w * 0.46 + (r() - 0.5))} ${f1(n[1] * w * 0.46 + (r() - 0.5))}`);
  }
  const mi = Math.round(N * 0.74);
  const th = spec.ang + spec.curl * Math.pow(mi / N, 1.7);
  return { outline, rib, hatch, mid: centre[mi], tip: centre[N], heading: th };
}

interface Bloom { c: Pt; scale: number; rot: number; seed: number; }

/**
 * 一丛花，生成两份标记：
 *  live    只有墨线，没有滤镜，浏览器一笔笔画出来（逐帧只重画线本身，很便宜）；
 *  painted 带颜色、渐变、模糊和颗粒的最终样子，会被存成一张静态图，画完后淡入盖住 live。
 * 浏览器不用每一帧去算 SVG 滤镜，这是首屏不卡的关键。
 */
function bloom(b: Bloom, order: number) {
  const r = seeded(b.seed);
  const live: string[] = [];
  const out: string[] = [];
  const gid = `pg${order}`;
  // 花瓣的颜色从花心的深红，到中段的鲜红，再到边缘泛白的粉：像颜料被刮开的亮部
  out.push(`<defs><radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${b.c[0]}" cy="${b.c[1]}" r="${f1(250 * b.scale)}">
    <stop offset="0" stop-color="#5e0612"/><stop offset=".22" stop-color="#a50f22"/><stop offset=".52" stop-color="#e3162f"/><stop offset=".8" stop-color="#ee4a5c"/><stop offset="1" stop-color="#f6b3b8"/></radialGradient></defs>`);
  const landings: { x: number; y: number; a: number }[] = [];
  const specs: PetalSpec[] = [];
  const angles = [-160, -128, -100, -72, -44, -16, 20, 160];
  angles.forEach((deg, i) => {
    const ang = ((deg + b.rot) * Math.PI) / 180;
    const side = Math.cos(ang) >= 0 ? 1 : -1;
    specs.push({
      ang,
      len: (150 + r() * 60) * b.scale,
      wid: (24 + r() * 8) * b.scale,
      curl: side * (1.3 + r() * 0.9),
    });
    void i;
  });
  // 后面的花瓣先画
  const sorted = specs.map((s, i) => ({ s, i })).sort((p, q) => Math.sin(q.s.ang) - Math.sin(p.s.ang));
  sorted.forEach(({ s, i }, k) => {
    const g = petal(b.c, s, b.seed * 17 + i);
    const dl = 0.5 + order * 0.6 + k * 0.22;
    out.push(`<path class="petal" fill="url(#${gid})" d="${g.outline}"/>`);
    const strokes = [pen(g.outline, 'b', dl, 1.4), pen(g.rib, 't', dl + 0.5, 1.1), pen(g.hatch.join(' '), 't', dl + 0.9, 1.2)];
    out.push(...strokes);
    live.push(...strokes);
    if (Math.sin(s.ang) < -0.35) landings.push({ x: f1(g.mid[0]), y: f1(g.mid[1]), a: f1(g.heading + Math.PI / 2) });
  });
  // 花丝：细长，向外卷出去，末端一个花药
  for (let i = 0; i < 9; i++) {
    const ang = ((-175 + i * 20 + b.rot + (r() - 0.5) * 8) * Math.PI) / 180;
    const len = (220 + r() * 90) * b.scale;
    const side = Math.cos(ang) >= 0 ? 1 : -1;
    const curl = side * (0.9 + r() * 0.7);
    const pts: Pt[] = [];
    let x = b.c[0], y = b.c[1];
    for (let j = 0; j <= 26; j++) {
      const t = j / 26;
      const th = ang + curl * Math.pow(t, 1.35);
      pts.push([x, y]);
      x += Math.cos(th) * (len / 26);
      y += Math.sin(th) * (len / 26);
    }
    const fil = pen(poly(pts), 'r', 1.6 + order * 0.6 + i * 0.1, 1.8);
    out.push(fil);
    live.push(fil);
    const e = pts[26], pe = pts[25];
    const th = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
    out.push(`<ellipse class="anther" cx="${f1(e[0])}" cy="${f1(e[1])}" rx="5.5" ry="2.6" transform="rotate(${f1((th * 180) / Math.PI)} ${f1(e[0])} ${f1(e[1])})"/>`);
  }
  // 溅开的颜料：花周围散落的红点和粉点，越远越小越淡
  const dots: string[] = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = (70 + Math.pow(r(), 0.7) * 300) * b.scale;
    const x = b.c[0] + Math.cos(a) * d * 1.15, y = b.c[1] + Math.sin(a) * d * 0.8 - 30 * b.scale;
    const rad = (0.8 + r() * 3.4 * (1 - d / (400 * b.scale))) ;
    const col = r() < 0.62 ? '#e3162f' : r() < 0.5 ? '#f3a2ab' : '#5e0612';
    dots.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rad * (1 + r()))}" ry="${f1(rad)}" fill="${col}" opacity="${f1(0.35 + r() * 0.55)}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`);
  }
  out.push(`<g class="splat">${dots.join('')}</g>`);
  return { painted: out.join(''), live: live.join(''), landings };
}

export interface HeroArt {
  /** 浏览器里一笔笔画出来的墨线（无滤镜） */
  live: string;
  /** 完整的上色版本，是一个独立的 SVG 文件，由 /hero-painted-*.svg 提供 */
  painted: (theme: 'light' | 'dark') => string;
  landings: { x: number; y: number; a: number }[];
  centre: Pt;
}

/** 上色版本的画布：比可见区域大一圈，花丝、颜料点和模糊的边都留得下 */
export const PAINT_BOX = { x: 90, y: 10, w: 790, h: 760 };
/** 页面里 svg 的可见区域，蝴蝶的落点坐标都以它为准 */
export const VIEW_BOX = { x: 150, y: 70, w: 670, h: 620 };
/** 四个失焦的光斑（圆心 x, y，半径），用 CSS 画，不进图里 */
export const BOKEH: [number, number, number][] = [[300, 180, 24], [470, 120, 16], [760, 250, 20], [250, 420, 14]];

export function heroArt(): HeroArt {
  const A: Bloom = { c: [560, 400], scale: 1, rot: 0, seed: 11 };
  const B: Bloom = { c: [388, 452], scale: 0.84, rot: -10, seed: 29 };
  const stems = [
    pen('M556 404 C552 470 560 540 548 660', 'b', 0.2, 1.8),
    pen('M566 404 C562 470 570 540 560 660', 't', 0.3, 1.8),
    pen('M386 456 C400 520 420 590 430 660', 'b', 0.3, 1.8),
    pen('M394 456 C408 520 428 590 438 660', 't', 0.4, 1.8),
  ].join('');
  const b = bloom(B, 0);
  const a = bloom(A, 1);
  const landings = [...a.landings, ...b.landings];
  const filt = (id: string, blur: number, wob: number, seed: number) => `
    <filter id="${id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".022 .03" numOctaves="3" seed="${seed}" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="${wob}" result="ragged"/>
      <feGaussianBlur in="ragged" stdDeviation="${blur}" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed + 3}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 .8  0 0 0 0 .82  0 0 0 12 -8.6" result="pale"/>
      <feComposite in="pale" in2="soft" operator="in" result="speck"/>
      <feTurbulence type="fractalNoise" baseFrequency=".06 .09" numOctaves="3" seed="${seed + 7}" result="m"/>
      <feColorMatrix in="m" type="matrix" values="0 0 0 0 .3  0 0 0 0 .01  0 0 0 0 .05  0 0 0 6 -3.7" result="dark"/>
      <feComposite in="dark" in2="soft" operator="in" result="streak"/>
      <feMerge><feMergeNode in="soft"/><feMergeNode in="streak"/><feMergeNode in="speck"/></feMerge>
    </filter>`;
  const defs = `<defs>${filt('paint-back', 2.1, 9, 4)}${filt('paint', 1.15, 6, 12)}<filter id="blur18" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter></defs>`;
  // 花丛后面一层颜料晕
  const wash: string[] = [];
  const wr = seeded(5);
  for (let i = 0; i < 16; i++) {
    const x = 400 + wr() * 300, y = 300 + wr() * 200;
    const col = wr() < 0.5 ? '#c41230' : wr() < 0.5 ? '#5e0612' : '#f2a3ab';
    wash.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(40 + wr() * 60)}" ry="${f1(24 + wr() * 40)}" fill="${col}" opacity="${f1(0.14 + wr() * 0.2)}" transform="rotate(${f1(wr() * 180)} ${f1(x)} ${f1(y)})"/>`);
  }
  const body = `<g filter="url(#blur18)" class="wash">${wash.join('')}</g>${stems}<g filter="url(#paint-back)" class="petals">${b.painted}</g><g filter="url(#paint)" class="petals">${a.painted}</g>`;

  const painted = (theme: 'light' | 'dark') => {
    const ink = theme === 'dark' ? '#ecebe6' : '#121211';
    const red = theme === 'dark' ? '#ff5468' : '#c41230';
    // 独立的 SVG 图片看不到页面的 CSS，所以线条的样式写在图里
    const css = `.ln{fill:none;stroke:${ink};stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}.ln.r{stroke:${red}}.ln.t{stroke-width:.8}.ln.b{stroke-width:2.4}.petals .ln.b{stroke-width:2;opacity:.55}.petals .ln.t{opacity:.4}.petals .ln.r{stroke-width:1.1;opacity:.8}.anther{fill:${ink}}.petal{stroke:none${theme === 'dark' ? ';fill-opacity:.92' : ''}}.wash{opacity:${theme === 'dark' ? '.5' : '1'}}`;
    const { x, y, w, h } = PAINT_BOX;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><style>${css}</style>${defs}${body}</svg>`;
  };
  return { live: `${stems}${b.live}${a.live}`, painted, landings, centre: [500, 380] };
}

/**
 * 蝴蝶：画在局部坐标里，头朝上，原点在胸口。
 * 右翅是一组，左翅是它的镜像（脚本里分别缩放来扇动）。
 * 前翅 + 带尾突的后翅；翅膜是炭黑里透出暗红，翅脉是淡粉，边缘一圈红斑，上面撒一层颜料颗粒。
 */
export function butterflyWing(): string {
  const fore = 'M3 -5 C9 -24 26 -52 52 -76 C60 -83 70 -88 80 -84 C88 -80 90 -68 86 -54 C80 -32 66 -12 48 -2 C34 4 18 4 3 3 Z';
  const hind = 'M3 3 C20 2 42 4 58 16 C70 25 74 38 68 50 C64 58 66 68 72 80 C74 88 68 98 60 100 C52 94 48 84 44 76 C38 84 28 84 20 78 C14 62 8 40 3 20 Z';
  // 一只翅膀画成一张静态图，扇动靠 CSS 的 scaleX，浏览器不用每帧重算滤镜
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -92 100 196" width="100" height="196">
  <style>.vein{fill:none;stroke:#f6c4c8;stroke-width:.9;stroke-linecap:round;opacity:.55}.vein.fine{stroke-width:.5;opacity:.45}.sheen{fill:#f6c4c8;opacity:.11}.sheen.s2{opacity:.08}.blush{fill:#e3162f;opacity:.92}.spots circle{fill:#f6c4c8;opacity:.9}.edge{fill:none;stroke:#cf9aa1;stroke-width:1.2;stroke-linejoin:round;opacity:.6}</style>
  <defs>
    <clipPath id="bwclip"><path d="${fore}"/><path d="${hind}"/></clipPath>
    <linearGradient id="bwg" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="#070405"/><stop offset=".6" stop-color="#140b0c"/><stop offset="1" stop-color="#2a0e12"/></linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation=".7" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="21" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .97  0 0 0 0 .7  0 0 0 0 .72  0 0 0 12 -8.6" result="p"/>
      <feComposite in="p" in2="b" operator="in" result="sp"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="sp"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#soft)">
    <path fill="url(#bwg)" d="${fore}"/><path fill="url(#bwg)" d="${hind}"/>
    <g clip-path="url(#bwclip)">
      <path class="sheen" d="M10 -10 C20 -30 36 -52 62 -74 C66 -60 56 -36 40 -20 C30 -10 20 -6 10 -10 Z"/>
      <path class="sheen s2" d="M8 8 C26 8 44 12 56 24 C48 36 34 42 20 40 C12 30 10 18 8 8 Z"/>
      <path class="blush" d="M60 -78 C74 -90 90 -80 86 -56 C80 -40 72 -34 66 -40 C70 -56 66 -68 60 -78 Z"/>
      <path class="blush" d="M44 76 C42 64 52 56 66 52 C72 70 70 90 62 100 C52 94 48 86 44 76 Z"/>
    </g>
    <path class="vein" d="M4 -4 C22 -20 46 -46 72 -72 M4 -3 C28 -14 56 -34 80 -56 M4 -2 C30 -6 54 -16 70 -30 M4 0 C22 0 40 -2 54 -8 M4 -2 C16 -24 20 -42 22 -56"/>
    <path class="vein" d="M4 6 C24 8 44 14 60 26 M4 10 C22 18 40 32 56 46 M4 14 C16 28 28 44 38 58 M60 26 C58 40 58 52 62 62 M30 14 C28 26 26 40 28 54"/>
    <path class="vein fine" d="M30 -30 C36 -22 40 -12 40 -4 M44 -44 C52 -34 58 -22 58 -12 M58 -58 C66 -48 72 -34 72 -22 M44 30 C50 38 52 46 52 56"/>
    <g class="spots"><circle cx="82" cy="-72" r="2.4"/><circle cx="84" cy="-60" r="2.2"/><circle cx="80" cy="-46" r="2"/><circle cx="72" cy="-30" r="1.9"/><circle cx="62" cy="-16" r="1.7"/><circle cx="68" cy="30" r="2.2"/><circle cx="66" cy="42" r="2"/><circle cx="62" cy="62" r="1.8"/></g>
    <path class="edge" d="${fore}"/><path class="edge" d="${hind}"/>
  </g>
</svg>`;
}

/** 蝴蝶的身体和触角：很小，没有滤镜，直接内联；颜色跟着页面的墨色走 */
export function butterflyBody(): string {
  return `<svg class="bbody" viewBox="-20 -56 40 98" width="40" height="98" aria-hidden="true">
    <path class="bb" d="M0 -19 C3.4 -19 4 -14 3.8 -8 C3.6 0 3 10 1 36 C0 38 0 38 -1 36 C-3 10 -3.6 0 -3.8 -8 C-4 -14 -3.4 -19 0 -19 Z"/>
    <path class="bseg" d="M-3.6 -4 H3.6 M-3.4 3 H3.4 M-3 10 H3 M-2.6 17 H2.6 M-2.2 24 H2.2"/>
    <circle class="bb" cx="0" cy="-21" r="3.8"/>
    <path class="ant" d="M-1 -23 C-5 -34 -11 -44 -18 -52 M1 -23 C5 -34 11 -44 18 -52"/>
    <circle class="bb" cx="-18" cy="-52.5" r="1.7"/><circle class="bb" cx="18" cy="-52.5" r="1.7"/>
  </svg>`;
}
