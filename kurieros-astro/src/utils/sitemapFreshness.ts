export type SitemapFreshnessSource = {
  id: string;
  /** Date when the rendered content actually changed, never a crawl/check date. */
  contentUpdatedAt: string;
  /** Canonical, trailing-slash paths affected by this content source. */
  paths: readonly string[];
};

export type SitemapFreshnessManifest = {
  schemaVersion: 1;
  entries: Record<string, string>;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const assertContentDate = (source: SitemapFreshnessSource): string => {
  const value = source.contentUpdatedAt;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !DATE_ONLY_PATTERN.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `[sitemap-freshness] ${source.id}.contentUpdatedAt must be a real YYYY-MM-DD date`,
    );
  }
  return value;
};

const assertCanonicalPath = (sourceId: string, path: string): string => {
  const hasCanonicalShape =
    path.startsWith('/') &&
    path.endsWith('/') &&
    !path.includes('?') &&
    !path.includes('#') &&
    !path.slice(1).includes('//');
  if (!hasCanonicalShape) {
    throw new Error(
      `[sitemap-freshness] ${sourceId} contains a non-canonical path: ${path}`,
    );
  }
  return path;
};

export const buildSitemapFreshnessManifest = (
  sources: readonly SitemapFreshnessSource[],
): SitemapFreshnessManifest => {
  const entries = new Map<string, string>();

  for (const source of sources) {
    if (!source.id.trim()) {
      throw new Error('[sitemap-freshness] source id must not be empty');
    }
    const contentUpdatedAt = assertContentDate(source);
    for (const rawPath of source.paths) {
      const path = assertCanonicalPath(source.id, rawPath);
      const existing = entries.get(path);
      if (existing && existing !== contentUpdatedAt) {
        throw new Error(
          `[sitemap-freshness] conflicting content dates for ${path}: ${existing} vs ${contentUpdatedAt}`,
        );
      }
      entries.set(path, contentUpdatedAt);
    }
  }

  return {
    schemaVersion: 1,
    entries: Object.fromEntries(
      [...entries.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')),
    ),
  };
};

export const getSitemapContentUpdatedAt = (
  manifest: SitemapFreshnessManifest,
  pathOrUrl: string | URL,
): string | undefined => {
  const url = pathOrUrl instanceof URL
    ? pathOrUrl
    : new URL(pathOrUrl, 'https://kurerok.ru/');
  return manifest.entries[url.pathname];
};
