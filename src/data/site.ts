export const site = {
  name: 'About Cheyne',
  handle: 'Cheyne',
  /** 只在首屏那一句话里出现一次 */
  alias: 'b1ngsha',
  url: 'https://b1ngsha.site',
  description: 'Cheyne works in embodied AI and wants to build infrastructure. Experience, and notes on infrastructure, Rust and C++.',
  links: {
    github: 'https://github.com/b1ngsha',
    x: 'https://x.com/B1ngsha',
    telegram: 'https://t.me/b1ngsha',
    rss: '/atom.xml',
  },
  email: { user: 'cheyne94', host: 'outlook.com' },
  giscus: {
    repo: 'b1ngsha/b1ngsha.github.io',
    repoId: 'R_kgDOLgWEig',
    category: 'Announcements',
    categoryId: 'DIC_kwDOLgWEis4DHYhx',
  },
} as const;
