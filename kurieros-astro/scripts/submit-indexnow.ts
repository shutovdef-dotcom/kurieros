#!/usr/bin/env tsx
import { buildSingleUrlIndexNowNotification } from '../src/utils/indexNow';

const url = process.argv.slice(2).find((value) => !value.startsWith('--'));
const key = process.env.INDEXNOW_KEY;
const host = process.env.INDEXNOW_HOST ?? 'kurerok.ru';
if (!url || !key) {
  throw new Error('Usage: INDEXNOW_KEY=… npm run indexnow:submit -- https://kurerok.ru/blog/example/');
}

const notification = buildSingleUrlIndexNowNotification({ url, key, host });
const response = await fetch(notification.endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(notification.payload),
  signal: AbortSignal.timeout(15_000),
});

if (response.status !== 200 && response.status !== 202) {
  throw new Error(`IndexNow rejected the URL with HTTP ${response.status}.`);
}
console.log(`✓ IndexNow accepted one published URL (HTTP ${response.status}).`);
