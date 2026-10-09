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
