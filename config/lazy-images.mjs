import { defineHastPlugin } from 'satteri';

/**
 * 文章里的图片：
 * - 延迟加载：74 篇文章里有 70 多张外链图，不该一次全拉；
 * - 不带 Referer：极客时间的图床会拒绝来自别的域名的请求，没有 Referer 才放行。
 */
export const lazyImages = defineHastPlugin({
  name: 'lazy-images',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      ctx.setProperty(node, 'loading', 'lazy');
      ctx.setProperty(node, 'decoding', 'async');
      ctx.setProperty(node, 'referrerpolicy', 'no-referrer');
    },
  },
});
