const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bar = document.getElementById('progress');
if (bar && !reduce) {
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
}

const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[data-slug]')];
if (links.length) {
  const heads = links
    .map((a) => document.getElementById(a.dataset.slug ?? ''))
    .filter((h): h is HTMLElement => !!h);
  let active = -1;
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        const i = heads.indexOf(e.target as HTMLElement);
        if (i !== active) {
          links[active]?.classList.remove('on');
          links[i].classList.add('on');
          active = i;
        }
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  heads.forEach((h) => io.observe(h));
}

export {};
