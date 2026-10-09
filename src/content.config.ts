import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: z
    .object({
      title: z.string().min(1),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      series: reference('series').optional(),
      part: z.number().int().positive().optional(),
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/, '标签只能是小写英文、数字和连字符')).default([]),
      summary: z.string().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
    })
    .refine((d) => !d.series || d.part !== undefined, { message: '属于系列的文章必须写 part（序号）', path: ['part'] }),
});

const series = defineCollection({
  loader: file('./src/content/series.yml'),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

const now = defineCollection({
  loader: glob({ base: './src/content/now', pattern: '*.md' }),
  schema: z.object({
    date: z.coerce.date(),
    quote: z.string().optional(),
    mark: z.string().optional(),
    plans: z.array(z.string()).default([]),
    plansTitle: z.string().optional(),
  }),
});

const timeline = defineCollection({
  loader: file('./src/content/timeline.yml'),
  schema: z.object({
    order: z.number(),
    when: z.string(),
    title: z.string(),
    text: z.string(),
    next: z.boolean().default(false),
  }),
});

export const collections = { posts, series, now, timeline };
