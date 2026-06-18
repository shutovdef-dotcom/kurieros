/**
 * Cross-partner helpers shared by per-partner source modules.
 *
 * Lives in `src/data/sources/` next to the partner files so the
 * dependency direction is one-way (partners → shared, never the
 * reverse). The aggregator `src/data/vacancies.ts` doesn't import
 * from here directly; it only re-exports per-partner sources.
 */
import type { TransportMode, VacancyOffer } from '../vacancyTypes';
import {
  formatCourierRateText,
  formatMoneyAmount,
  formatMoneyPerDay,
  formatMoneyPerHour,
  formatMonthlyMaxText,
} from '../../utils/money';

/**
 * Default `updatedAt` for partner offers without a partner-supplied
 * timestamp. Currently only Yandex Eda hard-codes this — JSON-driven
 * partners (T-Bank, Efin, Alfa, Burger King) bring their own
 * `updatedAt` from the source file.
 */
export const UPDATED_AT = '2026-04-17';

/**
 * Per-transport tie-breaker added to each offer's `priority` so that,
 * within a single source × city, higher-priority transport modes
 * (service > office > remote > auto > bicycle > foot) sort first.
 *
 * Imported directly by four partner modules — yandex-eda, kuper,
 * tbank, and efin — each adding `TRANSPORT_PRIORITY[transport]` to its
 * own `<base> - cityIndex * <step>` priority formula.
 */
export const TRANSPORT_PRIORITY: Record<TransportMode, number> = {
  foot: 1,
  bicycle: 2,
  auto: 3,
  remote: 4,
  office: 5,
  service: 6,
};

/**
 * Yandex-Eda-style hourly pay model. Used by Yandex Eda and Kuper
 * (where Kuper shifts are converted to hourly via
 * `toHourlyFromShift`), and by the Ozon hourly-fallback
 * post-processor that backfills Ozon offers without partner-supplied
 * hourlies.
 *
 * Both Y.Eda and Купер expose instant-payout via embedded wallets
 * (Я.Кошелёк / СберPay) — the courier can withdraw multiple times
 * per shift even though formal payroll is weekly. We label these as
 * "Ежедневно" so the URL/content for
 * `/rabota-kurerom-ezhednevnaya-oplata/` matches user intent.
 */
export const buildPay = (hourly: number): VacancyOffer['pay'] => {
  const daily = hourly * 12;
  const monthly = daily * 30;

  return {
    currency: 'RUB',
    hourly: {
      min: hourly,
      max: hourly,
      text: formatMoneyPerHour(hourly, 'RUB'),
    },
    perShift: {
      min: daily,
      max: daily,
      text: formatMoneyPerDay(daily, 'RUB'),
    },
    monthly: {
      min: monthly,
      max: monthly,
      text: formatMonthlyMaxText(monthly, 'RUB'),
    },
    rate: formatCourierRateText(hourly, daily, monthly, 'RUB'),
    paymentFrequency: 'Ежедневно',
  };
};

/**
 * Used by per-partner monthly-rate formatters (T-Bank, Efin, Alfa,
 * Burger King, Ozon). Centralised to keep the "ru-RU" locale and
 * number formatting consistent across partners.
 *
 * Normalises ICU thousands separators to regular ASCII space:
 *   - U+00A0 (NO-BREAK SPACE) — emitted by older ICU builds
 *   - U+202F (NARROW NO-BREAK SPACE) — emitted by V8 / ICU ≥ 2022
 * Without normalisation the rendered salary contains characters that
 * many UIs / clipboards / search indexes don't collapse, producing
 * visible drift between partners depending on the runtime ICU version.
 */
export const formatRub = (value: number): string =>
  formatMoneyAmount(value);

/**
 * Required-document overrides for Yandex Eda / Kuper offers based on
 * the citizenship label of the city (e.g. "РФ / ЕАЭС / СНГ"). Both
 * partners share the same documentation matrix.
 */
const eaesRequiredDocument =
  'Для граждан ЕАЭС: паспорт с регистрацией, медицинская книжка, миграционная карта с целью въезда «Работа», СНИЛС, ИНН и ДМС.';

const nonEaesRequiredDocument =
  'Для граждан стран вне ЕАЭС дополнительно нужны ВНЖ и патент с чеками.';

export const getRequiredDocumentOverrides = (citizenship: string): string[] => {
  const hasEaes = citizenship.includes('ЕАЭС');
  const hasNonEaes = citizenship.includes('вне ЕАЭС');

  return [
    ...(hasEaes ? [eaesRequiredDocument] : []),
    ...(hasNonEaes ? [nonEaesRequiredDocument] : []),
  ];
};
