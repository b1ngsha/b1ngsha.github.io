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

/** 工作经历：每条是一家公司（或部门）。logo 是 src/assets/logos/ 里的文件名，可以留空 */
const experience = defineCollection({
  loader: file('./src/content/experience.yml'),
  schema: z.object({
    /** 排序用，小的在前（从早到晚）；中间留空档方便插队 */
    order: z.number(),
    company: z.string(),
    logo: z.string().default(''),
    team: z.string().default(''),
    teamLogo: z.string().default(''),
    role: z.string().default(''),
    period: z.string().default(''),
    points: z.array(z.string()).default([]),
  }),
});

export const collections = { posts, series, experience };
