#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_ROUTES = [
  '/',
  '/rabota-kurerom-moskva/',
  '/v/yandex-eda-courier-moskva-foot/',
  '/companies/tetrika/',
];

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const args = {
    prodBase: process.env.PERF_PROD_BASE || 'https://kurerok.ru',
    localBase: process.env.PERF_LOCAL_BASE || 'http://127.0.0.1:4323',
    routes: splitList(process.env.PERF_ROUTES).length > 0
      ? splitList(process.env.PERF_ROUTES)
      : DEFAULT_ROUTES,
    samples: parseNumber(process.env.PERF_SAMPLES, 5),
    warmup: parseNumber(process.env.PERF_WARMUP, 1),
    outDir: process.env.PERF_OUT || `output/perf/host-speed-${runId}`,
    timewebTtfbMs: parseNumber(process.env.TIMEWEB_TTFB_MS, 180),
    timewebBandwidthMbps: parseNumber(process.env.TIMEWEB_BANDWIDTH_MBPS, 50),
    timewebCompressionRatio: parseNumber(process.env.TIMEWEB_COMPRESSION_RATIO, 0.28),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--prod') {
      args.prodBase = next || '';
      index += 1;
    } else if (arg === '--local') {
      args.localBase = next || '';
      index += 1;
    } else if (arg === '--routes') {
      args.routes = splitList(next);
      index += 1;
    } else if (arg === '--samples') {
      args.samples = parseNumber(next, args.samples);
      index += 1;
    } else if (arg === '--warmup') {
      args.warmup = parseNumber(next, args.warmup);
      index += 1;
    } else if (arg === '--out') {
      args.outDir = next || args.outDir;
      index += 1;
    } else if (arg === '--timeweb-ttfb-ms') {
      args.timewebTtfbMs = parseNumber(next, args.timewebTtfbMs);
      index += 1;
    } else if (arg === '--timeweb-bandwidth-mbps') {
      args.timewebBandwidthMbps = parseNumber(next, args.timewebBandwidthMbps);
      index += 1;
    } else if (arg === '--timeweb-compression-ratio') {
      args.timewebCompressionRatio = parseNumber(next, args.timewebCompressionRatio);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  if (args.routes.length === 0) {
    args.routes = DEFAULT_ROUTES;
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/perf/compare-host-speed.mjs [options]

Options:
  --prod <url>                     Production base URL (default: https://kurerok.ru)
  --local <url>                    Local base URL (default: http://127.0.0.1:4323)
  --routes "/ /path/"              Space or comma separated routes
  --samples <n>                    Measured samples per route (default: 5)
  --warmup <n>                     Warmup requests per route (default: 1)
  --out <dir>                      Report output directory
  --timeweb-ttfb-ms <n>            Modeled Timeweb TTFB, not measured (default: 180)
  --timeweb-bandwidth-mbps <n>     Modeled Timeweb bandwidth (default: 50)
  --timeweb-compression-ratio <n>  Modeled transfer/html ratio (default: 0.28)

Environment aliases:
  PERF_PROD_BASE, PERF_LOCAL_BASE, PERF_ROUTES, PERF_SAMPLES, PERF_WARMUP,
  PERF_OUT, TIMEWEB_TTFB_MS, TIMEWEB_BANDWIDTH_MBPS, TIMEWEB_COMPRESSION_RATIO
`);
}

function joinUrl(base, route) {
  if (/^https?:\/\//i.test(route)) return route;
  return new URL(route, `${base.replace(/\/+$/, '')}/`).toString();
}

function routeToDistHtml(route) {
  const path = route.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0] || '/';
  if (path === '/') return join('dist', 'index.html');
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (clean.endsWith('.html')) return join('dist', clean);
  return join('dist', clean, 'index.html');
}

async function curlJson(url) {
  try {
    const { stdout } = await execFileAsync(
      'curl',
      ['-L', '--compressed', '-sS', '-o', '/dev/null', '-w', '%{json}', url],
      { timeout: 45_000, maxBuffer: 1024 * 1024 },
    );
    const metrics = JSON.parse(stdout);
    const status = Number(metrics.http_code || metrics.response_code || 0);
    return {
      ok: status >= 200 && status < 400,
      status,
      remoteIp: metrics.remote_ip || '',
      httpVersion: metrics.http_version || '',
      contentType: metrics.content_type || '',
      sizeDownload: Number(metrics.size_download || 0),
      speedDownload: Number(metrics.speed_download || 0),
      dnsMs: Number(metrics.time_namelookup || 0) * 1000,
      connectMs: Number(metrics.time_connect || 0) * 1000,
      tlsMs: Number(metrics.time_appconnect || 0) * 1000,
      ttfbMs: Number(metrics.time_starttransfer || 0) * 1000,
      totalMs: Number(metrics.time_total || 0) * 1000,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function median(values) {
  return percentile(values, 0.5);
}

function summarizeSamples(samples) {
  const okSamples = samples.filter((sample) => sample.ok);
  if (okSamples.length === 0) {
    return {
      ok: false,
      okSamples: 0,
      totalSamples: samples.length,
      errors: samples.map((sample) => sample.error || `HTTP ${sample.status}`).filter(Boolean),
    };
  }

  return {
    ok: true,
    okSamples: okSamples.length,
    totalSamples: samples.length,
    status: median(okSamples.map((sample) => sample.status)),
    medianDnsMs: median(okSamples.map((sample) => sample.dnsMs)),
    medianConnectMs: median(okSamples.map((sample) => sample.connectMs)),
    medianTlsMs: median(okSamples.map((sample) => sample.tlsMs)),
    medianTtfbMs: median(okSamples.map((sample) => sample.ttfbMs)),
    medianTotalMs: median(okSamples.map((sample) => sample.totalMs)),
    p95TotalMs: percentile(okSamples.map((sample) => sample.totalMs), 0.95),
    medianSizeDownload: median(okSamples.map((sample) => sample.sizeDownload)),
    medianSpeedDownload: median(okSamples.map((sample) => sample.speedDownload)),
    remoteIps: Array.from(new Set(okSamples.map((sample) => sample.remoteIp).filter(Boolean))),
    httpVersions: Array.from(new Set(okSamples.map((sample) => sample.httpVersion).filter(Boolean))),
    contentTypes: Array.from(new Set(okSamples.map((sample) => sample.contentType).filter(Boolean))),
  };
}

async function measureRoute(target, route, samples, warmup) {
  const url = joinUrl(target.base, route);
  for (let index = 0; index < warmup; index += 1) {
    await curlJson(url);
  }

  const measured = [];
  for (let index = 0; index < samples; index += 1) {
    measured.push(await curlJson(url));
  }

  return {
    target: target.name,
    base: target.base,
    route,
    url,
    samples: measured,
    summary: summarizeSamples(measured),
  };
}

function estimateTimeweb(route, localSummary, args) {
  const distPath = routeToDistHtml(route);
  const absoluteDistPath = resolve(distPath);
  const htmlBytes = existsSync(absoluteDistPath)
    ? statSync(absoluteDistPath).size
    : Number(localSummary?.medianSizeDownload || 0);
  const estimatedTransferBytes = Math.round(htmlBytes * args.timewebCompressionRatio);
  const transferMs = args.timewebBandwidthMbps > 0
    ? (estimatedTransferBytes * 8) / (args.timewebBandwidthMbps * 1_000_000) * 1000
    : 0;

  return {
    target: 'timeweb-estimate',
    route,
    measured: false,
    assumptions: {
      ttfbMs: args.timewebTtfbMs,
      bandwidthMbps: args.timewebBandwidthMbps,
      compressionRatio: args.timewebCompressionRatio,
      sourceBytes: existsSync(absoluteDistPath) ? 'dist html file' : 'local curl median',
    },
    summary: {
      ok: true,
      medianTtfbMs: args.timewebTtfbMs,
      medianTotalMs: args.timewebTtfbMs + transferMs,
      p95TotalMs: args.timewebTtfbMs * 1.4 + transferMs,
      medianSizeDownload: estimatedTransferBytes,
      htmlBytes,
    },
  };
}

function formatMs(value) {
  if (value == null) return '-';
  return `${Math.round(value)} ms`;
}

function formatBytes(bytes) {
  if (bytes == null) return '-';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

function markdownRow(row) {
  const summary = row.summary || {};
  const notes = row.target === 'timeweb-estimate'
    ? `modeled: TTFB ${row.assumptions.ttfbMs} ms, ${row.assumptions.bandwidthMbps} Mbps, ratio ${row.assumptions.compressionRatio}`
    : [
      summary.remoteIps?.length ? `IP ${summary.remoteIps.join(', ')}` : '',
      summary.httpVersions?.length ? `HTTP ${summary.httpVersions.join(', ')}` : '',
      summary.ok ? '' : (summary.errors || []).slice(0, 2).join('; '),
    ].filter(Boolean).join('; ');

  return [
    row.route,
    row.target,
    summary.ok ? (row.target === 'timeweb-estimate' ? 'estimate' : 'ok') : 'fail',
    formatMs(summary.medianTtfbMs),
    formatMs(summary.medianTotalMs),
    formatMs(summary.p95TotalMs),
    formatBytes(summary.medianSizeDownload),
    notes || '-',
  ];
}

function toMarkdown(report) {
  const lines = [
    '# Host Speed Comparison',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Samples: ${report.config.samples}, warmup: ${report.config.warmup}`,
    `- Timeweb estimate is modeled, not measured.`,
    '',
    '| Route | Target | Status | Median TTFB | Median total | P95 total | Transfer | Notes |',
    '|---|---|---:|---:|---:|---:|---:|---|',
  ];

  for (const row of report.rows) {
    lines.push(`| ${markdownRow(row).join(' | ')} |`);
  }

  lines.push(
    '',
    'Timeweb model variables can be changed with `TIMEWEB_TTFB_MS`, `TIMEWEB_BANDWIDTH_MBPS`, and `TIMEWEB_COMPRESSION_RATIO`.',
  );
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const targets = [
    args.prodBase ? { name: 'prod', base: args.prodBase } : null,
    args.localBase ? { name: 'local', base: args.localBase } : null,
  ].filter(Boolean);

  const rows = [];
  for (const route of args.routes) {
    const localRowByRoute = {};
    for (const target of targets) {
      const row = await measureRoute(target, route, args.samples, args.warmup);
      rows.push(row);
      if (target.name === 'local') {
        localRowByRoute[route] = row;
      }
    }

    const localSummary = localRowByRoute[route]?.summary;
    rows.push(estimateTimeweb(route, localSummary, args));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      prodBase: args.prodBase,
      localBase: args.localBase,
      routes: args.routes,
      samples: args.samples,
      warmup: args.warmup,
      timewebTtfbMs: args.timewebTtfbMs,
      timewebBandwidthMbps: args.timewebBandwidthMbps,
      timewebCompressionRatio: args.timewebCompressionRatio,
    },
    rows,
  };

  mkdirSync(args.outDir, { recursive: true });
  writeFileSync(join(args.outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(args.outDir, 'report.md'), toMarkdown(report));
  console.log(toMarkdown(report));
  console.log(`Wrote ${args.outDir}/report.json`);
  console.log(`Wrote ${args.outDir}/report.md`);

  const failedLocalRows = rows.filter((row) =>
    row.target === 'local' && !row.summary?.ok);
  if (failedLocalRows.length > 0) {
    process.exitCode = 1;
  }
}

await main();
