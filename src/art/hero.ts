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

function bloom(b: Bloom, order: number) {
  const r = seeded(b.seed);
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
    out.push(`<path class="petal" fill="url(#${gid})" d="${g.outline}" style="--dl:${f1((dl + 1.2) * 100) / 100}s"/>`);
    out.push(pen(g.outline, 'b', dl, 1.4));
    out.push(pen(g.rib, 't', dl + 0.5, 1.1));
    out.push(pen(g.hatch.join(' '), 't', dl + 0.9, 1.2));
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
    out.push(pen(poly(pts), 'r', 1.6 + order * 0.6 + i * 0.1, 1.8));
    const e = pts[26], pe = pts[25];
    const th = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
    out.push(`<ellipse class="anther" cx="${f1(e[0])}" cy="${f1(e[1])}" rx="5.5" ry="2.6" transform="rotate(${f1((th * 180) / Math.PI)} ${f1(e[0])} ${f1(e[1])})" style="--dl:${3.4 + order * 0.6}s"/>`);
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
  out.push(`<g class="splat" style="--dl:${f1(2.6 + order * 0.6)}s">${dots.join('')}</g>`);
  return { markup: out.join(''), landings };
}

export interface HeroArt { svg: string; landings: { x: number; y: number; a: number }[]; centre: Pt; }

export function heroArt(): HeroArt {
  const A: Bloom = { c: [560, 400], scale: 1, rot: 0, seed: 11 };
  const B: Bloom = { c: [388, 452], scale: 0.84, rot: -10, seed: 29 };
  const stems = [
    pen('M556 404 C552 470 560 540 548 660', 'b', 0.2, 1.8),
    pen('M566 404 C562 470 570 540 560 660', 't', 0.3, 1.8),
    pen('M386 456 C400 520 420 590 430 660', 'b', 0.3, 1.8),
    pen('M394 456 C408 520 428 590 438 660', 't', 0.4, 1.8),
  ];
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
  // 失焦的光斑和一层颜料晕：参考图里那种朦胧的底
  const haze = `
    <filter id="blur18" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="blur3" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>`;
  const defs = `<defs>${filt('paint-back', 2.1, 9, 4)}${filt('paint', 1.15, 6, 12)}${haze}</defs>`;
  const wash: string[] = [];
  const wr = seeded(5);
  for (let i = 0; i < 16; i++) {
    const x = 400 + wr() * 300, y = 300 + wr() * 200;
    const col = wr() < 0.5 ? '#c41230' : wr() < 0.5 ? '#5e0612' : '#f2a3ab';
    wash.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(40 + wr() * 60)}" ry="${f1(24 + wr() * 40)}" fill="${col}" opacity="${f1(0.14 + wr() * 0.2)}" transform="rotate(${f1(wr() * 180)} ${f1(x)} ${f1(y)})"/>`);
  }
  const bokeh = [[300, 180, 24], [470, 120, 16], [760, 250, 20], [250, 420, 14]]
    .map(([x, y, r], i) => `<circle class="bokeh" cx="${x}" cy="${y}" r="${r}" fill="#f6dfe1" opacity=".5" filter="url(#blur3)" style="--d:${i * 1.3}s"/>`).join('');
  const back = `<g filter="url(#blur18)" class="wash">${wash.join('')}</g>${bokeh}`;
  const svg = `${defs}${back}${stems.join('')}<g filter="url(#paint-back)" class="petals">${b.markup}</g><g filter="url(#paint)" class="petals">${a.markup}</g>`;
  return { svg, landings, centre: [500, 380] };
}

/**
 * 蝴蝶：画在局部坐标里，头朝上，原点在胸口。
 * 右翅是一组，左翅是它的镜像（脚本里分别缩放来扇动）。
 * 前翅 + 带尾突的后翅；翅膜是炭黑里透出暗红，翅脉是淡粉，边缘一圈红斑，上面撒一层颜料颗粒。
 */
