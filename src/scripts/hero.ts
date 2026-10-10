/**
 * 首屏：花、蝴蝶和名字，是一个会互动的整体。
 *  1. 打开：墨线一笔笔画出来（只有线，没有滤镜）；画完，上了色的静态图淡入盖住线稿；
 *     蝴蝶从右上角慢慢飞来，落在花瓣上；
 *  2. 平时：蝴蝶绕着花飞，隔一会儿停下；第一次落下之后下一站是名字的第一个字母；
 *  3. 鼠标进入首屏：蝴蝶过来绕着鼠标飞，花丛随鼠标轻轻倾斜；鼠标停了，它落到最近的花瓣；
 *  4. 点一下：撒一把颜料粉尘；
 *  5. 减少动态效果：直接是画好的样子，蝴蝶停在花瓣上，不飞，不倾斜，没有粉尘。
 *
 * 性能：整个动画里浏览器不再每帧计算 SVG 滤镜。
 *  - 花是一张预先上色的静态图，只做淡入和位移（合成器处理）；
 *  - 蝴蝶的翅膀是一张贴图，飞行和扇翅都只改 CSS transform；
 *  - 粉尘用预先画好的小圆点贴图，没有 shadowBlur。
 */
type Pt = { x: number; y: number };
interface Landing { x: number; y: number; a: number }
interface Flight { p0: Pt; c1: Pt; c2: Pt; p3: Pt; t0: number; dur: number; to?: Landing }

// 与 src/art/hero.ts 的 VIEW_BOX 保持一致：蝴蝶、落点、鼠标都用这个坐标系
const VB = { x: 150, y: 70, w: 670, h: 620 };
const BF_SCALE = 1.12;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const bez = (f: Flight, u: number): Pt => {
  const v = 1 - u;
  return {
    x: v * v * v * f.p0.x + 3 * v * v * u * f.c1.x + 3 * v * u * u * f.c2.x + u * u * u * f.p3.x,
    y: v * v * v * f.p0.y + 3 * v * v * u * f.c1.y + 3 * v * u * u * f.c2.y + u * u * u * f.p3.y,
  };
};

