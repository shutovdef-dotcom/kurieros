import type { SupportedLanguage } from './types';

// VPN modal «continue without selecting a city» button label per
// locale. Assigned to translations[lang].vpn.btn_close at index
// assembly time.

export const vpnCloseTranslations: Record<SupportedLanguage, string> = {
  ru: 'Продолжить без выбора',
  uz: 'Tanlamasdan davom etish',
  tg: 'Бе интихоб идома додан',
  ky: 'Тандабай улантуу',
  hy: 'Շարունակել առանց ընտրության',
  kk: 'Таңдамай жалғастыру',
  az: 'Seçmədən davam et',
  uk: 'Продовжити без вибору',
  be: 'Працягнуць без выбару',
  hi: 'बिना चुने जारी रखें',
  vi: 'Tiếp tục không chọn',
  zh: '不选择继续',
};
