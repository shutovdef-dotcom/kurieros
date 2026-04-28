#!/usr/bin/env node
// Discovers full (vacancy → city → hire-object) matrix from Ozon's
// recruitment.ozon.ru/ref-courier-sklad form by hitting the public
// sigma-bff-api endpoint. Output is written to
// `src/data/ozon-vacancies.json`.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API = 'https://sigma-bff-api.ozon.ru/v1/actions';
const REFERER = 'https://recruitment.ozon.ru/ref-courier-sklad';

const VACANCIES = [
  { slug: 'ff:truckDriver', label: 'Водитель-экспедитор' },
  { slug: 'rocket:courier', label: 'Курьер' },
  { slug: 'ff:operator', label: 'Оператор склада' },
  { slug: 'ff:electricStackerDriver', label: 'Водитель-электроштабелера' },
  { slug: 'ff:brigadier', label: 'Специалист по обработке товаров' },
];

async function callAction(action, inner) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://recruitment.ozon.ru',
      'Referer': REFERER,
    },
    body: JSON.stringify({ action, body: JSON.stringify(inner) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${action} failed: ${res.status} ${text.slice(0, 200)}`);
  const wrap = JSON.parse(text);
  return JSON.parse(wrap.body);
}

async function getCities(slug) {
  const out = await callAction('GetCitiesV2', {
    utm_source: 'referral_campaign',
    fullpath: REFERER,
    combineCustomerVacancy: slug,
  });
  return out.data;
}

async function getHireObjects(slug, cityID) {
  const out = await callAction('GetHireObjectsV2', {
    utm_source: 'referral_campaign',
    fullpath: REFERER,
    combineCustomerVacancy: slug,
    cityID,
  });
  return out.data;
}

const result = [];
for (const { slug, label } of VACANCIES) {
  const cities = await getCities(slug);
  console.error(`[${slug}] ${cities.length} cities`);
  const cityEntries = [];
  for (const city of cities) {
    let hireObjects = [];
    try {
      hireObjects = await getHireObjects(slug, city.value);
    } catch (e) {
      console.error(`  ! ${city.label}: ${e.message}`);
    }
    cityEntries.push({
      cityName: city.label,
      cityID: city.value,
      hireObjects: hireObjects.map((h) => ({ name: h.label, uuid: h.value })),
    });
  }
  result.push({ slug, label, cities: cityEntries });
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'ozon-vacancies.json');
await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
console.error(`\nWrote ${outPath}`);
console.error(`Vacancies: ${result.length}, total cities: ${result.reduce((a, v) => a + v.cities.length, 0)}, total hire objects: ${result.reduce((a, v) => a + v.cities.reduce((b, c) => b + c.hireObjects.length, 0), 0)}`);
