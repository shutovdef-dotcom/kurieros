import type { BlogContentDocument } from './blogContent';
import type { BlogReleaseLedger } from './blogRelease';

export type ReleasedBlogContentIntegrityIssue = {
  slug: string;
  code: 'missing_released_document' | 'released_content_hash_mismatch';
  detail: string;
};

export type ReleasedBlogContentIntegrity = {
  ok: boolean;
  issues: ReleasedBlogContentIntegrityIssue[];
};

/**
 * A published article is immutable until a new, explicitly recorded revision
 * is released. This prevents a normal Markdown edit from silently changing a
 * URL that still advertises its old publication date and source evidence.
 */
export const validateReleasedBlogContentIntegrity = (
  ledger: Pick<BlogReleaseLedger, 'releases'>,
  documents: readonly BlogContentDocument[],
): ReleasedBlogContentIntegrity => {
  const documentsBySlug = new Map(documents.map((document) => [document.slug, document]));
  const issues: ReleasedBlogContentIntegrityIssue[] = [];

  for (const release of ledger.releases) {
    const document = documentsBySlug.get(release.slug);
    if (!document) {
      issues.push({
        slug: release.slug,
        code: 'missing_released_document',
        detail: 'ledger release has no Markdown document',
      });
      continue;
    }
    if (document.contentSha256 !== release.contentSha256) {
      issues.push({
        slug: release.slug,
        code: 'released_content_hash_mismatch',
        detail: 'ledger content SHA-256 does not match the current Markdown file',
      });
    }
  }

  return { ok: issues.length === 0, issues };
};

export const assertReleasedBlogContentIntegrity = (
  ledger: Pick<BlogReleaseLedger, 'releases'>,
  documents: readonly BlogContentDocument[],
): void => {
  const integrity = validateReleasedBlogContentIntegrity(ledger, documents);
  if (!integrity.ok) {
    throw new Error(
      `Published blog Markdown integrity failed: ${integrity.issues
        .map((issue) => `${issue.slug}:${issue.code}`)
        .join(', ')}`,
    );
  }
};