export function mountHero(root: HTMLElement, opts: { lost?: boolean; nameSelector?: string } = {}): void {
  const petalLandings: Landing[] = JSON.parse(root.dataset.landings ?? '[]');
  const centre: Pt = { x: Number(root.dataset.cx ?? 500), y: Number(root.dataset.cy ?? 380) };
  const bf = root.querySelector<HTMLElement>('#bf');
  const wr = root.querySelector<HTMLElement>('.wr');
  const wl = root.querySelector<HTMLElement>('.wl');
  if (!bf || !wr || !wl || petalLandings.length === 0) return;
  const host = root.parentElement as HTMLElement;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  // ── 坐标：svg 坐标 ↔ 像素（相对 host）。只在尺寸变化时重新量
  let u = 1; // 每个 svg 单位对应多少 CSS 像素
  let ox = 0, oy = 0; // root 左上角在 host 里的位置
  const measure = () => {
    u = root.clientWidth / VB.w;
    ox = root.offsetLeft; oy = root.offsetTop;
    fit();
  };
  const toPx = (p: Pt): Pt => ({ x: ox + (p.x - VB.x) * u, y: oy + (p.y - VB.y) * u });

  // ── 贴图蝴蝶：容器负责位置和朝向，两只翅膀各自 scaleX 扇动
  let blurPx = -1;
  const place = (p: Pt, rot: number, flap: number, blur: number) => {
    const k = u * BF_SCALE;
    bf.style.transform = `translate3d(${((p.x - VB.x) * u).toFixed(1)}px, ${((p.y - VB.y) * u).toFixed(1)}px, 0) rotate(${rot.toFixed(3)}rad) scale(${k.toFixed(3)})`;
    const sy = (0.94 + 0.06 * flap).toFixed(3);
    wr.style.transform = `scale(${flap.toFixed(3)}, ${sy})`;
    wl.style.transform = `scale(${(-flap).toFixed(3)}, ${sy})`;
    const q = Math.round(blur * k * 2) / 2; // 半像素一档，别每帧都改滤镜
    if (q !== blurPx) { blurPx = q; bf.style.filter = q > 0 ? `blur(${q}px)` : ''; }
  };

  // ── 落脚点：花瓣 + 名字第一个字母的上沿
  const landings: Landing[] = [...petalLandings];
  let nameLanding: Landing | null = null;
  const measureName = () => {
    const h1 = opts.nameSelector ? document.querySelector<HTMLElement>(opts.nameSelector) : null;
    if (!h1 || !h1.firstChild) return;
    const range = document.createRange();
    range.setStart(h1.firstChild, 0);
    range.setEnd(h1.firstChild, 1);
    const r = range.getBoundingClientRect();
    const c = document.createElement('canvas').getContext('2d');
    if (!c || !r.width) return;
    c.font = getComputedStyle(h1).font;
    const tm = c.measureText('b');
    const top = r.top + tm.fontBoundingBoxAscent - tm.actualBoundingBoxAscent;
    const hr = host.getBoundingClientRect();
    const px = r.left - hr.left + tm.width * 0.6, py = top - hr.top - 8;
    // 蝴蝶的原点在胸口，尾翼往下垂约 100 个单位：落点抬高，让翅膀站在字母上沿，不盖住字
    const p = { x: (px - ox) / u + VB.x, y: (py - oy) / u + VB.y - 62 };
    if (nameLanding) landings.splice(landings.indexOf(nameLanding), 1);
    nameLanding = { x: p.x, y: p.y, a: -0.22 };
    landings.push(nameLanding);
  };

  // ── 颜料粉尘：预先画好的软圆点，没有 shadowBlur
  const cv = document.createElement('canvas');
  cv.className = 'dust';
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  function fit() { cv.width = host.clientWidth * dpr; cv.height = host.clientHeight * dpr; }
  const palette = ['#e3162f', '#e3162f', '#c41230', '#f3a2ab', '#f6c4c8', '#5e0612'];
  const sprites = palette.map((col) => {
    const s = document.createElement('canvas');
    s.width = s.height = 32;
    const g = s.getContext('2d') as CanvasRenderingContext2D;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, col); grad.addColorStop(0.45, col); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    return s;
  });
  interface Grain { x: number; y: number; vx: number; vy: number; t: number; life: number; r: number; c: number; line: boolean; rot: number }
  const grains: Grain[] = [];
  const tips = [[84, -78], [-84, -78], [66, 98], [-66, 98], [60, 10], [-60, 10]];
  const spawn = (x: number, y: number, power: number) => {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(4, 22) * power;
    grains.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + rand(2, 12), t: 0, life: rand(0.9, 2.4), r: rand(0.8, 2.8),
      c: Math.floor(Math.random() * palette.length), line: Math.random() < 0.28, rot: Math.random() * Math.PI,
    });
  };
  let cur = { pos: { x: 0, y: 0 }, rot: 0 };
  const emit = (n: number, power: number) => {
    const k = u * BF_SCALE, c = Math.cos(cur.rot), s = Math.sin(cur.rot);
    const o = toPx(cur.pos);
    for (let i = 0; i < n; i++) {
      const [lx, ly] = tips[Math.floor(Math.random() * tips.length)];
      const x = lx * rand(0.5, 1) * k, y = ly * rand(0.5, 1) * k;
      spawn(o.x + x * c - y * s, o.y + x * s + y * c, power);
    }
    if (grains.length > 380) grains.splice(0, grains.length - 380);
  };
  let dirty = false; // 画布上还有没擦掉的东西
  const drawGrains = (dt: number) => {
    if (!ctx || (!grains.length && !dirty)) return; // 没有粉尘就不碰画布
    dirty = grains.length > 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i];
      g.t += dt;
      if (g.t >= g.life) { grains.splice(i, 1); continue; }
      g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.985; g.vy = g.vy * 0.985 + 6 * dt;
      const k = 1 - g.t / g.life;
      ctx.globalAlpha = Math.min(1, k * 1.6) * 0.85;
      if (g.line) {
        ctx.strokeStyle = palette[g.c]; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.rot) * g.r * 5, g.y + Math.sin(g.rot) * g.r * 5); ctx.stroke();
      } else {
        const d = g.r * 2.4 * (0.6 + k * 0.5);
        ctx.drawImage(sprites[g.c], g.x - d, g.y - d, d * 2, d * 2);
      }
    }
    ctx.globalAlpha = 1;
  };

  measure();
  new ResizeObserver(() => { measure(); measureName(); }).observe(root);
  document.fonts.ready.then(() => { measure(); measureName(); });

  // ── 开场：先画线，画完淡入上色的图
  const decodes = [...root.querySelectorAll<HTMLImageElement>('img.paint')].map((i) => i.decode().catch(() => {}));
  setTimeout(() => root.classList.add('go'), reduce ? 0 : 200);
  setTimeout(() => Promise.all(decodes).then(() => root.classList.add('painted')), reduce ? 0 : 4200);
  setTimeout(() => root.classList.add('done'), reduce ? 0 : 7000);

  if (reduce) {
    cv.remove();
    const l = petalLandings[0];
    place({ x: l.x, y: l.y }, l.a, 0.9, 0);
    bf.style.opacity = '1';
    return;
  }

  // ── 鼠标：花丛倾斜，蝴蝶跟随
  let ptr: Pt | null = null;
  let ptrAt = 0;
  let sx = 0, sy = 0, srot = 0, tsx = 0, tsy = 0, tsrot = 0;
  host.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const hr = host.getBoundingClientRect();
    ptr = { x: (e.clientX - hr.left - ox) / u + VB.x, y: (e.clientY - hr.top - oy) / u + VB.y };
    ptrAt = performance.now();
    const nx = clamp(((e.clientX - hr.left) / hr.width) * 2 - 1, -1, 1), ny = clamp(((e.clientY - hr.top) / hr.height) * 2 - 1, -1, 1);
    tsx = nx * -9; tsy = ny * -5; tsrot = nx * 1.4;
  }, { passive: true });
  host.addEventListener('pointerleave', () => { ptr = null; tsx = tsy = tsrot = 0; });
  host.addEventListener('pointerdown', (e) => {
    const hr = host.getBoundingClientRect();
    for (let i = 0; i < 38; i++) spawn(e.clientX - hr.left, e.clientY - hr.top, 2.2);
    if (state === 'rest') restUntil = 0;
  });

  // ── 蝴蝶的状态
  type State = 'arrive' | 'rest' | 'fly' | 'follow';
  let state: State = 'arrive';
  let landed = 0;
  let flight: Flight;
  let pos: Pt = { x: 1010, y: -60 };
  let rot = 0.5;
  let restUntil = 0;
  let restAt: Landing = petalLandings[0];
  let freq = 2.4, amp = 0.5, phase = 0, orbit = 0;
  let queue: Flight[] = [];
  let visible = true;
  let last = performance.now();
  let lastPos: Pt = { ...pos };
  let emitAcc = 0;

  const toLanding = (from: Pt, l: Landing, dur: number, loop = false): Flight => {
    const dx = l.x - from.x, dy = l.y - from.y;
    const nx = -dy, ny = dx;
    const k = loop ? rand(0.5, 0.9) : rand(0.2, 0.45);
    const s = Math.random() < 0.5 ? 1 : -1;
    return {
      p0: from,
      c1: { x: from.x + dx * 0.25 + nx * k * s, y: from.y + dy * 0.25 + ny * k * s - rand(10, 50) },
      c2: { x: l.x - dx * 0.2 - nx * k * s * 0.6, y: l.y - dy * 0.2 - ny * k * s * 0.6 - rand(20, 60) },
      p3: { x: l.x, y: l.y }, t0: 0, dur, to: l,
    };
  };
  const toPoint = (from: Pt, p: Pt, dur: number): Flight => ({
    p0: from,
    c1: { x: from.x + (p.x - from.x) * 0.3 + rand(-90, 90), y: from.y + (p.y - from.y) * 0.3 + rand(-90, 90) },
    c2: { x: p.x - (p.x - from.x) * 0.25 + rand(-90, 90), y: p.y - (p.y - from.y) * 0.25 + rand(-90, 90) },
    p3: p, t0: 0, dur,
  });
  const orbitPoint = (from: Pt): Pt => {
    const a0 = Math.atan2(from.y - centre.y, from.x - centre.x);
    const a = a0 + (Math.random() < 0.5 ? 1 : -1) * rand(1.1, 2.6);
    const r = rand(220, 300);
    return { x: centre.x + Math.cos(a) * r * 1.1, y: Math.min(centre.y - 30, centre.y + Math.sin(a) * r * 0.8) };
  };
  const nearest = (p: Pt): Landing => landings.reduce((b, l) => (Math.hypot(l.x - p.x, l.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? l : b), landings[0]);
  const startFlight = (f: Flight, now: number) => { f.t0 = now; f.p0 = { ...pos }; flight = f; state = 'fly'; };

  const planNext = (now: number) => {
    let next = landings[Math.floor(Math.random() * landings.length)];
    if (landings.length > 1) while (next === restAt) next = landings[Math.floor(Math.random() * landings.length)];
    // 第一次落下之后，下一站一定是名字的第一个字母：让访客看到文字和画是连着的
    if (nameLanding && landed === 1) next = nameLanding;
    else if (nameLanding && restAt !== nameLanding && Math.random() < 0.22) next = nameLanding;
    queue = [];
    if (opts.lost || Math.random() < 0.5) {
      const w1 = orbitPoint(pos), w2 = orbitPoint(w1);
      queue.push(toPoint(pos, w1, rand(2.2, 3.2)), toPoint(w1, w2, rand(2.2, 3.2)));
      queue.push(opts.lost ? toPoint(w2, orbitPoint(w2), rand(2.4, 3.4)) : toLanding(w2, next, rand(2.4, 3.4), true));
    } else {
      queue.push(toLanding(pos, next, rand(2.8, 4.2)));
    }
    startFlight(queue.shift() as Flight, now);
  };

  const first = petalLandings[0];
  flight = {
    p0: pos, c1: { x: 860, y: 60 }, c2: { x: first.x + 160, y: first.y - 190 }, p3: { x: first.x, y: first.y },
    t0: performance.now() + 1500, dur: 7, to: first,
  };
  bf.style.opacity = '0';
  place(pos, rot, 0.6, 0.9);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(host);

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) {
      // 花丛：慢慢倾向鼠标，同时有一点自己的呼吸。只改 transform，由合成器处理
      const breathe = Math.sin(now * 0.0007) * 0.35;
      sx = lerp(sx, tsx, Math.min(1, dt * 2)); sy = lerp(sy, tsy, Math.min(1, dt * 2)); srot = lerp(srot, tsrot + breathe, Math.min(1, dt * 2));
      root.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0) rotate(${srot.toFixed(3)}deg)`;

      let target = rot, wantFreq = freq, wantAmp = amp;
      const ptrLive = ptr && now - ptrAt < 2200;
      if (ptrLive && landed > 0 && !opts.lost && (state === 'rest' || state === 'fly')) { state = 'follow'; queue = []; }

      if (state === 'arrive' || state === 'fly') {
        const f = flight;
        const dur = f.dur * 1000;
        const uu = clamp((now - f.t0) / dur, 0, 1);
        if (now >= f.t0) {
          bf.style.opacity = '1';
          const p = bez(f, ease(uu)), q = bez(f, ease(Math.min(1, uu + 0.02)));
          const wob = Math.sin(now * 0.0036) * 7 * (1 - uu * 0.85);
          const bob = Math.sin(now * 0.009) * 3.2 * (1 - uu * 0.9);
          const vx = q.x - p.x, vy = q.y - p.y, len = Math.hypot(vx, vy) || 1;
          pos = { x: p.x + (-vy / len) * wob, y: p.y + (vx / len) * wob + bob };
          if (len > 0.05) target = Math.atan2(vy, vx) + Math.PI / 2;
          if (f.to && uu > 0.8) target = f.to.a + angleDiff(f.to.a, target) * (1 - (uu - 0.8) / 0.2);
          const k = Math.max(0, uu - 0.75) / 0.25;
          wantFreq = lerp(3.3, 1.6, k); wantAmp = lerp(0.5, 0.35, k);
        }
        if (uu >= 1 && now >= f.t0) {
          if (f.to) {
            state = 'rest'; restAt = f.to; pos = { x: f.to.x, y: f.to.y };
            restUntil = now + rand(2200, 4600); landed++;
            cur = { pos, rot }; emit(26, 1.5);
          } else if (queue.length) startFlight(queue.shift() as Flight, now);
          else planNext(now);
        }
      } else if (state === 'follow') {
        if (!ptrLive || !ptr) {
          const l = nearest(ptr ?? pos);
          queue = [];
          startFlight(toLanding(pos, l, rand(1.4, 2.2)), now);
        } else {
          orbit += dt * 2.6;
          const tgt = { x: ptr.x + Math.cos(orbit) * 52, y: ptr.y + Math.sin(orbit * 1.3) * 34 - 26 };
          const nx = lerp(pos.x, tgt.x, Math.min(1, dt * 2.4)), ny = lerp(pos.y, tgt.y, Math.min(1, dt * 2.4));
          const vx = nx - pos.x, vy = ny - pos.y;
          pos = { x: nx, y: ny };
          if (Math.hypot(vx, vy) > 0.25) target = Math.atan2(vy, vx) + Math.PI / 2;
          wantFreq = 3.6; wantAmp = 0.5;
        }
      } else {
        target = restAt.a; wantFreq = 0.5; wantAmp = 0.2;
        if (now > restUntil) planNext(now);
      }

      const sp = state === 'rest' ? 0 : Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y) / Math.max(dt, 0.001);
      lastPos = { ...pos };
      freq = lerp(freq, wantFreq, Math.min(1, dt * 3));
      amp = lerp(amp, wantAmp, Math.min(1, dt * 3));
      phase += dt * freq * Math.PI * 2;
      rot += angleDiff(rot, target) * Math.min(1, dt * (state === 'rest' ? 5 : 3.2));
      const flap = 1 - amp * (0.5 + 0.5 * Math.cos(phase)) * 1.5;
      cur = { pos, rot };
      place(pos, rot, clamp(flap, 0.3, 1), state === 'rest' ? 0.7 : Math.min(2.4, 0.9 + sp * 0.01));
      emitAcc += (state === 'rest' ? 1.6 : Math.min(60, 8 + sp * 0.28)) * dt;
      if (bf.style.opacity === '1' && emitAcc >= 1) { const n = Math.floor(emitAcc); emitAcc -= n; emit(n, state === 'rest' ? 0.35 : 1); }
    }
    drawGrains(dt);
    requestAnimationFrame(frame);
  };
  void landed;
  requestAnimationFrame(frame);
}

export {};
