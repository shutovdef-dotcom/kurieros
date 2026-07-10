import type { TransportMode } from './vacancyTypes';

type RoleTitlePolicy = string | Partial<Record<TransportMode, string>>;

const TRANSPORT_COURIER_TITLES: Partial<Record<TransportMode, string>> = {
  foot: 'Пеший курьер',
  bicycle: 'Велокурьер',
  auto: 'Автокурьер',
};

const PARTNER_COURIER_TITLES: Partial<Record<TransportMode, string>> = {
  foot: 'Пеший курьер-партнёр',
  bicycle: 'Велокурьер-партнёр',
  auto: 'Автокурьер-партнёр',
};

const ROLE_TITLE_BY_SOURCE: Readonly<Record<string, RoleTitlePolicy>> = {
  'yandex-eda-courier': TRANSPORT_COURIER_TITLES,
  'kuper-foot-courier': 'Пеший курьер',
  'kuper-bike-courier': 'Велокурьер',
  'kuper-auto-courier': 'Автокурьер',
  'kuper-order-picker': 'Сборщик заказов',
  'tbank-outbound-b2b-operator': 'Оператор исходящих B2B-продаж',
  'tbank-representative': 'Представитель',
  'efin-bank-representative': 'Представитель банка',
  'alfa-bank-representative': {
    foot: 'Пеший представитель',
    bicycle: 'Велопредставитель',
    auto: 'Авто-представитель',
  },
  'burger-king-cook-cashier': 'Повар-кассир',
  'samokat-courier': 'Курьер-партнёр',
  'x5-delivery-auto-courier': 'Водитель',
  'voxys-call-center-operator': 'Оператор колл-центра',
  'mts-bank-operator': 'Оператор',
  'qlean-cleaner': 'Клинер',
  'ruki-door-installer': 'Установщик межкомнатных дверей',
  'ruki-kitchen-assembler': 'Сборщик кухонь',
  'domovenok-window-cleaner': 'Мойщик окон',
  'yandex-go-courier-belarus': PARTNER_COURIER_TITLES,
  'yandex-go-courier-kazakhstan': PARTNER_COURIER_TITLES,
  'yandex-go-courier-kyrgyzstan': PARTNER_COURIER_TITLES,
  'yandex-go-courier-uzbekistan': PARTNER_COURIER_TITLES,
  'ozon-courier': 'Автокурьер',
  'ozon-truck-driver': 'Водитель-экспедитор',
  'ozon-warehouse-operator': 'Оператор склада',
  'ozon-electric-stacker-driver': 'Водитель электроштабелера',
  'ozon-goods-handler': 'Специалист по обработке товаров',
  'ozon-fresh-courier': 'Курьер',
  'ozon-fresh-order-picker': 'Сборщик заказов',
  'ozon-fresh-administrator': 'Администратор даркстора',
  'ozon-fresh-kitchen-staff': 'Сотрудник фабрики-кухни',
  'tetrika-english-teacher': 'Репетитор',
  'tetrika-physics-teacher': 'Репетитор',
  'tetrika-russian-teacher': 'Репетитор',
  'tetrika-math-teacher': 'Репетитор',
  'tetrika-teacher': 'Репетитор',
};

export const getJobPostingRoleTitle = (
  sourceSlug: string,
  transport: TransportMode,
): string | undefined => {
  const policy = ROLE_TITLE_BY_SOURCE[sourceSlug];
  if (!policy) return undefined;
  return typeof policy === 'string' ? policy : policy[transport];
};
