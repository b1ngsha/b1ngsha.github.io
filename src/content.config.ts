import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 文章。文件名就是网址里的 slug：posts/<系列>/<slug>.md → /posts/<slug>/ */
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
      /** 系列：最多一个，必须是 series.yml 里登记过的 */
      series: reference('series').optional(),
      /** 在系列里的序号，系列内按它排序 */
      part: z.number().int().positive().optional(),
      /** 标签：小写英文、数字、连字符 */
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/, '标签只能是小写英文、数字和连字符')).default([]),
      /** 不写就取 <!-- more --> 之前的文字 */
      summary: z.string().optional(),
      draft: z.boolean().default(false),
      /** 首页置顶 */
      featured: z.boolean().default(false),
    })
    .refine((d) => !d.series || d.part !== undefined, { message: '属于系列的文章必须写 part（序号）', path: ['part'] }),
});

/** 系列登记表 */
const series = defineCollection({
  loader: file('./src/content/series.yml'),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

/** 近况：一天一个文件，首页显示最新一条 */
const now = defineCollection({
  loader: glob({ base: './src/content/now', pattern: '*.md' }),
  schema: z.object({
    date: z.coerce.date(),
    /** 首页大字引文，可以换行（用 \n） */
    quote: z.string().optional(),
    /** 引文里要用红笔划线的那一段 */
    mark: z.string().optional(),
    /** 接下来想做的事 */
    plans: z.array(z.string()).default([]),
    plansTitle: z.string().optional(),
  }),
});

/** 年谱：每条是「时间、标题、一句话」 */
const timeline = defineCollection({
  loader: file('./src/content/timeline.yml'),
  schema: z.object({
    /** 排序用，小的在前；每条之间留空档，方便以后插队 */
    order: z.number(),
    /** 页面上显示的时间，可以只写年份 */
    when: z.string(),
    title: z.string(),
    text: z.string(),
    /** 最后一条「下一卷」画成红色 */
    next: z.boolean().default(false),
  }),
});

export const collections = { posts, series, now, timeline };
