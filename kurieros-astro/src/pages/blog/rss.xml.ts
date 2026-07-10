import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { BLOG_RELEASE_MANIFEST } from '../../utils/blogManifest';

export const prerender = true;

const escapeXml = (value: string): string =>
  value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character);

export const GET: APIRoute = async ({ site }) => {
  const entries = await getCollection('blog');
  const entriesBySlug = new Map(entries.map((entry) => [entry.id, entry]));
  const baseUrl = site ?? new URL('https://kurerok.ru');
  const items = BLOG_RELEASE_MANIFEST.releases
    .toReversed()
    .map((release) => {
      const entry = entriesBySlug.get(release.slug);
      if (!entry) {
        throw new Error(`Published blog release ${release.slug} has no Markdown entry for RSS.`);
      }
      const url = new URL(`/blog/${release.slug}/`, baseUrl).toString();
      return `
        <item>
          <title>${escapeXml(entry.data.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(url)}</guid>
          <description>${escapeXml(entry.data.description)}</description>
          <pubDate>${new Date(release.firstPublishedAt).toUTCString()}</pubDate>
        </item>`;
    })
    .join('');
  const latestRelease = BLOG_RELEASE_MANIFEST.releases.at(-1);
  const lastBuildDate = latestRelease
    ? `<lastBuildDate>${new Date(latestRelease.modifiedAt ?? latestRelease.firstPublishedAt).toUTCString()}</lastBuildDate>`
    : '';
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Блог КурьерОк</title>
        <link>${escapeXml(new URL('/blog/', baseUrl).toString())}</link>
        <description>Проверенные разборы работы курьером от КурьерОк.</description>
        <language>ru</language>
        ${lastBuildDate}
        ${items}
      </channel>
    </rss>`;

  return new Response(rss, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  });
};
