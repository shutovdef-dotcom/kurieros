#!/usr/bin/env tsx
import { rm, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SitemapEntry = {
  url: string;
  pathname: string;
  lastmod?: string;
  changefreq: string;
  priority: number;
};

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(rootDir, process.env.DIST_DIR ?? 'dist');
const siteUrl = (process.env.SITE_URL ?? 'https://kurerok.ru').replace(/\/+$/, '');
const sitemapFreshnessPath = resolve(rootDir, 'src/generated/sitemap-freshness.json');
const entryLimit = Number(process.env.SITEMAP_ENTRY_LIMIT ?? 1000);

const exactHubPaths = new Set([
  '/rabota-peshim-kurerom/',
  '/rabota-avtokurerom/',
  '/rabota-velokurerom/',
  '/podrabotka-kurerom/',
]);
const exactGuidePaths = new Set([
  '/skolko-zarabatyvaet-kurer/',
  '/kak-stat-kurerom/',
  '/usloviya-raboty-kurerom/',
]);

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const walk = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
};

const normalizeFilePath = (value: string): string => value.replaceAll('\\', '/');

const routePathFromHtmlFile = (filePath: string): string => {
  const normalized = normalizeFilePath(relative(distDir, filePath));
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    return `/${normalized.slice(0, -'index.html'.length)}`;
  }
  return `/${normalized}`;
};

const getAttribute = (tag: string, name: string): string | undefined => {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  if (quoted) return quoted[2];
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1];
};

const getCanonicalUrl = (html: string): string | undefined => {
  const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => (getAttribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'))
    .map((tag) => getAttribute(tag, 'href'))
    .filter((href): href is string => Boolean(href));
  return canonicals.length === 1 ? new URL(canonicals[0]!, `${siteUrl}/`).toString() : undefined;
};

const isIndexableHtml = (html: string): boolean => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if ((getAttribute(tag, 'name') ?? '').toLowerCase() !== 'robots') continue;
    return !/\bnoindex\b/i.test(getAttribute(tag, 'content') ?? '');
  }
  return true;
};

const readFreshnessEntries = async (): Promise<Record<string, string>> => {
  try {
    const payload = JSON.parse(await readFile(sitemapFreshnessPath, 'utf8')) as {
      entries?: Record<string, string>;
    };
    return payload.entries ?? {};
  } catch {
    return {};
  }
};

const priorityForPath = (pathname: string): { priority: number; changefreq: string } => {
  if (exactHubPaths.has(pathname)) return { priority: 0.8, changefreq: 'daily' };
  if (exactGuidePaths.has(pathname)) return { priority: 0.7, changefreq: 'weekly' };
  if (pathname === '/otzyvy/') return { priority: 0.6, changefreq: 'weekly' };
  if (pathname === '/') return { priority: 1.0, changefreq: 'daily' };
  if (pathname.startsWith('/v/')) return { priority: 0.8, changefreq: 'daily' };
  if (pathname.startsWith('/rabota-kurerom-')) return { priority: 0.7, changefreq: 'daily' };
  if (pathname.startsWith('/companies/')) return { priority: 0.6, changefreq: 'weekly' };
  if (pathname.startsWith('/guide/')) return { priority: 0.6, changefreq: 'weekly' };
  if (pathname === '/blog/' || pathname.startsWith('/blog/')) {
    return { priority: 0.5, changefreq: 'weekly' };
  }
  if (
    pathname.startsWith('/cities/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/calculator/')
  ) {
    return { priority: 0.5, changefreq: 'weekly' };
  }
  return { priority: 0.3, changefreq: 'monthly' };
};

const groupForPath = (pathname: string): string => {
  if (pathname.startsWith('/v/')) return 'vacancies';
  if (pathname.startsWith('/rabota-kurerom-')) return 'listings';
  if (exactHubPaths.has(pathname)) return 'hubs';
  if (pathname.startsWith('/companies/')) return 'companies';
  if (pathname.startsWith('/metro/')) return 'metro';
  if (
    pathname.startsWith('/guide/') ||
    exactGuidePaths.has(pathname) ||
    pathname === '/otzyvy/'
  ) {
    return 'guides';
  }
  if (pathname === '/blog/' || pathname.startsWith('/blog/')) return 'blog';
  return 'pages';
};

