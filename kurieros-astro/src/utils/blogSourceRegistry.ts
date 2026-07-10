import { z } from 'zod';
import sourceRegistryJson from '../data/blog-source-registry.json';

const HTTPS_URL = z.url().refine((value) => new URL(value).protocol === 'https:', {
  message: 'Source URLs must use HTTPS.',
});

const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  publisher: z.string().min(1),
  url: HTTPS_URL,
  category: z.enum([
    'regulatory',
    'official_careers',
    'official_recruitment',
    'official_terms',
    'partner_primary_data',
  ]),
  verifiedAt: z.iso.date(),
  scope: z.string().min(1),
  allowedClaims: z.array(z.string().min(1)).min(1),
});

const InternalDatasetSchema = z.object({
  id: z.string().regex(/^kurerok-[a-z0-9-]+$/),
  scope: z.string().min(1),
});

const ArticleSourceSchema = z
  .object({
    sequence: z.number().int().positive(),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    sourceIds: z.array(z.string().min(1)).min(1),
    sourceGate: z.literal('required_before_release'),
    requiresInternalDataset: z.boolean(),
    internalDataset: InternalDatasetSchema.optional(),
  })
  .superRefine((article, ctx) => {
    if (article.requiresInternalDataset && !article.internalDataset) {
      ctx.addIssue({
        code: 'custom',
        path: ['internalDataset'],
        message: 'Research briefs need a named internal dataset.',
      });
    }

    if (!article.requiresInternalDataset && article.internalDataset) {
      ctx.addIssue({
        code: 'custom',
        path: ['internalDataset'],
        message: 'Only research briefs may declare an internal dataset.',
      });
    }
  });

export const BlogSourceRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    verifiedAt: z.iso.date(),
    sources: z.array(SourceSchema).min(1),
    articleSources: z.array(ArticleSourceSchema).length(100),
  })
  .superRefine((registry, ctx) => {
    const sourceIds = new Set<string>();

    registry.sources.forEach((source, index) => {
      if (sourceIds.has(source.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources', index, 'id'],
          message: `Duplicate source id: ${source.id}`,
        });
      }
      sourceIds.add(source.id);
    });

    const articleSlugs = new Set<string>();
    const articleSequences = new Set<number>();
    registry.articleSources.forEach((article, index) => {
      if (articleSlugs.has(article.slug)) {
        ctx.addIssue({
          code: 'custom',
          path: ['articleSources', index, 'slug'],
          message: `Duplicate article slug: ${article.slug}`,
        });
      }
      articleSlugs.add(article.slug);

      if (articleSequences.has(article.sequence)) {
        ctx.addIssue({
          code: 'custom',
          path: ['articleSources', index, 'sequence'],
          message: `Duplicate article sequence: ${article.sequence}`,
        });
      }
      articleSequences.add(article.sequence);

      article.sourceIds.forEach((sourceId, sourceIndex) => {
        if (!sourceIds.has(sourceId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['articleSources', index, 'sourceIds', sourceIndex],
            message: `Unknown source id: ${sourceId}`,
          });
        }
      });
    });
  });

/**
 * Source catalogue for future blog releases. It is a research plan, not
 * release evidence: every article must still pass its dated source gate.
 */
export const BLOG_SOURCE_REGISTRY = BlogSourceRegistrySchema.parse(sourceRegistryJson);

export type BlogSourceRegistry = z.infer<typeof BlogSourceRegistrySchema>;
export type BlogPrimarySource = z.infer<typeof SourceSchema>;
export type BlogArticleSource = z.infer<typeof ArticleSourceSchema>;
