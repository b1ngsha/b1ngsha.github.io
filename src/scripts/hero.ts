/**
 * 首屏：彼岸花、蝴蝶和名字，是一个会互动的整体。
 *  1. 打开页面：花一笔笔画出来，蝴蝶从右上角慢慢飞来，落在花瓣上；
 *  2. 平时：蝴蝶在花丛周围飞，隔一会儿停下；有时停在名字的第一个字母上；
 *  3. 鼠标进入首屏：蝴蝶好奇地绕着鼠标飞，花丛随鼠标轻轻倾斜；鼠标不动了，它落到离鼠标最近的地方；
 *  4. 点一下：撒一把颜料粉尘；
 *  5. 减少动态效果：蝴蝶直接停在花瓣上，不飞，不倾斜，没有粉尘。
 */
type Pt = { x: number; y: number };
interface Landing { x: number; y: number; a: number }
interface Flight { p0: Pt; c1: Pt; c2: Pt; p3: Pt; t0: number; dur: number; to?: Landing }

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

export function mountHero(svg: SVGSVGElement, opts: { lost?: boolean; nameSelector?: string } = {}): void {
  const petalLandings: Landing[] = JSON.parse(svg.dataset.landings ?? '[]');
  const centre: Pt = { x: Number(svg.dataset.cx ?? 500), y: Number(svg.dataset.cy ?? 380) };
  const bf = svg.querySelector<SVGGElement>('#bf');
  const wr = svg.querySelector<SVGGElement>('.bf-r');
  const wl = svg.querySelector<SVGGElement>('.bf-l');
  const blurEl = svg.querySelector('#bfblur');
  if (!bf || !wr || !wl || petalLandings.length === 0) return;
  const host = svg.parentElement as HTMLElement;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const scale = 1.12;
  const place = (p: Pt, rot: number, flap: number) => {
    bf.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((rot * 180) / Math.PI).toFixed(1)}) scale(${scale})`);
    wr.setAttribute('transform', `scale(${flap.toFixed(3)} ${(0.94 + 0.06 * flap).toFixed(3)})`);
    wl.setAttribute('transform', `scale(${(-flap).toFixed(3)} ${(0.94 + 0.06 * flap).toFixed(3)})`);
  };

  // ── 落脚点：花瓣 + 名字第一个字母的上沿（把文字和画连起来）
  const landings: Landing[] = [...petalLandings];
  let nameLanding: Landing | null = null;
  const measureName = () => {
    const h1 = opts.nameSelector ? document.querySelector<HTMLElement>(opts.nameSelector) : null;
    const m = svg.getScreenCTM();
    if (!h1 || !m || !h1.firstChild) return;
    const range = document.createRange();
    range.setStart(h1.firstChild, 0);
    range.setEnd(h1.firstChild, 1);
    const r = range.getBoundingClientRect();
    const c = document.createElement('canvas').getContext('2d');
    if (!c || !r.width) return;
    c.font = getComputedStyle(h1).font;
    const tm = c.measureText('C');
    const baseline = r.top + tm.fontBoundingBoxAscent;
    const top = baseline - tm.actualBoundingBoxAscent;
    const p = new DOMPoint(r.left + tm.width * 0.6, top - 8).matrixTransform(m.inverse());
    if (nameLanding) landings.splice(landings.indexOf(nameLanding), 1);
    // 蝴蝶的原点在胸口，尾翼往下垂约 100 个单位：把落点抬高，让翅膀站在字母上沿，不盖住字
    nameLanding = { x: p.x, y: p.y - 62, a: -0.22 };
    landings.push(nameLanding);
  };
  document.fonts.ready.then(measureName);
  addEventListener('resize', () => { measureName(); fit(); });

  // ── 颜料粉尘
  const cv = document.createElement('canvas');
  cv.className = 'dust';
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  function fit() { cv.width = host.clientWidth * dpr; cv.height = host.clientHeight * dpr; }
  fit();
  interface Grain { x: number; y: number; vx: number; vy: number; t: number; life: number; r: number; col: string; line: boolean; rot: number }
  const grains: Grain[] = [];
  const palette = ['#e3162f', '#e3162f', '#c41230', '#f3a2ab', '#f6c4c8', '#5e0612'];
  const tips = [[84, -78], [-84, -78], [66, 98], [-66, 98], [60, 10], [-60, 10]];
  const spawn = (x: number, y: number, power: number) => {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(4, 22) * power;
    grains.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + rand(2, 12), t: 0, life: rand(0.9, 2.4), r: rand(0.7, 2.6),
      col: palette[Math.floor(Math.random() * palette.length)], line: Math.random() < 0.28, rot: Math.random() * Math.PI,
    });
  };
  const emit = (n: number, power: number) => {
    const m = bf.getScreenCTM();
    const hr = host.getBoundingClientRect();
    if (!m) return;
    for (let i = 0; i < n; i++) {
      const [lx, ly] = tips[Math.floor(Math.random() * tips.length)];
      const pt = new DOMPoint(lx * rand(0.5, 1), ly * rand(0.5, 1)).matrixTransform(m);
      spawn(pt.x - hr.left, pt.y - hr.top, power);
    }
    if (grains.length > 420) grains.splice(0, grains.length - 420);
  };
  const drawGrains = (dt: number) => {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i];
      g.t += dt;
      if (g.t >= g.life) { grains.splice(i, 1); continue; }
      g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.985; g.vy = g.vy * 0.985 + 6 * dt;
      const k = 1 - g.t / g.life;
      ctx.globalAlpha = Math.min(1, k * 1.6) * 0.85;
      ctx.fillStyle = g.col; ctx.strokeStyle = g.col;
      ctx.shadowColor = g.col; ctx.shadowBlur = 5 * (1.2 - k * 0.4);
      if (g.line) {
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.rot) * g.r * 5, g.y + Math.sin(g.rot) * g.r * 5); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r * (0.6 + k * 0.6), g.r * (0.5 + k * 0.5), g.rot, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  };

  setTimeout(() => svg.classList.add('go'), reduce ? 0 : 200);
  setTimeout(() => svg.classList.add('done'), reduce ? 0 : 7000);

  if (reduce) {
    cv.remove();
    const l = petalLandings[0];
    place({ x: l.x, y: l.y }, l.a, 0.9);
    bf.style.opacity = '1';
    return;
  }

  // ── 鼠标：在 svg 坐标里的位置，以及花丛的倾斜
  let ptr: Pt | null = null;
  let ptrAt = 0;
  let sx = 0, sy = 0, srot = 0, tsx = 0, tsy = 0, tsrot = 0;
  const toSvg = (cx: number, cy: number): Pt | null => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  host.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptr = toSvg(e.clientX, e.clientY);
    ptrAt = performance.now();
    const hr = host.getBoundingClientRect();
    const nx = clamp(((e.clientX - hr.left) / hr.width) * 2 - 1, -1, 1), ny = clamp(((e.clientY - hr.top) / hr.height) * 2 - 1, -1, 1);
    tsx = nx * -9; tsy = ny * -5; tsrot = nx * 1.4;
  }, { passive: true });
  host.addEventListener('pointerleave', () => { ptr = null; tsx = tsy = tsrot = 0; });
  host.addEventListener('pointerdown', (e) => {
    const hr = host.getBoundingClientRect();
    for (let i = 0; i < 38; i++) spawn(e.clientX - hr.left, e.clientY - hr.top, 2.2);
    if (state === 'rest') restUntil = 0; // 点一下，蝴蝶被惊起来
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
  place(pos, rot, 0.6);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(host);

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) {
      // 花丛：慢慢倾向鼠标，同时有一点自己的呼吸
      const breathe = Math.sin(now * 0.0007) * 0.35;
      sx = lerp(sx, tsx, Math.min(1, dt * 2)); sy = lerp(sy, tsy, Math.min(1, dt * 2)); srot = lerp(srot, tsrot + breathe, Math.min(1, dt * 2));
      svg.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${srot.toFixed(3)}deg)`;

      let target = rot, wantFreq = freq, wantAmp = amp;
      const ptrLive = ptr && now - ptrAt < 2200;
      // 鼠标在首屏里动：蝴蝶好奇，过来绕着它飞（第一次落下之后才会）
      if (ptrLive && landed > 0 && !opts.lost && (state === 'rest' || state === 'fly')) { state = 'follow'; queue = []; }

      if (state === 'arrive' || state === 'fly') {
        const f = flight;
        const dur = f.dur * 1000;
        const u = clamp((now - f.t0) / dur, 0, 1);
        if (now >= f.t0) {
          bf.style.opacity = '1';
          const p = bez(f, ease(u)), q = bez(f, ease(Math.min(1, u + 0.02)));
          const wob = Math.sin(now * 0.0036) * 7 * (1 - u * 0.85);
          const bob = Math.sin(now * 0.009) * 3.2 * (1 - u * 0.9);
          const vx = q.x - p.x, vy = q.y - p.y, len = Math.hypot(vx, vy) || 1;
          pos = { x: p.x + (-vy / len) * wob, y: p.y + (vx / len) * wob + bob };
          if (len > 0.05) target = Math.atan2(vy, vx) + Math.PI / 2;
          if (f.to && u > 0.8) target = f.to.a + angleDiff(f.to.a, target) * (1 - (u - 0.8) / 0.2);
          const k = Math.max(0, u - 0.75) / 0.25;
          wantFreq = lerp(3.3, 1.6, k); wantAmp = lerp(0.5, 0.35, k);
        }
        if (u >= 1 && now >= f.t0) {
          if (f.to) {
            state = 'rest'; restAt = f.to; pos = { x: f.to.x, y: f.to.y };
            restUntil = now + rand(2200, 4600); landed++; emit(26, 1.5);
          } else if (queue.length) startFlight(queue.shift() as Flight, now);
          else planNext(now);
        }
      } else if (state === 'follow') {
        if (!ptrLive || !ptr) {
          // 鼠标停了：落到离它最近的地方
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
        // 停着：翅膀慢慢开合
        target = restAt.a; wantFreq = 0.5; wantAmp = 0.2;
        if (now > restUntil) planNext(now);
      }

      const sp = state === 'rest' ? 0 : Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y) / Math.max(dt, 0.001);
      lastPos = { ...pos };
      blurEl?.setAttribute('stdDeviation', (state === 'rest' ? 0.7 : Math.min(3.2, 0.9 + sp * 0.012)).toFixed(2));
      emitAcc += (state === 'rest' ? 1.6 : Math.min(60, 8 + sp * 0.28)) * dt;
      if (bf.style.opacity === '1' && emitAcc >= 1) { const n = Math.floor(emitAcc); emitAcc -= n; emit(n, state === 'rest' ? 0.35 : 1); }

      freq = lerp(freq, wantFreq, Math.min(1, dt * 3));
      amp = lerp(amp, wantAmp, Math.min(1, dt * 3));
      phase += dt * freq * Math.PI * 2;
      rot += angleDiff(rot, target) * Math.min(1, dt * (state === 'rest' ? 5 : 3.2));
      const flap = 1 - amp * (0.5 + 0.5 * Math.cos(phase)) * 1.5;
      place(pos, rot, clamp(flap, 0.3, 1));
    }
    drawGrains(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export {};
