#!/usr/bin/env node
// Discovers full (vacancy → city → hire-object) matrix from Ozon's
// recruitment.ozon.ru/ref-courier-sklad form by hitting the public
// sigma-bff-api endpoint. Output is written to
// `src/data/ozon-vacancies.json`.
//
// Shared HTTP / fail-fast / writer logic lives in `tools/lib/ozon-crawler.mjs`
// — re-used by `fetch-ozon-fresh-vacancies.mjs`. Sklad-specific bits
// here: the `combineCustomerVacancy` payload key and the `{slug, label, cities}`
// output shape.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crawlVacancyCatalogue, writeOrAbort } from './lib/ozon-crawler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REFERER = 'https://recruitment.ozon.ru/ref-courier-sklad';

const VACANCIES = [
  { slug: 'ff:truckDriver', label: 'Водитель-экспедитор' },
  { slug: 'rocket:courier', label: 'Курьер' },
  { slug: 'ff:operator', label: 'Оператор склада' },
  { slug: 'ff:electricStackerDriver', label: 'Водитель-электроштабелера' },
  { slug: 'ff:brigadier', label: 'Специалист по обработке товаров' },
];

const result = await crawlVacancyCatalogue({
  referer: REFERER,
  vacancies: VACANCIES,
  buildPayload: (v) => ({ combineCustomerVacancy: v.slug }),
  shapeResult: (v, cities) => ({ slug: v.slug, label: v.label, cities }),
});

const outPath = path.join(__dirname, '..', 'src', 'data', 'ozon-vacancies.json');
await writeOrAbort({
  outPath,
  result,
  formatLabel: (v, cityName) => `${v.slug} → ${cityName}`,
});