export function butterfly(): string {
  const fore = 'M3 -5 C9 -24 26 -52 52 -76 C60 -83 70 -88 80 -84 C88 -80 90 -68 86 -54 C80 -32 66 -12 48 -2 C34 4 18 4 3 3 Z';
  const hind = 'M3 3 C20 2 42 4 58 16 C70 25 74 38 68 50 C64 58 66 68 72 80 C74 88 68 98 60 100 C52 94 48 84 44 76 C38 84 28 84 20 78 C14 62 8 40 3 20 Z';
  const wing = `
    <path class="bw" d="${fore}"/>
    <path class="bw" d="${hind}"/>
    <g clip-path="url(#bwclip)" class="bscale">
      <path class="sheen" d="M10 -10 C20 -30 36 -52 62 -74 C66 -60 56 -36 40 -20 C30 -10 20 -6 10 -10 Z"/>
      <path class="sheen s2" d="M8 8 C26 8 44 12 56 24 C48 36 34 42 20 40 C12 30 10 18 8 8 Z"/>
      <path class="blush" d="M60 -78 C74 -90 90 -80 86 -56 C80 -40 72 -34 66 -40 C70 -56 66 -68 60 -78 Z"/>
      <path class="blush" d="M44 76 C42 64 52 56 66 52 C72 70 70 90 62 100 C52 94 48 86 44 76 Z"/>
    </g>
    <path class="vein" d="M4 -4 C22 -20 46 -46 72 -72 M4 -3 C28 -14 56 -34 80 -56 M4 -2 C30 -6 54 -16 70 -30 M4 0 C22 0 40 -2 54 -8 M4 -2 C16 -24 20 -42 22 -56"/>
    <path class="vein" d="M4 6 C24 8 44 14 60 26 M4 10 C22 18 40 32 56 46 M4 14 C16 28 28 44 38 58 M60 26 C58 40 58 52 62 62 M30 14 C28 26 26 40 28 54"/>
    <path class="vein fine" d="M30 -30 C36 -22 40 -12 40 -4 M44 -44 C52 -34 58 -22 58 -12 M58 -58 C66 -48 72 -34 72 -22 M44 30 C50 38 52 46 52 56"/>
    <g class="spots"><circle cx="82" cy="-72" r="2.4"/><circle cx="84" cy="-60" r="2.2"/><circle cx="80" cy="-46" r="2"/><circle cx="72" cy="-30" r="1.9"/><circle cx="62" cy="-16" r="1.7"/><circle cx="68" cy="30" r="2.2"/><circle cx="66" cy="42" r="2"/><circle cx="62" cy="62" r="1.8"/></g>
    <path class="edge" d="${fore}"/><path class="edge" d="${hind}"/>`;
  return `<defs>
    <clipPath id="bwclip"><path d="${fore}"/><path d="${hind}"/></clipPath>
    <linearGradient id="bwg" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="#070405"/><stop offset=".6" stop-color="#140b0c"/><stop offset="1" stop-color="#2a0e12"/></linearGradient>
    <filter id="bfsoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur id="bfblur" stdDeviation="0.9"/></filter>
    <filter id="dust" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="21" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .97  0 0 0 0 .7  0 0 0 0 .72  0 0 0 12 -8.6" result="p"/>
      <feComposite in="p" in2="SourceAlpha" operator="in" result="sp"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sp"/></feMerge>
    </filter></defs>
  <g class="bf" id="bf" filter="url(#bfsoft)">
    <g class="bf-l" transform="scale(-1 1)" filter="url(#dust)">${wing}</g>
    <g class="bf-r" filter="url(#dust)">${wing}</g>
    <path class="bbody" d="M0 -19 C3.4 -19 4 -14 3.8 -8 C3.6 0 3 10 1 36 C0 38 0 38 -1 36 C-3 10 -3.6 0 -3.8 -8 C-4 -14 -3.4 -19 0 -19 Z"/>
    <path class="bseg" d="M-3.6 -4 H3.6 M-3.4 3 H3.4 M-3 10 H3 M-2.6 17 H2.6 M-2.2 24 H2.2"/>
    <circle class="bbody" cx="0" cy="-21" r="3.8"/>
    <path class="ant" d="M-1 -23 C-5 -34 -11 -44 -18 -52 M1 -23 C5 -34 11 -44 18 -52"/>
    <circle class="bbody" cx="-18" cy="-52.5" r="1.7"/><circle class="bbody" cx="18" cy="-52.5" r="1.7"/>
  </g>`;
}
