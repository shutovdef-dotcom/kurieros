#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIST_DIR = 'dist';

/**
 * @typedef {Readonly<{
 *   totalBytes?: number,
 *   topLevelBytes?: Record<string, number>,
 *   html?: Record<string, number>,
 * }>} SizeBudget
 */

/** @type {SizeBudget} */
export const DEFAULT_BUDGET = Object.freeze({
  totalBytes: 1_150_000_000,
  topLevelBytes: {
    v: 780 * 1024 * 1024,
    api: 220 * 1024 * 1024,
    'api/grid-batch': 160 * 1024 * 1024,
    'vacancy-translations': 16 * 1024 * 1024,
  },
  html: {
    executableInlineScriptBytes: 2 * 1024 * 1024,
    inlineJsonBytes: 8 * 1024 * 1024,
    jsonLdBytes: 80 * 1024 * 1024,
    inlineStyleBytes: 1 * 1024 * 1024,
  },
});

const emptyGroup = () => ({
  count: 0,
  bytes: 0,
  minBytes: 0,
  maxBytes: 0,
});

const updateGroup = (group, bytes) => {
  group.count += 1;
  group.bytes += bytes;
  group.minBytes = group.count === 1 ? bytes : Math.min(group.minBytes, bytes);
  group.maxBytes = Math.max(group.maxBytes, bytes);
};

const normalizeRelPath = (path) => path.split(sep).join('/');

const addBytes = (target, key, bytes) => {
  target[key] = (target[key] || 0) + bytes;
};

const getTopLevelKey = (relPath) => relPath.split('/')[0] || relPath;

const getNestedPrefixBytes = (files, prefix) =>
  files
    .filter((file) => file.relPath === prefix || file.relPath.startsWith(`${prefix}/`))
    .reduce((sum, file) => sum + file.bytes, 0);

const hashText = (text) =>
  createHash('sha1').update(text).digest('hex');

const parseScriptType = (attrs) => {
  const match = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
  return match?.[1]?.toLowerCase() || '';
};

const hasSrcAttribute = (attrs) => /\bsrc\s*=/i.test(attrs);

const isExecutableScriptType = (type) =>
  type === ''
  || type === 'module'
  || type === 'text/javascript'
  || type === 'application/javascript'
  || type === 'text/ecmascript'
  || type === 'application/ecmascript';

const isInlineJsonType = (type) => type === 'application/json';
const isJsonLdType = (type) => type === 'application/ld+json';

const getInlineStyleBytes = (html) =>
  Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .reduce((sum, match) => sum + Buffer.byteLength(match[1]), 0);

const analyzeInlineScripts = (html, relPath, scriptHashes) => {
  let executableInlineScriptBytes = 0;
  let inlineJsonBytes = 0;
  let jsonLdBytes = 0;
  let otherInlineScriptBytes = 0;

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] || '';
    if (hasSrcAttribute(attrs)) continue;

    const body = match[2] || '';
    const bytes = Buffer.byteLength(body);
    const type = parseScriptType(attrs);

    if (isJsonLdType(type)) {
      jsonLdBytes += bytes;
    } else if (isInlineJsonType(type)) {
      inlineJsonBytes += bytes;
    } else if (isExecutableScriptType(type)) {
      executableInlineScriptBytes += bytes;
      const hash = hashText(body);
      const current = scriptHashes.get(hash) || {
        bytes,
        count: 0,
        examples: [],
        preview: body.replace(/\s+/g, ' ').trim().slice(0, 180),
      };
      current.count += 1;
      if (current.examples.length < 3) current.examples.push(relPath);
      scriptHashes.set(hash, current);
    } else {
      otherInlineScriptBytes += bytes;
    }
  }

  return {
    executableInlineScriptBytes,
    inlineJsonBytes,
    jsonLdBytes,
    otherInlineScriptBytes,
  };
};

const walkFiles = (root) => {
  const files = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = normalizeRelPath(relative(root, fullPath));
        files.push({
          fullPath,
          relPath,
          bytes: statSync(fullPath).size,
        });
      }
    }
  };

  walk(root);
  return files;
};

