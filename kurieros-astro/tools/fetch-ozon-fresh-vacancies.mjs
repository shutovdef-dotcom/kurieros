#!/usr/bin/env node
// Discovers full (vacancy → city → hire-object) matrix from
// recruitment.ozon.ru/fresh-referral-office. Output is written to
// `src/data/ozon-fresh-vacancies.json`.
//
// Shared HTTP / fail-fast / writer logic lives in `tools/lib/ozon-crawler.mjs`
// — re-used by `fetch-ozon-vacancies.mjs`. Fresh-specific bits here:
// the `{customer, vacancy}` payload (vs `combineCustomerVacancy` for
// sklad) and the `{customer, vacancy, label, cities}` output shape.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crawlVacancyCatalogue, writeOrAbort } from './lib/ozon-crawler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REFERER = 'https://recruitment.ozon.ru/fresh-referral-office';
const CUSTOMER = 'express';

const VACANCIES = [
  { slug: 'courier', label: 'Курьер' },
  { slug: 'operator', label: 'Сборщик заказов' },
  { slug: 'adminPersonal', label: 'Административный персонал' },
  { slug: 'factoryKitchen', label: 'Сотрудник фабрики-кухни' },
];

const result = await crawlVacancyCatalogue({
  referer: REFERER,
  vacancies: VACANCIES,
  buildPayload: (v) => ({ customer: CUSTOMER, vacancy: v.slug }),
  shapeResult: (v, cities) => ({
    customer: CUSTOMER,
    vacancy: v.slug,
    label: v.label,
    cities,
  }),
});

const outPath = path.join(__dirname, '..', 'src', 'data', 'ozon-fresh-vacancies.json');
await writeOrAbort({
  outPath,
  result,
  formatLabel: (v, cityName) => `${CUSTOMER}:${v.slug} → ${cityName}`,
});
