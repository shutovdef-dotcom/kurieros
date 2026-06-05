/**
 * Fix E (2026-05-25) — per-source-slug `occupationalCategory` for
 * JobPosting JSON-LD, using US Bureau of Labor Statistics SOC codes
 * (the format Google for Jobs recommends).
 *
 * Before this map every vacancy emitted
 * `occupationalCategory: "53-3031 Driver/Sales Workers"`, which is
 * correct only for actual courier roles. Non-courier sources
 * (Burger King cook, T-Bank operator B2B, bank field representatives,
 * order pickers, warehouse operators, truck drivers, supervisors)
 * got the wrong occupation, dropping them from precise Google for Jobs
 * matching and degrading recommendation relevance.
 *
 * Lookup key is `GeneratedJob.sourceSlug` (e.g. `burger-king-cook-cashier`,
 * `kuper-order-picker`, `express:courier`). All sources currently in
 * the catalogue are listed below; unknown slugs fall back to
 * 53-3031 (still the majority case).
 *
 * BLS SOC reference: https://www.bls.gov/soc/2018/
 */
export const SOURCE_OCCUPATION: Readonly<Record<string, string>> = {
  // Courier / driver-sales (default)
  'kuper-foot-courier': '53-3031 Driver/Sales Workers',
  'kuper-bike-courier': '53-3031 Driver/Sales Workers',
  'kuper-auto-courier': '53-3031 Driver/Sales Workers',
  'yandex-eda-courier': '53-3031 Driver/Sales Workers',
  'rocket:courier': '53-3031 Driver/Sales Workers',
  'express:courier': '53-3031 Driver/Sales Workers',
  'samokat-courier': '53-3031 Driver/Sales Workers',

  // Bank field representatives — actually sell financial services (cards,
  // accounts, loans) to businesses and individuals, not retail merchandise.
  // 41-3031 is the BLS code dedicated to financial-services sales agents;
  // 41-2031 (Retail Salespersons) covers in-store retail of physical goods
  // and is a weaker fit for door-to-door bank reps.
  'alfa-bank-representative':
    '41-3031 Securities, Commodities, and Financial Services Sales Agents',
  'tbank-representative':
    '41-3031 Securities, Commodities, and Financial Services Sales Agents',
  'efin-bank-representative':
    '41-3031 Securities, Commodities, and Financial Services Sales Agents',

  // Call-centre / outbound sales operators
  'tbank-outbound-b2b-operator': '41-9041 Telemarketers',

  // Fast food / kitchen
  'burger-king-cook-cashier': '35-3023 Fast Food and Counter Workers',
  'express:factoryKitchen': '35-3023 Fast Food and Counter Workers',

  // Warehouse / fulfilment
  'kuper-order-picker': '53-7064 Packers and Packagers, Hand',
  'express:operator': '43-5081 Stock Clerks- Stockroom, Warehouse, or Storage Yard',
  'ff:operator': '43-5081 Stock Clerks- Stockroom, Warehouse, or Storage Yard',
  'ff:brigadier':
    '53-1042 First-Line Supervisors of Transportation and Material Moving Workers',
  'ff:electricStackerDriver': '53-7051 Industrial Truck and Tractor Operators',
  'ff:truckDriver': '53-3032 Heavy and Tractor-Trailer Truck Drivers',

  // Administrative office support
  'express:adminPersonal': '43-9061 Office Clerks, General',
};

/**
 * Returns the BLS SOC occupational category for `sourceSlug`, or
 * `undefined` when no mapping exists. `buildJobPostingSchema` falls
 * back to its hardcoded `53-3031 Driver/Sales Workers` default in
 * the latter case, preserving backward behaviour for any new
 * partner added without an explicit mapping.
 */
export const getSourceOccupation = (sourceSlug: string): string | undefined =>
  SOURCE_OCCUPATION[sourceSlug];