export function auditDist(distDir = DEFAULT_DIST_DIR) {
  if (!existsSync(distDir)) {
    throw new Error(`dist directory not found: ${distDir}`);
  }

  const files = walkFiles(distDir);
  /** @type {Record<string, number>} */
  const topLevel = {};
  /** @type {Record<string, number>} */
  const byExtension = {};
  const groups = {
    vacancyPages: emptyGroup(),
    apiGridBatch: emptyGroup(),
    apiGrid: emptyGroup(),
    apiCompanyVacancies: emptyGroup(),
    listingPages: emptyGroup(),
    vacancyTranslations: emptyGroup(),
  };
  const html = {
    count: 0,
    bytes: 0,
    executableInlineScriptBytes: 0,
    inlineJsonBytes: 0,
    jsonLdBytes: 0,
    otherInlineScriptBytes: 0,
    inlineStyleBytes: 0,
  };
  const scriptHashes = new Map();
  const largestFiles = [];

  for (const file of files) {
    addBytes(topLevel, getTopLevelKey(file.relPath), file.bytes);
    addBytes(byExtension, extname(file.relPath) || '(none)', file.bytes);
    largestFiles.push({ path: file.relPath, bytes: file.bytes });

    if (file.relPath.startsWith('vacancy-translations/')) {
      updateGroup(groups.vacancyTranslations, file.bytes);
    }

    if (!file.relPath.endsWith('.html')) continue;

    const content = readFileSync(file.fullPath, 'utf8');
    html.count += 1;
    html.bytes += file.bytes;
    html.inlineStyleBytes += getInlineStyleBytes(content);

    const inlineScripts = analyzeInlineScripts(content, file.relPath, scriptHashes);
    html.executableInlineScriptBytes += inlineScripts.executableInlineScriptBytes;
    html.inlineJsonBytes += inlineScripts.inlineJsonBytes;
    html.jsonLdBytes += inlineScripts.jsonLdBytes;
    html.otherInlineScriptBytes += inlineScripts.otherInlineScriptBytes;

    if (file.relPath.startsWith('v/')) {
      updateGroup(groups.vacancyPages, file.bytes);
    }
    if (file.relPath.startsWith('api/grid-batch/')) {
      updateGroup(groups.apiGridBatch, file.bytes);
    }
    if (file.relPath.startsWith('api/grid/')) {
      updateGroup(groups.apiGrid, file.bytes);
    }
    if (file.relPath.startsWith('api/company-vacancies/')) {
      updateGroup(groups.apiCompanyVacancies, file.bytes);
    }
    if (/^rabota-kurerom-[^/]+\/index\.html$/.test(file.relPath)) {
      updateGroup(groups.listingPages, file.bytes);
    }
  }

  const repeatedInlineBlocks = Array.from(scriptHashes.entries())
    .map(([hash, block]) => ({
      hash,
      ...block,
      totalBytes: block.bytes * block.count,
      duplicateWasteBytes: block.bytes * Math.max(0, block.count - 1),
    }))
    .filter((block) => block.count > 1)
    .sort((a, b) => b.duplicateWasteBytes - a.duplicateWasteBytes);

  return {
    root: distDir,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    topLevel: {
      ...topLevel,
      'api/grid-batch': getNestedPrefixBytes(files, 'api/grid-batch'),
      'api/grid': getNestedPrefixBytes(files, 'api/grid'),
      'api/company-vacancies': getNestedPrefixBytes(files, 'api/company-vacancies'),
    },
    byExtension,
    html,
    groups,
    largestFiles: largestFiles
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20),
    inlineExecutableDuplicates: {
      repeatedBlockCount: repeatedInlineBlocks.length,
      repeatedBytes: repeatedInlineBlocks.reduce((sum, block) => sum + block.totalBytes, 0),
      duplicateWasteBytes: repeatedInlineBlocks.reduce((sum, block) => sum + block.duplicateWasteBytes, 0),
      largest: repeatedInlineBlocks.slice(0, 20),
    },
  };
}

