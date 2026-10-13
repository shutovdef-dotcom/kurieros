/**
 * Aggregator entry-point for the partner vacancy catalogue.
 *
 * Per-partner data and helpers live under `./sources/<partner>.ts`
 * (yandex-eda, yandex-go-international, kuper, tbank, efin, alfa-bank,
 * burger-king, samokat, voxys, mts-bank, qlean, ruki, domovenok,
 * tetrika).
 * Ozon comes from `./ozonOffers.ts`. Preserve its own pay and payment
 * cadence; another employer's hourly rate is not an Ozon tariff.
 *
 * ID stability invariant: each `VacancySource.id` is a hardcoded
 * numeric primary key (1..37 currently) used by `getGeneratedId`
 * in `jobs.ts` to derive every Job ID. NEVER reuse, renumber, or
 * remove an existing `id` — external bookmarks, GA4 events, and
 * the `compareList` localStorage all reference these IDs forever.
 * Order of sources in this array has no effect on Job IDs.
 */
import type { VacancySource } from './vacancyTypes';
import { yandexEdaSource } from './sources/yandex-eda';
import { yandexDeliveryCargoSource } from './sources/yandex-delivery-cargo';
import { kuperSources } from './sources/kuper';
import { tBankSources } from './sources/tbank';
import { efinSource } from './sources/efin';
import { alfaBankSource } from './sources/alfa-bank';
import { burgerKingSource } from './sources/burger-king';
import { samokatSource } from './sources/samokat';
import { x5DeliverySource } from './sources/x5-delivery';
import { voxysSource } from './sources/voxys';
import { mtsBankSource } from './sources/mts-bank';
import { qleanSource } from './sources/qlean';
import { rukiSources } from './sources/ruki';
import { domovenokSource } from './sources/domovenok';
import { yandexGoInternationalSources } from './sources/yandex-go-international';
import { tetrikaSources } from './sources/tetrika';
import { ozonVacancySources } from './ozonOffers';

const initialSources: VacancySource[] = [
  yandexEdaSource,
  yandexDeliveryCargoSource,
  ...kuperSources,
  ...tBankSources,
  efinSource,
  alfaBankSource,
  burgerKingSource,
  samokatSource,
  x5DeliverySource,
  voxysSource,
  mtsBankSource,
  qleanSource,
  ...rukiSources,
  domovenokSource,
  ...yandexGoInternationalSources,
  ...ozonVacancySources,
  ...tetrikaSources,
];

export const vacancySources: VacancySource[] = initialSources;
