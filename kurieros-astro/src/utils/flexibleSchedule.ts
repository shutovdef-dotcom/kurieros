/**
 * isFlexibleSchedule — does a vacancy's `schedule` string describe
 * part-time / flexible ("подработка") work?
 *
 * Powers the derived `flexible` job tag in `src/data/jobs.ts`, which in
 * turn feeds the /podrabotka-kurerom/ hub and the schedule category
 * facets (na-vyhodnye, vecherom, nochyu, zhenshchine, svobodny-grafik).
 *
 * Before this helper the `flexible` tag was hardcoded on Яндекс Еда
 * alone (399 vacancies). The rule below was validated against the live
 * dataset (4786 vacancies, 8 employers) and cross-checked against the
 * employers' own career pages — all 8 (Купер, Т-Банк, Яндекс Еда,
 * Бургер Кинг, Efin, Ozon, Ozon Fresh, Альфа-Банк) confirm part-time
 * courier / representative work.
 *
 * A schedule counts as flexible when it carries ANY part-time marker:
 *   - explicit "подработка"
 *   - "свободный" / "гибкий" график
 *   - a low hours floor — "от N часов"
 *   - a low days/shifts floor — "от N дней", "от N смен", "N-N дня в неделю"
 *   - weekend-only — "сб и вс"
 *   - slot-based — "слоты от …"
 *   - remote — "удалённый …"
 *   - "любой" график
 *   - "неполный рабочий …"
 *
 * Plain fixed-shift schedules ("5/2", "2/2", "Смена до 12 часов" with
 * no marker) are NOT flexible.
 *
 * Pure total function: blank / missing input returns false, never throws.
 */

const FLEXIBLE_SCHEDULE_MARKERS: readonly RegExp[] = [
  /подработ/,
  /свободн[а-яё]* график/,
  /гибк/,
  /от \d+\s*[-хx]*\s*час/,
  /от \d+[-х]*\s*(дн|смен)/,
  /\d+\s*-\s*\d+ (дн|дня|раза) /,
  /сб и вс/,
  /слот[а-яё]* от/,
  /удал[её]нн/,
  /(^|[^а-яё])любой([^а-яё]|$)/,
  /неполн[а-яё]* рабоч/,
];

/**
 * True when `schedule` describes part-time / flexible work.
 * Input is lower-cased and trimmed before matching.
 */
export function isFlexibleSchedule(
  schedule: string | null | undefined,
): boolean {
  const value = (schedule ?? '').toLowerCase().trim();
  if (!value) return false;
  return FLEXIBLE_SCHEDULE_MARKERS.some((marker) => marker.test(value));
}
