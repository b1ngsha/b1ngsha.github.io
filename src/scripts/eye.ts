/**
 * 首屏的眼睛。
 * 先画草稿线（浅灰的构图线），再依次落墨：眉、眼睑、睫毛、虹膜、瞳孔，最后眼角裂开一道红。
 * 画完以后：瞳孔跟着鼠标走，隔几秒眨一次眼，线条轻微“沸腾”。
 */
import { bez, f1, poly, seeded, type Pt } from '../art/draw';

const NS = 'http://www.w3.org/2000/svg';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
}

/** 一笔：pathLength=1，--dl 是什么时候落笔 */
function pen(parent: Element, d: string, cls = '', dl = 0, dur?: number): SVGPathElement {
  const p = el('path', { d, class: 'ln ' + cls, pathLength: 1 }, parent);
  p.style.setProperty('--dl', dl + 's');
  if (dur) p.style.setProperty('--dur', dur + 's');
  return p;
}

export interface EyeOptions {
  /** 闭着眼睛（404 页用）：点一下才睁开一会儿 */
  closed?: boolean;
  /** 文字批注 */
  note?: string;
}

export function mountEye(svg: SVGSVGElement, opts: EyeOptions = {}): void {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = seeded(41);
  svg.replaceChildren();
  const defs = el('defs', {}, svg);
  const open = el('clipPath', { id: 'eye-open' }, defs);
  const openPath = el('path', {}, open);
  const gBoil = el('g', { class: 'boil' }, svg);
  const gGuide = el('g', {}, gBoil);
  const gBrow = el('g', {}, gBoil);
  const gBall = el('g', { 'clip-path': 'url(#eye-open)' }, gBoil);
  const gLid = el('g', {}, gBoil);
  const gCrack = el('g', {}, gBoil);

  // ── 几何：上眼睑和下眼睑各 64 个点，开合只是在两条线之间插值
  const N = 64;
  const P0: Pt = [60, 300], P2: Pt = [846, 324];
  const U: Pt[] = [...bez(P0, [170, 170], [400, 92], [570, 124], 32), ...bez([570, 124], [700, 150], [806, 236], P2, 32).slice(1)];
  const L: Pt[] = [...bez(P0, [210, 388], [440, 430], [624, 398], 32), ...bez([624, 398], [730, 378], [806, 356], P2, 32).slice(1)];
  const pt = (i: number, k: number): Pt => [L[i][0] + (U[i][0] - L[i][0]) * k, L[i][1] + (U[i][1] - L[i][1]) * k];
  const nrm = (arr: Pt[], i: number): Pt => {
    const a = arr[Math.max(0, i - 1)], b = arr[Math.min(arr.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l];
  };

  // ── 草稿线：先出现、像铅笔一样淡，墨线再盖上去
  const cx0 = 470, cy0 = 268;
  pen(gGuide, 'M0 306 H900', 'g', 0.1, 1.6);
  pen(gGuide, 'M40 80 H866 V500 H40 Z', 'g', 0.3, 2);
  const guideIris = el('g', {}, gGuide);
  pen(guideIris, 'M-152 0 a152 152 0 1 0 304 0 a152 152 0 1 0 -304 0', 'g', 0.6, 1.6);
  pen(guideIris, 'M0 -190 V190 M-190 0 H190', 'g', 0.8, 1.4);
  pen(guideIris, 'M-10 -152 h20 M-10 152 h20 M-152 -10 v20 M152 -10 v20', 'g', 1.2, 0.8);
  for (let i = 0; i < 7; i++) {
    const a = (R() - 0.5) * 3;
    pen(gGuide, `M${60 + i * 110} 286 l${f1(Math.cos(a) * 14)} ${f1(Math.sin(a) * 14)}`, 'g', 1.4 + i * 0.05, 0.6);
  }

  // ── 眉：很多短线，沿一条弧排开
  const browC = bez([100, 150], [250, 40], [470, 18], [720, 78], 60);
  for (let i = 2; i < browC.length - 2; i++) {
    const [x, y] = browC[i], t = i / browC.length;
    const len = 18 + R() * 30 * (1 - Math.abs(t - 0.45));
    const ang = ((-52 + t * 30 + (R() - 0.5) * 14) * Math.PI) / 180;
    const dx = Math.cos(ang) * len * (R() < 0.5 ? -1 : 1) * -1, dy = Math.sin(ang) * len * 0.7;
    pen(gBrow, `M${f1(x)} ${f1(y + R() * 10)} q${f1(dx * 0.5 + 3)} ${f1(dy * 0.4 - 4)} ${f1(dx)} ${f1(dy)}`, 't', 0.5 + t * 1.2 + R() * 0.2, 0.5);
  }
  pen(gBrow, poly(bez([96, 160], [250, 60], [470, 34], [740, 96], 40)), '', 0.5, 1.8);

  // ── 眼睑：主线、回笔线、重睑线、睫毛
  const lidMain = pen(gLid, '', 'b', 1.0, 1.8);
  const lidEcho = pen(gLid, '', 't', 1.3, 1.8);
  const crease = pen(gLid, '', '', 1.5, 1.6);
  const lowMain = pen(gLid, '', '', 1.2, 1.6);
  const lowEcho = pen(gLid, '', 't', 1.5, 1.6);
  const lashes: { i: number; len: number; bend: number; p: SVGPathElement }[] = [];
  for (let i = 3; i < N - 2; i += 2) {
    const t = i / N;
    lashes.push({ i, len: 12 + 34 * Math.pow(1 - t, 1.2) * (0.7 + R() * 0.6) + (t > 0.8 ? -6 : 0), bend: (R() - 0.3) * 14, p: pen(gLid, '', 't', 1.9 + t * 0.8 + R() * 0.15, 0.6) });
  }
  const lowLashes: { i: number; len: number; p: SVGPathElement }[] = [];
  for (let i = 5; i < N * 0.5; i += 4) lowLashes.push({ i, len: 7 + R() * 9, p: pen(gLid, '', 't', 2.6 + (i / N) * 0.4, 0.5) });
  pen(gLid, 'M806 318 q14 -8 30 6 q-14 16 -30 -6 M814 320 q8 -3 14 3', 't', 2.3, 1);

  function shape(k: number) {
    const up: Pt[] = [], lo: Pt[] = [];
    for (let i = 0; i <= N; i++) { up.push(pt(i, k)); lo.push(L[i]); }
    openPath.setAttribute('d', poly(up) + poly(lo.slice().reverse()).replace('M', 'L') + 'Z');
    lidMain.setAttribute('d', poly(up));
    lidEcho.setAttribute('d', poly(up.slice(6, N - 8).map((p, j): Pt => [p[0] + 3 + Math.sin(j * 0.4) * 1.6, p[1] - 4 - Math.cos(j * 0.3) * 1.5])));
    crease.setAttribute('d', poly(up.slice(10, N - 12).map((p, j): Pt => { const n = nrm(up, j + 10); return [p[0] + n[0] * (22 + k * 6), p[1] + n[1] * (22 + k * 6)]; })));
    lowMain.setAttribute('d', poly(L.slice(0, N - 3)));
    lowEcho.setAttribute('d', poly(L.slice(12, N - 10).map((p, j): Pt => [p[0] - 2, p[1] + 6 + Math.sin(j * 0.5) * 1.5])));
    lashes.forEach(({ i, len, bend, p }) => {
      const a = up[i], n = nrm(up, i), sx = -0.55;
      const dx = (n[0] + sx) * len * 0.7, dy = n[1] * len;
      p.setAttribute('d', `M${f1(a[0])} ${f1(a[1])} q${f1(dx * 0.3 + bend * 0.2)} ${f1(dy * 0.6)} ${f1(dx + bend * 0.1)} ${f1(dy)}`);
    });
    lowLashes.forEach(({ i, len, p }) => {
      const a = L[i], n = nrm(L, i);
      p.setAttribute('d', `M${f1(a[0])} ${f1(a[1])} l${f1(-n[0] * len * 0.5)} ${f1(n[1] * len * -1)}`);
    });
  }
  shape(1);

  // ── 眼球：上眼睑投下来的排线，还有眼角的细线
  const shade = el('g', {}, gBall);
  for (let i = 4; i < N - 3; i++) {
    const a = U[i], n = nrm(U, i);
    const len = 26 + Math.sin(i * 0.35) * 10 + R() * 10, sk = 0.55;
    pen(shade, `M${f1(a[0])} ${f1(a[1])} l${f1(-n[0] * len * sk + len * 0.18)} ${f1(-n[1] * len)}`, 't', 2.2 + (i / N) * 1.2, 0.5);
  }
  const lowCurve = bez(P0, [210, 388], [440, 430], [624, 398], 32);
  for (let i = 0; i < 22; i++) {
    const a = lowCurve[3 + i];
    pen(shade, `M${f1(a[0])} ${f1(a[1])} l${f1(8 + R() * 10)} ${f1(-10 - R() * 8)}`, 't', 3.2 + i * 0.03, 0.4);
  }

  // ── 虹膜：整组跟着指针走
  const iris = el('g', {}, gBall);
  const irisInner = el('g', {}, iris);
  const fg = el('linearGradient', { id: 'eye-fade', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -118, x2: 0, y2: 34 }, defs);
  el('stop', { offset: 0, 'stop-color': '#fff' }, fg);
  el('stop', { offset: 0.55, 'stop-color': '#aaa' }, fg);
  el('stop', { offset: 1, 'stop-color': '#000' }, fg);
  const irisMask = el('mask', { id: 'eye-iris-up', maskUnits: 'userSpaceOnUse', x: -160, y: -160, width: 320, height: 320 }, defs);
  el('rect', { x: -160, y: -160, width: 320, height: 320, fill: 'url(#eye-fade)' }, irisMask);
  const irisClip = el('clipPath', { id: 'eye-iris-all' }, defs);
  el('circle', { r: 118, cx: 0, cy: 0 }, irisClip);
  pen(irisInner, 'M-118 0 a118 118 0 1 0 236 0 a118 118 0 1 0 -236 0', 'b', 2.4, 1.6);
  pen(irisInner, 'M-104 0 a104 104 0 1 0 208 0 a104 104 0 1 0 -208 0', 't', 2.7, 1.4);
  pen(irisInner, 'M-58 0 a58 58 0 1 0 116 0 a58 58 0 1 0 -116 0', 't', 3, 1.2);
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * Math.PI * 2 + R() * 0.05, r1 = 44 + R() * 12, r2 = 84 + R() * 26;
    pen(irisInner, `M${f1(Math.cos(a) * r1)} ${f1(Math.sin(a) * r1)} L${f1(Math.cos(a + 0.02) * r2)} ${f1(Math.sin(a + 0.02) * r2)}`, 't', 3 + R() * 0.6, 0.9);
  }
  const hatch = el('g', { 'clip-path': 'url(#eye-iris-all)' }, irisInner);
  const hup = el('g', { mask: 'url(#eye-iris-up)' }, hatch);
  const hatchLine = (g: Element, deg: number, t: number, dl: number) => {
    const a = (deg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    pen(g, `M${f1(nx * t - dx * 150)} ${f1(ny * t - dy * 150)} L${f1(nx * t + dx * 150)} ${f1(ny * t + dy * 150)}`, 't', dl, 0.7);
  };
  for (let t = -170, j = 0; t < 170; t += 5.6, j++) hatchLine(hup, 38, t, 3.4 + j * 0.012);
  for (let t = -170, j = 0; t < 170; t += 9, j++) hatchLine(hup, -40, t, 3.7 + j * 0.01);
  const hlow = el('g', { 'clip-path': 'url(#eye-iris-all)' }, irisInner);
  const lowClip = el('clipPath', { id: 'eye-low-quad' }, defs);
  el('rect', { x: 30, y: 20, width: 100, height: 100 }, lowClip);
  const hlowIn = el('g', { 'clip-path': 'url(#eye-low-quad)' }, hlow);
  for (let t = 40, j = 0; t < 190; t += 7, j++) hatchLine(hlowIn, 38, t, 3.9 + j * 0.02);
  const pupil = el('circle', { r: 40, cx: 0, cy: 0, class: 'fill' }, irisInner);
  pupil.style.setProperty('--dl', '4.2s');
  const glints = [
    el('circle', { r: 13, cx: -34, cy: -36, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1.2 }, irisInner),
    el('circle', { r: 5.5, cx: 30, cy: 32, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, irisInner),
  ];
  glints.forEach((g) => { g.style.opacity = reduce ? '1' : '0'; g.style.transition = reduce ? 'none' : 'opacity .6s ease 4.4s'; });

  // ── 裂纹：从眼角出发，红色。页面里最先出现的红
  const rc = seeded(9);
  let cxp = 846, cyp = 324, ang = 1.55;
  const crack: Pt[] = [[cxp, cyp]];
  for (let i = 0; i < 11; i++) {
    ang += (rc() - 0.5) * 0.9;
    const l = 14 + rc() * 26;
    cxp += Math.cos(ang) * l; cyp += Math.sin(ang) * l;
    crack.push([cxp, cyp]);
  }
  pen(gCrack, poly(crack), 'r', 4.6, 1.8);
  [3, 6, 9].forEach((s, bi) => {
    let x = crack[s][0], y = crack[s][1], a = ang + (bi % 2 ? -1 : 1) * (0.7 + rc() * 0.4);
    const b: Pt[] = [[x, y]];
    for (let i = 0; i < 7; i++) { a += (rc() - 0.5) * 0.9; const l = 10 + rc() * 16; x += Math.cos(a) * l; y += Math.sin(a) * l; b.push([x, y]); }
    pen(gCrack, poly(b), 'r t', 5.2 + bi * 0.2, 0.9);
  });
  for (let i = 0; i < 16; i++) {
    const s = crack[Math.floor(rc() * crack.length)];
    const c = el('circle', { cx: f1(s[0] + (rc() - 0.5) * 60), cy: f1(s[1] + (rc() - 0.5) * 40), r: f1(0.8 + rc() * 3), class: 'fillr' }, gCrack);
    c.style.setProperty('--dl', 5.4 + rc() * 0.8 + 's');
  }

  // ── 手写批注
  const note = el('text', { x: 430, y: 516, class: 'hand', 'font-size': 17, fill: 'var(--ink)' }, gGuide);
  note.textContent = opts.note ?? '在看你。';
  note.style.opacity = reduce ? '1' : '0';
  note.style.transition = reduce ? 'none' : 'opacity .8s ease 3.4s';
  pen(gGuide, 'M500 506 C548 492 556 452 540 420', 't', 3.4, 1.4);

  // ── 编排
  setTimeout(() => {
    svg.classList.add('go');
    note.style.opacity = '1';
    glints.forEach((g) => (g.style.opacity = '1'));
  }, reduce ? 0 : 250);
  setTimeout(() => svg.classList.add('done'), reduce ? 0 : 7200);

  // ── 指针跟踪 + 眨眼 + 线抖
  const turb = document.getElementById('boil-a');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // 手机上把眼睛裁近一点：虹膜和内眼角占满宽度，批注也读得出来
  const small = matchMedia('(max-width: 900px)');
  const crop = () => svg.setAttribute('viewBox', small.matches ? '110 20 790 520' : '0 0 900 540');
  crop();
  small.addEventListener('change', crop);
  let tx = 0, ty = 0, ox = 0, oy = 0, k = opts.closed ? 0.06 : 1;
  let blinkAt = 0, lastMove = performance.now(), visible = true;
  let nextBlink = performance.now() + 3500, boilAt = 0, seed = 3;
  const place = () => {
    iris.setAttribute('transform', `translate(${f1(cx0 + ox)} ${f1(cy0 + oy)})`);
    guideIris.setAttribute('transform', `translate(${f1(cx0 + ox)} ${f1(cy0 + oy)})`);
  };
  place();
  if (opts.closed) shape(k);

  if (!reduce) {
    addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const mx = (e.clientX - (r.left + r.width * 0.52)) / r.width, my = (e.clientY - (r.top + r.height * 0.5)) / r.height;
      tx = clamp(mx * 170, -62, 62); ty = clamp(my * 120, -34, 38);
      lastMove = performance.now();
    }, { passive: true });
    addEventListener('pointerdown', () => { if (!blinkAt) blinkAt = performance.now(); });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(svg);

    const frame = (now: number) => {
      svg.classList.toggle('boil-on', visible);
      if (visible) {
        if (now - lastMove > 3500) { const t = now / 1000; tx = Math.sin(t * 0.5) * 40; ty = Math.sin(t * 0.37) * 18; }
        ox += (tx - ox) * 0.12; oy += (ty - oy) * 0.12;
        place();
        if (opts.closed) {
          // 闭着：点一下睁开一瞬
          if (blinkAt) {
            const t = (now - blinkAt) / 1400;
            if (t >= 1) { blinkAt = 0; k = 0.06; } else k = 0.06 + Math.sin(t * Math.PI) * 0.9;
            shape(k);
          }
        } else {
          if (now > nextBlink && !blinkAt) { blinkAt = now; nextBlink = now + 3800 + Math.random() * 3500; }
          if (blinkAt) {
            const t = (now - blinkAt) / 260;
            if (t >= 1) { blinkAt = 0; k = 1; shape(1); } else { k = 1 - Math.sin(t * Math.PI) * 0.96; shape(k); }
          }
        }
        if (fine && svg.classList.contains('done') && turb && now - boilAt > 125) { boilAt = now; seed = (seed % 40) + 1; turb.setAttribute('seed', String(seed)); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
