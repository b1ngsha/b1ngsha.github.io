import { defineHastPlugin } from 'satteri';

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
