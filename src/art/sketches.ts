import { bez, f1, pen, poly, seeded, type Pt } from './draw';

/* ─────────────── 蛋挞：正面坐着的猫，右侧一片排线 ─────────────── */
export function catSketch(): string {
  const o: string[] = [];
  const hr = seeded(5);
  const body = 'M150 246 C122 290 112 360 128 424 C134 446 160 452 200 452 C240 452 266 446 272 424 C288 360 278 290 250 246 Z';
  const head = 'M128 200 C126 150 160 118 200 118 C240 118 274 150 272 200 C270 238 238 258 200 258 C162 258 130 238 128 200 Z';
  o.push(`<defs><clipPath id="cat-body"><path d="${body} ${head}"/></clipPath>`);
  o.push('<clipPath id="cat-right"><path d="M258 112 L300 112 L300 470 L226 470 C246 400 262 330 262 262 C262 214 262 160 258 112 Z"/></clipPath></defs>');
  // 排线：先画，墨线再盖上去
  o.push('<g clip-path="url(#cat-right)"><g clip-path="url(#cat-body)">');
  for (let t = -300, j = 0; t < 420; t += 5.2, j++) {
    const a = (62 * Math.PI) / 180;
    o.push(pen(`M${f1(215 + t * 0.55 + hr() * 2)} 100 l${f1(Math.cos(a) * 420)} ${f1(Math.sin(a) * 420)}`, 't', 1.6 + j * 0.012, 0.7));
  }
  o.push('</g></g>');
  o.push(pen(head, '', 0, 1.4));
  o.push(pen('M138 168 C132 140 134 112 140 92 C158 100 176 112 188 124 M262 168 C268 140 266 112 260 92 C242 100 224 112 212 124', '', 0.3));
  o.push(pen('M146 126 C150 114 158 108 166 112 M254 126 C250 114 242 108 234 112', 't', 0.5));
  o.push(pen('M130 214 L116 222 L132 224 L122 236 L142 232 M270 214 L284 222 L268 224 L278 236 L258 232', 't', 0.6));
  o.push(pen('M190 124 V146 M200 122 V150 M210 124 V146', 't', 0.7));
  o.push(pen('M149 198 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0 M217 198 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0', '', 0.9));
  o.push(pen('M158 198 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M226 198 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', '', 1.0));
  o.push(pen('M192 222 H208 L200 232 Z M200 232 V240 M200 240 C194 248 184 246 182 240 M200 240 C206 248 216 246 218 240', '', 1.1));
  o.push(pen('M150 232 L100 224 M150 238 L98 242 M152 244 L106 258 M250 232 L300 224 M250 238 L302 242 M248 244 L294 258', 't', 1.2));
  o.push(pen(body, '', 1.3, 1.6));
  o.push(pen('M176 286 l8 14 M200 280 l0 18 M224 286 l-8 14 M168 322 l8 12 M200 316 l0 18 M232 322 l-8 12 M150 356 l10 8 M250 356 l-10 8', 't', 1.7));
  o.push(pen('M176 452 V382 M224 452 V382 M164 452 C164 438 188 438 188 452 M212 452 C212 438 236 438 236 452', '', 1.8));
  o.push(pen('M270 430 C318 430 340 390 322 352 C314 336 298 338 298 350', '', 1.9));
  o.push('<path class="fill" style="--dl:2.2s" d="M158 198 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M226 198 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"/>');
  o.push('<path class="fillr" style="--dl:2.4s" d="M192 222 H208 L200 232 Z"/>');
  return `<svg class="art" data-boil viewBox="60 40 280 450" role="img" aria-label="蛋挞的线稿">${o.join('')}</svg>`;
}

/* ─────────────── 富士山：右坡排线，红色的太阳 ─────────────── */
const FUJI = 'M20 330 C70 328 120 305 150 262 C168 236 178 196 188 153 C192 146 210 146 214 153 C224 196 236 236 254 262 C284 306 330 328 380 330';
export function fujiSketch(): string {
  const o: string[] = [];
  const fr = seeded(31);
  o.push(`<defs><clipPath id="fuji-body"><path d="${FUJI} L380 330 L20 330 Z"/></clipPath>`);
  o.push('<clipPath id="fuji-right"><path d="M205 140 L400 140 L400 330 L200 330 C206 260 210 200 205 140 Z"/></clipPath></defs>');
  o.push('<g clip-path="url(#fuji-right)"><g clip-path="url(#fuji-body)">');
  for (let t = 0, j = 0; t < 260; t += 4.6, j++) o.push(pen(`M${f1(196 + t * 0.9 + fr() * 1.5)} 140 l${f1(-60 + fr() * 4)} ${f1(190 + fr() * 6)}`, 't', 0.5 + j * 0.015, 0.9));
  for (let t = 0, j = 0; t < 150; t += 8.5, j++) o.push(pen(`M${f1(200 + t * 1.2)} 250 l60 80`, 't', 1.2 + j * 0.02, 0.7));
  o.push('</g></g>');
  o.push(pen(FUJI, 'b', 0, 2.4));
  o.push(pen('M176 214 L182 200 L188 212 L194 190 L200 210 L206 188 L212 210 L218 194 L224 214', '', 1.6, 1));
  o.push(pen('M214 150 C240 140 262 148 288 136', 't', 2, 1));
  o.push(pen('M0 330 H400', '', 0.2, 1.8));
  [346, 360, 378, 402].forEach((y, i) => o.push(pen(`M${40 + i * 14} ${y} H${360 - i * 18}`, 't', 2.4 + i * 0.1, 1.2)));
  o.push(pen('M60 90 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0', 'r', 2.8, 1.2));
  o.push('<circle class="fillr" style="--dl:3.8s" cx="86" cy="90" r="11"/>');
  return `<svg class="art" data-boil viewBox="0 120 400 250" aria-hidden="true">${o.join('')}</svg>`;
}

