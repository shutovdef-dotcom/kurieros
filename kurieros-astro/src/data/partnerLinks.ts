/**
 * Partner / affiliate URL constants.
 *
 * Centralised so partner links (referral apply URLs, externally hosted
 * logos, partner-banner click destinations) are rotatable from one
 * place. Search for `PARTNER_LINKS` to audit / update — every
 * partner-link consumer in the codebase should pull from this module.
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
// Local SVG (PR #106 — replaced the Wikimedia hot-link).
export const YANDEX_EDA_LOGO = '/logos/yandex-eda.svg';

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

// === Альфа-Банк =====================================================
export const ALFA_BANK_LOGO = '/logos/alfa-bank.svg';
export const ALFA_BANK_APPLY =
  'https://pxl.leads.su/click/00012fe3aecb294c077b1c68b4594cb0?erid=2W5zFJdQNW4';

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

/**
 * Aggregate object for grep-friendly auditing. Each entry mirrors the
 * standalone constants above; callers may import either form.
 */
export const PARTNER_LINKS = {
  yandexEda: { apply: YANDEX_EDA_APPLY, logo: YANDEX_EDA_LOGO },
  kuper: {
    logo: KUPER_LOGO,
    footAndBikeApply: KUPER_FOOT_AND_BIKE_APPLY,
    packerApply: KUPER_PACKER_APPLY,
    autoApply: KUPER_AUTO_APPLY,
  },
  tBank: { apply: T_BANK_APPLY, logo: T_BANK_LOGO },
  efin: { apply: EFIN_APPLY, logo: EFIN_LOGO },
  alfaBank: { apply: ALFA_BANK_APPLY, logo: ALFA_BANK_LOGO },
  ozon: {
    logo: OZON_LOGO,
    freshLogo: OZON_FRESH_LOGO,
    refLandingSklad: OZON_REF_LANDING_SKLAD,
    refLandingFresh: OZON_REF_LANDING_FRESH,
    leadApply: OZON_LEAD_APPLY,
  },
  partnerBanner: { defaultHref: PARTNER_BANNER_DEFAULT_HREF },
} as const;
