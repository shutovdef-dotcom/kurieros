import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
  }),
  schema: z.object({
    title: z.string().min(20).max(120),
    description: z.string().min(70).max(180),
    author: z.literal('КурьерОк'),
    type: z.enum(['rewrite', 'new', 'research']),
    status: z.enum(['ready', 'blocked']),
    primaryIntent: z.string().min(3),
    pillarHref: z.string().regex(/^\/[\w/-]*\/$/),
    commercialHref: z.string().regex(/^\/[\w/-]*\/$/).optional(),
    sourceIds: z.array(z.string().min(1)).min(1),
    checkedAt: z.string().refine(isIsoDate, 'checkedAt must be YYYY-MM-DD'),
    relatedSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
    researchGate: z.enum(['none', 'internal-dataset', 'interviews']).default('none'),
  }),
});

export const collections = { blog };
