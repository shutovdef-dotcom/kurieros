/**
 * Aggregator entry-point for the partner vacancy catalogue.
 *
 * Per-partner data and helpers live under `./sources/<partner>.ts`
 * (yandex-eda, kuper, tbank, efin, alfa-bank, burger-king). Ozon comes
 * from `./ozonOffers.ts`. Hourly-rate post-processor lives in
 * `./sources/ozon-hourly-fallback.ts`.
 *
 * ID stability invariant: each `VacancySource.id` is a hardcoded
 * numeric primary key (1..19 currently) used by `getGeneratedId`
 * in `jobs.ts` to derive every Job ID. NEVER reuse, renumber, or
 * remove an existing `id` — external bookmarks, GA4 events, and
 * the `compareList` localStorage all reference these IDs forever.
 * Order of sources in this array has no effect on Job IDs.
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
