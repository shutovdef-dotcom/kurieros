/**
 * Aggregator entry-point for the partner vacancy catalogue.
 *
 * This file is intentionally thin: per-partner data and helpers live
 * under `./sources/<partner>.ts` (Yandex Eda, Купер, Т-Банк, Efin,
 * Альфа-Банк, Бургер Кинг). Ozon offers come from `./ozonOffers.ts`,
 * which is a separate generator module driven by the live referral
 * form catalogue. The Ozon hourly-rate post-processor lives in
 * `./sources/ozon-hourly-fallback.ts`.
 *
 * Order matters: the index of each source in `initialSources`
 * implicitly seeds per-source ID counters in `jobs.ts`, so any
 * reordering shifts every downstream Job ID. Keep this list in
 * lock-step with the historical order (see PR #149 for the
 * decomposition rationale).
 */
import type { VacancySource } from './vacancyTypes';
import { yandexEdaSource } from './sources/yandex-eda';
import { kuperSources } from './sources/kuper';
import { tBankSources } from './sources/tbank';
import { efinSource } from './sources/efin';
import { alfaBankSource } from './sources/alfa-bank';
import { burgerKingSource } from './sources/burger-king';
import { ozonVacancySources } from './ozonOffers';
import { applyOzonHourlyFallback } from './sources/ozon-hourly-fallback';

const initialSources: VacancySource[] = [
  yandexEdaSource,
  ...kuperSources,
  ...tBankSources,
  efinSource,
  alfaBankSource,
  burgerKingSource,
  ...ozonVacancySources,
];

export const vacancySources: VacancySource[] = applyOzonHourlyFallback(initialSources);
