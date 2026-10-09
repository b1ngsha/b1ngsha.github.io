// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import redirects from './src/data/redirects.json' with { type: 'json' };
import { satteri } from '@astrojs/markdown-satteri';
import { lightTheme, darkTheme } from './config/shiki-themes.mjs';
import { lazyImages } from './config/lazy-images.mjs';

export default defineConfig({
  site: 'https://b1ngsha.site',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // 老的 Hexo 网址（/年/月/日/文件夹/文件名/）→ 新网址，构建时生成跳转页
  redirects,
  integrations: [
    sitemap({
      // 老网址的跳转页不进 sitemap
      filter: (page) => !/\/\d{4}\/\d{2}\/\d{2}\//.test(new URL(page).pathname),
    }),
  ],
  markdown: {
    processor: satteri({ hastPlugins: [lazyImages] }),
    shikiConfig: {
      themes: { light: lightTheme, dark: darkTheme },
      defaultColor: false,
      wrap: false,
    },
  },
});
