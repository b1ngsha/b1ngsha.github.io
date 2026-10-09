const root = document.documentElement;
const btn = document.getElementById('theme-toggle');
const current = () => root.dataset.theme === 'dark';
const apply = (dark: boolean) => {
  root.dataset.theme = dark ? 'dark' : 'light';
  btn?.setAttribute('aria-pressed', String(dark));
  btn?.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
};
apply(current());
btn?.addEventListener('click', () => {
  const dark = !current();
  apply(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
});

export {};
