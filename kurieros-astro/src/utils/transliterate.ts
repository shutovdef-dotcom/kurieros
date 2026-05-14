// Shared Cyrillic-to-Latin transliteration helper.
//
// Both src/utils/cities.ts (slugifyCity) and src/utils/companies.ts
// (slugifyCompany) used to ship a 30-key duplicate of the same map and
// the same lowercase + split-map-join lambda. This module owns the
// canonical mapping so any future tweak (eg adding a Kazakh/Tajik
// letter) lives in one place.
//
// `cyrillicToLatin` only handles the lowercase + per-character
// transliteration step; callers add their own normalisation
// (eg .trim()) and post-processing (eg collapse non-alnum to dashes,
// trim leading/trailing dashes) — see slugifyCity / slugifyCompany.

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export const cyrillicToLatin = (input: string): string =>
  input
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('');
