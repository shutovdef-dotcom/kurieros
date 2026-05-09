import type { SupportedLanguage } from './types';

// Shared «main» nav label per locale (rendered as the dropdown root
// of the mobile bottom-nav). Merged into translations[lang].nav.main
// at index assembly time.

export const navMainTranslations: Record<SupportedLanguage, string> = {
  ru: 'Главная',
  uz: 'Bosh sahifa',
  tg: 'Асосӣ',
  ky: 'Башкы бет',
  hy: 'Գլխավոր',
  kk: 'Басты бет',
  az: 'Əsas səhifə',
  uk: 'Головна',
  be: 'Галоўная',
  hi: 'मुख्य पृष्ठ',
  vi: 'Trang chủ',
  zh: '首页',
};
