import { slugifyCity } from '../../utils/cities';
import type { VacancySource } from '../vacancyTypes';
import { YANDEX_DELIVERY_CARGO_APPLY, YANDEX_DELIVERY_CARGO_LOGO } from '../partnerLinks';

const SOURCE_URL = 'https://agents.pampadu.ru/app/offer/view/2864';
// Only the 21 cities in the offer's current partner-rate sheet; no nearby-city expansion.
// The amounts in that sheet are affiliate commissions, not candidate income.
// https://docs.google.com/spreadsheets/d/1PCoiz7tt9E3DrR7AKWRzWMTD2_MohuKLoZmeXW68jSU/edit
const CITIES = [
  'Москва', 'Санкт-Петербург', 'Краснодар', 'Екатеринбург', 'Новосибирск',
  'Ростов-на-Дону', 'Челябинск', 'Казань', 'Нижний Новгород', 'Воронеж',
  'Уфа', 'Самара', 'Пермь', 'Омск', 'Красноярск', 'Волгоград', 'Чебоксары',
  'Ульяновск', 'Калуга', 'Владивосток', 'Иваново',
];

export const yandexDeliveryCargoSource: VacancySource = {
  id: 37,
  slug: 'yandex-delivery-cargo-driver',
  company: { name: 'Яндекс Доставка', logo: YANDEX_DELIVERY_CARGO_LOGO },
  content: {
    title: 'Водитель-партнёр грузового автомобиля {cityPrep} — Яндекс Доставка',
    shortDescription: 'Перевозка грузов с заказами из Яндекс Доставки на своём или арендованном грузовом автомобиле. Расписание поездок на выбор, выплаты по условиям партнёра сервиса.',
    description: 'Приглашаем к сотрудничеству водителей грузовых автомобилей {cityPrep}. Нужно забирать грузы у пользователей и корпоративных клиентов и доставлять до получателя. Яндекс Доставка — сервис, а сотрудничество оформляется с его партнёрами через самозанятость или ИП. Можно выбрать удобное расписание поездок. Доход зависит от количества заказов; требования к автомобилю, аренда и порядок выплат уточняются у партнёра сервиса.',
    requirements: [
      'Возраст от 18 лет; гражданство РФ или ЕАЭС.',
      'Водительское удостоверение категории B или C в зависимости от автомобиля.',
      'Статус самозанятого или ИП.',
      'Для подключения через этот оффер: без доставок в сервисе Яндекс Доставки последние 45 дней и приглашений в последние 3 дня.',
      'Грузовой автомобиль: фургон, тент или цельнометаллический кузов; минимальный размер грузового отсека 190 × 100 × 90 см.',
      'Год выпуска автомобиля: от 2008 в Москве, от 2002 в остальных городах. Окончательную проверку проводит партнёр сервиса.',
      'Автомобиль без ржавчины, сколов, трещин на стёклах и символики других компаний.',
      'Смартфон и умение пользоваться навигатором.',
      'Для своего автомобиля опыт перевозок не обязателен; условия аренды и требования к опыту уточняются у партнёра.',
    ],
    benefits: [
      'Расписание поездок на выбор.',
      'Заказы от пользователей и корпоративных клиентов.',
      'Свой автомобиль или аренда у партнёра сервиса.',
      'Возможность ежедневных выплат по условиям партнёра.',
      'Условия сотрудничества с партнёром Яндекс Доставки индивидуальны и могут отличаться от указанных.',
    ],
    requiredDocuments: ['Паспорт.', 'Водительское удостоверение.', 'СТС автомобиля.', 'Статус самозанятого или ИП.'],
    labels: ['Грузовой автомобиль', 'Расписание на выбор', 'Самозанятость или ИП'],
    searchTags: ['грузовой водитель', 'газель', 'грузоперевозки', 'Яндекс Доставка'],
  },
  defaults: {
    ageFrom: 18,
    citizenship: 'РФ / ЕАЭС',
    employmentFormats: ['self_employed', 'individual_entrepreneur'],
    medicalBook: 'unknown',
    schedule: 'Расписание поездок на выбор',
    education: 'Не требуется',
    uniform: 'Уточняется у партнёра сервиса',
    os: 'Смартфон; совместимость уточняется при подключении',
  },
  offers: CITIES.map((city, index) => {
    const url = new URL(YANDEX_DELIVERY_CARGO_APPLY);
    url.searchParams.set('utm_source', 'kurerok');
    url.searchParams.set('utm_medium', 'vacancy');
    url.searchParams.set('utm_campaign', 'yandex-delivery-cargo-driver');
    url.searchParams.set('utm_content', `${slugifyCity(city)}-auto`);
    return {
      city,
      transport: 'auto',
      transportProvision: 'own_or_partner_rental',
      pay: {
        currency: 'RUB',
        monthly: { text: 'Доход зависит от заказов' },
        rate: 'Оплата за выполненные заказы; условия уточняются у партнёра сервиса',
        paymentFrequency: 'По условиям партнёра; возможны ежедневные выплаты',
      },
      isActive: true,
      updatedAt: '2026-09-25',
      contentUpdatedAt: '2026-10-04',
      sourceCheckedAt: '2026-10-04',
      sourceUrl: SOURCE_URL,
      salaryConfidence: 'partner',
      applyLink: url.toString(),
      priority: 1660 - index,
    };
  }),
  incomeCalculator: { mode: 'hidden' },
  howToTemplate: 'cargo_driver',
  extraTags: ['cargo-driver', 'self-employed', 'source:pampadu'],
};