const isServicePath = (pathname: string): boolean =>
  pathname.startsWith('/api/') ||
  pathname.startsWith('/admin/') ||
  pathname.startsWith('/apply/') ||
  pathname.startsWith('/designs/') ||
  pathname.startsWith('/owner/');

const buildSitemapEntries = async (): Promise<SitemapEntry[]> => {
  const freshnessEntries = await readFreshnessEntries();
  const htmlFiles = (await walk(distDir)).filter((path) => path.endsWith('.html'));
  const entries: SitemapEntry[] = [];
  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    if (!/<html\b/i.test(html) && !/<!doctype\s+html/i.test(html)) continue;
    const pathname = routePathFromHtmlFile(htmlFile);
    if (isServicePath(pathname)) continue;
    const url = new URL(pathname, `${siteUrl}/`).toString();
    const canonicalUrl = getCanonicalUrl(html);
    if (!canonicalUrl || canonicalUrl !== url || !isIndexableHtml(html)) continue;
    const priority = priorityForPath(pathname);
    entries.push({
      url,
      pathname,
      lastmod: freshnessEntries[pathname],
      ...priority,
    });
  }
  return entries.sort((a, b) => a.url.localeCompare(b.url));
};

const renderUrlset = (entries: readonly SitemapEntry[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => [
      '  <url>',
      `    <loc>${escapeXml(entry.url)}</loc>`,
      entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
      `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`,
      `    <priority>${entry.priority.toFixed(1)}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')),
    '</urlset>',
    '',
  ].join('\n');

const renderSitemapIndex = (sitemapUrls: readonly string[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map((url) => [
      '  <sitemap>',
      `    <loc>${escapeXml(url)}</loc>`,
      '  </sitemap>',
    ].join('\n')),
    '</sitemapindex>',
    '',
  ].join('\n');

const removeExistingSitemaps = async (): Promise<void> => {
  const files = await readdir(distDir);
  await Promise.all(
    files
      .filter((file) => /^sitemap.*\.xml$/i.test(file))
      .map((file) => rm(resolve(distDir, file), { force: true })),
  );
};

const groupOrder = [
  'vacancies',
  'listings',
  'hubs',
  'companies',
  'metro',
  'guides',
  'blog',
  'pages',
];

const entries = await buildSitemapEntries();
const grouped = new Map<string, SitemapEntry[]>();
for (const entry of entries) {
  const group = groupForPath(entry.pathname);
  grouped.set(group, [...(grouped.get(group) ?? []), entry]);
}

await removeExistingSitemaps();
await mkdir(distDir, { recursive: true });

const sitemapUrls: string[] = [];
const written: Record<string, number> = {};
for (const group of groupOrder) {
  const groupEntries = grouped.get(group) ?? [];
  if (groupEntries.length === 0) continue;
  written[group] = groupEntries.length;
  for (let index = 0; index < groupEntries.length; index += entryLimit) {
    const chunk = groupEntries.slice(index, index + entryLimit);
    const chunkIndex = Math.floor(index / entryLimit);
    const fileName = `sitemap-${group}-${chunkIndex}.xml`;
    await writeFile(resolve(distDir, fileName), renderUrlset(chunk), 'utf8');
    sitemapUrls.push(new URL(`/${fileName}`, `${siteUrl}/`).toString());
  }
}

await writeFile(
  resolve(distDir, 'sitemap-index.xml'),
  renderSitemapIndex(sitemapUrls),
  'utf8',
);

console.log(JSON.stringify({
  sitemapIndex: 'dist/sitemap-index.xml',
  sitemapFiles: sitemapUrls.length,
  urls: entries.length,
  groups: written,
}, null, 2));