/* ─────────────── 彼岸花：年谱尽头的红色，横着开 ─────────────── */
export function lilySketch(): string {
  const o: string[] = [];
  const C: Pt = [210, 170];
  const lr = seeded(77);
  o.push('<g transform="rotate(90 210 210)">');
  o.push(pen('M210 330 C213 290 207 240 210 188', 'b', 0.2, 1.2));
  o.push(pen('M215 330 C218 290 212 240 215 190', 't', 0.3, 1.2));
  const petals = 7;
  for (let i = 0; i < petals; i++) {
    const a = ((-90 + (i - (petals - 1) / 2) * 36 + (lr() - 0.5) * 8) * Math.PI) / 180;
    const len = 104 + lr() * 26, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const curl = (i % 2 ? 1 : -1) * (16 + lr() * 14);
    const T: Pt = [C[0] + dx * len + px * curl, C[1] + dy * len + py * curl];
    const c1: Pt = [C[0] + dx * len * 0.35 + px * 5, C[1] + dy * len * 0.35 + py * 5];
    const c2: Pt = [C[0] + dx * len * 0.8 + px * curl * 0.2 + px * 8, C[1] + dy * len * 0.8 + py * curl * 0.2 + py * 8];
    const d2: Pt = [C[0] + dx * len * 0.8 + px * curl * 0.2 - px * 8, C[1] + dy * len * 0.8 + py * curl * 0.2 - py * 8];
    const d1: Pt = [C[0] + dx * len * 0.35 - px * 5, C[1] + dy * len * 0.35 - py * 5];
    o.push(pen(`M${f1(C[0])} ${f1(C[1])} C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(T[0])} ${f1(T[1])} C${f1(d2[0])} ${f1(d2[1])} ${f1(d1[0])} ${f1(d1[1])} ${f1(C[0])} ${f1(C[1])}`, 'r', 0.6 + i * 0.12, 1.4));
    o.push(pen(`M${f1(C[0])} ${f1(C[1])} Q${f1((c1[0] + c2[0]) / 2)} ${f1((c1[1] + c2[1]) / 2)} ${f1(T[0] - dx * 6)} ${f1(T[1] - dy * 6)}`, 'r t', 0.9 + i * 0.12, 1.2));
  }
  for (let i = 0; i < 8; i++) {
    const a = ((-90 + (i - 3.5) * 22 + (lr() - 0.5) * 10) * Math.PI) / 180;
    const len = 150 + lr() * 38, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const cv = (i % 2 ? 1 : -1) * (26 + lr() * 20);
    const T: Pt = [C[0] + dx * len + px * cv, C[1] + dy * len + py * cv];
    o.push(pen(`M${f1(C[0])} ${f1(C[1])} Q${f1(C[0] + dx * len * 0.6 + px * cv * 0.1)} ${f1(C[1] + dy * len * 0.6 + py * cv * 0.1)} ${f1(T[0])} ${f1(T[1])}`, 'r t', 1.4 + i * 0.1, 1.3));
    o.push(`<ellipse class="fillr" style="--dl:2.6s" cx="${f1(T[0])}" cy="${f1(T[1])}" rx="4.2" ry="2.4" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(T[0])} ${f1(T[1])})"/>`);
  }
  o.push('</g>');
  return `<svg class="lily" id="lily" data-boil viewBox="0 0 420 420" aria-hidden="true">${o.join('')}</svg>`;
}

/* ─────────────── 「正」字计数：每五个一组，四竖一撇 ─────────────── */
export function tallySketch(count: number, seed: number): string {
  const groups = Math.ceil(count / 5);
  const w = Math.max(60, groups * 38);
  const tr = seeded(count * 7 + seed);
  const o: string[] = [];
  for (let g = 0; g < groups; g++) {
    const n5 = Math.min(5, count - g * 5);
    const x0 = g * 38 + 4;
    for (let b = 0; b < Math.min(4, n5); b++)
      o.push(pen(`M${f1(x0 + b * 6 + (tr() - 0.5))} ${f1(3 + tr() * 2)} L${f1(x0 + b * 6 + (tr() - 0.5) * 1.5)} ${f1(22 + tr() * 2)}`, '', seed * 0.1 + g * 0.25 + b * 0.05, 0.4));
    if (n5 === 5) o.push(pen(`M${f1(x0 - 4)} ${f1(18 + tr() * 2)} L${f1(x0 + 27)} ${f1(7 + tr() * 2)}`, 'r', seed * 0.1 + g * 0.25 + 0.3, 0.5));
  }
  return `<svg viewBox="0 0 ${w} 26" preserveAspectRatio="xMinYMid meet" aria-hidden="true">${o.join('')}</svg>`;
}

/* ─────────────── 手画的小方框（待办前面那个） ─────────────── */
export function todoBox(i: number): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${pen('M4 5 L20 4 L21 20 L5 21 Z', '', i * 0.2, 0.7)}${pen('M3 6 L19 3.5', 't', i * 0.2 + 0.2, 0.4)}</svg>`;
}

/* ─────────────── 文章标题下面划过去的红笔 ─────────────── */
export function scribble(width: number, seed: number): string {
  const sr = seeded(seed + 3);
  let x = 2;
  let d = 'M2 7';
  while (x < width - 6) {
    x += 8 + sr() * 10;
    d += ` L${f1(x)} ${f1(3 + sr() * 8)}`;
  }
  return `<svg class="scr" viewBox="0 0 ${width} 12" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" pathLength="1"/></svg>`;
}
export { bez, poly };
