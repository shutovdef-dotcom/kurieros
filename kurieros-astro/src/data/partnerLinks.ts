/**
 * Partner / affiliate URL constants.
 *
 * Centralised so partner links (referral apply URLs, externally hosted
 * logos, partner-banner click destinations) are rotatable from one
 * place. Every partner-link consumer in the codebase should pull from
 * this module.
 *
 * Conventions:
 *   • `*_APPLY` — referral landing URL the user is sent to when
 *     clicking «Откликнуться» / «Заполнить заявку». Always carries the
 *     partner-supplied tracking params (`erid`, `utm_*`).
 *   • `*_LOGO` — bundled SVG (in /public/logos/) preferred over remote
 *     URLs. Some partner logos still hot-link from
 *     `https://agents.pampadu.ru/...` because their referral programs
 *     ship logos through that CDN.
 *   • `*_REF_LANDING_*` — landing URLs for the Ozon recruitment forms;
 *     consumed by ozonOffers.ts when building the Ozon Lead modal.
 *
 * Adding a new partner: add the apply/logo constants below, import
 * them where the company-source object is built.
 */

// === Yandex Eda =====================================================
export const YANDEX_EDA_APPLY = 'https://my2go.ru/mitpJ?erid=2VtzqwSDctu';

// === Купер (ex. СберМаркет) =========================================
export const KUPER_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=c0a42c37-73f4-4de0-a4f9-fd0689380a79.png';
export const KUPER_FOOT_AND_BIKE_APPLY =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2739';
export const KUPER_PACKER_APPLY =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2740';
export const KUPER_AUTO_APPLY =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2741';

// === Т-Банк =========================================================
export const T_BANK_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=23a3b3dd-48a4-4edf-a2a6-c5d681389c1a.png';
export const T_BANK_APPLY = 'https://trk.ppdu.ru/click/X76Tf6si?erid=2SDnjcbs16H';

// === Efin ===========================================================
export const EFIN_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=314d3acb-aba3-488c-9ddb-9c41dece71ca.png';
export const EFIN_APPLY = 'https://trk.ppdu.ru/click/VuqTAiCx?erid=2SDnjdmxiVK';

// === Самокат ========================================================
// Самокат courier-partner — CPA via leads.su (same network as Альфа-Банк).
// Local SVG placeholder in /public/logos/ until a real brand SVG is supplied.
export const SAMOKAT_LOGO = '/logos/samokat.svg';
export const SAMOKAT_APPLY =
  'https://pxl.leads.su/click/dda95ad94f19aab8dca8a2a2647a6742';

// === Альфа-Банк =====================================================
export const ALFA_BANK_LOGO = '/logos/alfa-bank.svg';
export const ALFA_BANK_APPLY =
  'https://pxl.leads.su/click/00012fe3aecb294c077b1c68b4594cb0?erid=2W5zFJdQNW4';

// === Бургер Кинг ====================================================
// Burger King повар-кассир (cook-cashier) — CPA via pampadu (oid=2085).
// Logo hot-links from pampadu's CDN; replace with /logos/burger-king.svg
// once a local SVG is available.
export const BURGER_KING_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=7caae4b8-79dc-44ba-9f4e-811e4e415e02.png';
export const BURGER_KING_APPLY =
  'https://trk.ppdu.ru/click?uid=119136&oid=2085&erid=2SDnjdu6ZqS';

// === Ozon ===========================================================
// Ozon Fresh shares the parent SVG (PR #98).
export const OZON_LOGO = '/logos/ozon.svg';
export const OZON_FRESH_LOGO = '/logos/ozon.svg';
export const OZON_REF_LANDING_SKLAD =
  'https://recruitment.ozon.ru/ref-courier-sklad';
export const OZON_REF_LANDING_FRESH =
  'https://recruitment.ozon.ru/fresh-referral-office';
// Magic prefix recognised by JobCard.astro / pages/v/[slug].astro to
// open OzonLeadModal.astro instead of navigating externally.
export const OZON_LEAD_APPLY = 'lead-form:ozon';

// === PartnerBanner default href =====================================
export const PARTNER_BANNER_DEFAULT_HREF =
  'https://trk.ppdu.ru/click/gtLv8Qo4?erid=2SDnjceSYW1';
