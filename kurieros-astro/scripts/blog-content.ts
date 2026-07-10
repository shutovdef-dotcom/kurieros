import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { parseBlogContentDocument, type BlogContentDocument } from '../src/utils/blogContent';

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  }));
  return nested.flat().sort((left, right) => left.localeCompare(right, 'en'));
};

/** Loads raw Markdown directly, so release CI does not depend on Vite internals. */
export const loadBlogContentDocuments = async (contentDirectory: string): Promise<BlogContentDocument[]> => {
  const files = await collectMarkdownFiles(contentDirectory);
  return Promise.all(files.map(async (file) => {
    const relativePath = relative(contentDirectory, file).replace(/\.md$/, '');
    const slug = relativePath.split(sep).join('/');
    return parseBlogContentDocument(slug, await readFile(file, 'utf8'));
  }));
};
