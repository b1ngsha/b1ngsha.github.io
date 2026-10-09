/** 站点级的固定信息。改名字、联系方式、评论配置都在这里。 */
export const site = {
  /** 浏览器标签、订阅、分享里显示的名字 */
  name: 'About Cheyne',
  /** 首页大字 */
  handle: '冰沙',
  latin: 'Cheyne · b1ngsha',
  url: 'https://b1ngsha.site',
  description: '冰沙（Cheyne）的个人主页：近况、年谱，和写过的笔记。',
  intro: '在腾讯做蓝鲸智云体系的平台 SaaS 开发，下班后学 infra。',
  /** 首页尾声的大字 */
  coda: '好想再去\n一次日本。',
  links: {
    github: 'https://github.com/b1ngsha',
    x: 'https://x.com/B1ngsha',
    telegram: 'https://t.me/b1ngsha',
    rss: '/atom.xml',
  },
  /** 邮箱不直接写进页面，由脚本拼出来，爬虫抓不到 */
  email: { user: 'cheyne94', host: 'outlook.com' },
  /** Giscus 评论。仓库 id 和分类 id 在 https://giscus.app 生成；留空则不显示评论。 */
  giscus: {
    repo: 'b1ngsha/b1ngsha.github.io',
    repoId: 'R_kgDOLgWEig',
    category: 'Announcements',
    categoryId: 'DIC_kwDOLgWEis4DHYhx',
  },
  homePostCount: 8,
} as const;