const getPath = (object, path) =>
  path.split('.').reduce((value, key) => value?.[key], object);

const pushBudgetFailure = (failures, path, actual, budget) => {
  if (typeof budget !== 'number') return;
  if (actual > budget) {
    failures.push({ path, actual, budget });
  }
};

/**
 * @param {ReturnType<typeof auditDist>} report
 * @param {SizeBudget} [budget]
 */
export function checkBudgets(report, budget = DEFAULT_BUDGET) {
  const failures = [];

  pushBudgetFailure(failures, 'totalBytes', report.totalBytes, budget.totalBytes);

  for (const [key, bytes] of Object.entries(budget.topLevelBytes || {})) {
    pushBudgetFailure(failures, `topLevel.${key}`, report.topLevel[key] || 0, bytes);
  }

  for (const [key, bytes] of Object.entries(budget.html || {})) {
    pushBudgetFailure(failures, `html.${key}`, getPath(report, `html.${key}`) || 0, bytes);
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const formatGroup = (group) => ({
  count: group.count,
  bytes: formatBytes(group.bytes),
  avg: group.count > 0 ? formatBytes(Math.round(group.bytes / group.count)) : '0 B',
  min: formatBytes(group.minBytes),
  max: formatBytes(group.maxBytes),
});

export function toPrintableSummary(report) {
  return {
    root: report.root,
    files: report.fileCount,
    total: formatBytes(report.totalBytes),
    topLevel: Object.fromEntries(
      Object.entries(report.topLevel)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14)
        .map(([key, bytes]) => [key, formatBytes(bytes)]),
    ),
    html: {
      count: report.html.count,
      bytes: formatBytes(report.html.bytes),
      executableInlineScriptBytes: formatBytes(report.html.executableInlineScriptBytes),
      inlineJsonBytes: formatBytes(report.html.inlineJsonBytes),
      jsonLdBytes: formatBytes(report.html.jsonLdBytes),
      inlineStyleBytes: formatBytes(report.html.inlineStyleBytes),
    },
    groups: Object.fromEntries(
      Object.entries(report.groups).map(([key, group]) => [key, formatGroup(group)]),
    ),
    inlineExecutableDuplicates: {
      repeatedBlockCount: report.inlineExecutableDuplicates.repeatedBlockCount,
      repeatedBytes: formatBytes(report.inlineExecutableDuplicates.repeatedBytes),
      duplicateWasteBytes: formatBytes(report.inlineExecutableDuplicates.duplicateWasteBytes),
      largest: report.inlineExecutableDuplicates.largest.slice(0, 8).map((block) => ({
        count: block.count,
        bytes: formatBytes(block.bytes),
        duplicateWasteBytes: formatBytes(block.duplicateWasteBytes),
        examples: block.examples,
        preview: block.preview,
      })),
    },
    largestFiles: report.largestFiles.slice(0, 12).map((file) => ({
      path: file.path,
      bytes: formatBytes(file.bytes),
    })),
  };
}

function parseCliArgs(argv) {
  const args = {
    check: false,
    json: false,
    root: DEFAULT_DIST_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      args.check = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--root') {
      args.root = argv[index + 1] || DEFAULT_DIST_DIR;
      index += 1;
    } else if (!arg.startsWith('--')) {
      args.root = arg;
    }
  }

  return args;
}

function printBudgetFailures(failures) {
  for (const failure of failures) {
    console.error(
      `✗ ${failure.path}: ${formatBytes(failure.actual)} exceeds budget ${formatBytes(failure.budget)}`,
    );
  }
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const report = auditDist(args.root);
  const budgetResult = checkBudgets(report);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(JSON.stringify(toPrintableSummary(report), null, 2));
  }

  if (args.check && !budgetResult.ok) {
    printBudgetFailures(budgetResult.failures);
    process.exitCode = 1;
  }
}

const thisFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';

if (thisFile === invokedFile) {
  main();
}
