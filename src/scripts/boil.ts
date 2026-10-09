/**
 * 次要线稿的“沸腾”：每隔一会儿换一次噪声，线条轻轻抖。
 * - 只给当前在屏幕里的线稿加滤镜（滤镜是整块重绘，屏幕外的不该花这个钱）；
 * - 页面不可见、减少动态、手机这类触屏设备上完全不跑。
 */
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const turb = document.getElementById('boil-b');
if (turb && fine && !reduce) {
  let seed = 8;
  setInterval(() => {
    if (document.hidden) return;
    seed = (seed % 40) + 1;
    turb.setAttribute('seed', String(seed));
    const vh = innerHeight;
    document.querySelectorAll<SVGElement>('svg[data-boil]').forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.toggle('boil-on', r.bottom > 0 && r.top < vh && el.classList.contains('go'));
    });
  }, 125);
}

export {};
