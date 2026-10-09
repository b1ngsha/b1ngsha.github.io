/** 滚到就画：给进入视口的线稿加 .go，让描线动画开始。 */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('go'); io.unobserve(e.target); }
}), { threshold: 0.3 });
document.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));

export {};
