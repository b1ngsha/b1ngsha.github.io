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
  redirects,
  integrations: [
    sitemap({
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
