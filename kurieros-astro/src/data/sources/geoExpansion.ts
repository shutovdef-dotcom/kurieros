/**
 * Shared geo expansion for partner roles whose source says
 * "Москва / Московская область" and/or "Санкт-Петербург".
 *
 * Keep satellite locations as separate `offer.city` rows, not
 * `cityDistricts`: users search for "Химки", "Одинцово", "Колпино"
 * as standalone locations and they should receive standalone pages.
 *
 * Sources used when the list was introduced:
 * - Moscow Oblast cities: https://ruxpert.ru/Города_Московской_области
 * - Saint Petersburg intra-city localities:
 *   https://ru.ruwiki.ru/wiki/Населённые_пункты_в_составе_Санкт-Петербурга
 * - Leningrad Oblast cities, opt-in only:
 *   https://ruxpert.ru/Города_Ленинградской_области
 */

export const MOSCOW_AND_MOSCOW_REGION_CITIES = [
  'Москва',
  'Апрелевка',
  'Балашиха',
  'Белоозёрский',
  'Бронницы',
  'Верея',
  'Видное',
  'Волоколамск',
  'Воскресенск',
  'Высоковск',
  'Голицыно',
  'Дедовск',
  'Дзержинский',
  'Дмитров',
  'Долгопрудный',
  'Домодедово',
  'Дрезна',
  'Дубна',
  'Егорьевск',
  'Жуковский',
  'Зарайск',
  'Звенигород',
  'Ивантеевка',
  'Истра',
  'Кашира',
  'Клин',
  'Коломна',
  'Королёв',
  'Котельники',
  'Красноармейск',
  'Красногорск',
  'Краснозаводск',
  'Краснознаменск',
  'Кубинка',
  'Куровское',
  'Ликино-Дулёво',
  'Лобня',
  'Лосино-Петровский',
  'Луховицы',
  'Лыткарино',
  'Люберцы',
  'Можайск',
  'Мытищи',
  'Наро-Фоминск',
  'Ногинск',
  'Одинцово',
  'Озёры',
  'Орехово-Зуево',
  'Павловский Посад',
  'Пересвет',
  'Подольск',
  'Протвино',
  'Пушкино',
  'Пущино',
  'Раменское',
  'Реутов',
  'Рошаль',
  'Руза',
  'Сергиев Посад',
  'Серпухов',
  'Солнечногорск',
  'Старая Купавна',
  'Ступино',
  'Талдом',
  'Фрязино',
  'Химки',
  'Хотьково',
  'Черноголовка',
  'Чехов',
  'Шатура',
  'Щёлково',
  'Электрогорск',
  'Электросталь',
  'Электроугли',
  'Яхрома',
] as const;

export const SAINT_PETERSBURG_INNER_CITIES = [
  'Санкт-Петербург',
  'Колпино',
  'Красное Село',
  'Кронштадт',
  'Зеленогорск',
  'Сестрорецк',
  'Ломоносов',
  'Петергоф',
  'Павловск',
  'Пушкин',
  'Левашово',
  'Парголово',
  'Металлострой',
  'Петро-Славянка',
  'Понтонный',
  'Сапёрный',
  'Усть-Ижора',
  'Белоостров',
  'Комарово',
  'Молодёжное',
  'Песочный',
  'Репино',
  'Серово',
  'Смолячково',
  'Солнечное',
  'Ушково',
  'Стрельна',
  'Лисий Нос',
  'Александровская',
  'Тярлево',
  'Шушары',
] as const;

export const LENINGRAD_REGION_CITIES = [
  'Мурино',
  'Гатчина',
  'Всеволожск',
  'Сертолово',
  'Выборг',
  'Кудрово',
  'Сосновый Бор',
  'Тихвин',
  'Кириши',
  'Кингисепп',
  'Волхов',
  'Луга',
  'Бугры',
  'Сланцы',
  'Тосно',
  'Кировск',
  'Коммунар',
  'Отрадное',
  'Тельмана',
  'Никольское',
  'Пикалёво',
  'Лодейное Поле',
  'Приозерск',
  'Подпорожье',
  'Бокситогорск',
  'Колтуши',
  'Шлиссельбург',
  'Светогорск',
  'Сясьстрой',
  'Новоселье',
  'Волосово',
  'Ивангород',
  'Новая Ладога',
  'Каменногорск',
  'Приморск',
  'Любань',
  'Высоцк',
] as const;

type CapitalRegionExpansionOptions = {
  includeMoscowRegion?: boolean;
  includeSaintPetersburgInnerCities?: boolean;
  includeLeningradRegion?: boolean;
};

const uniqueCities = (cities: readonly string[]): string[] =>
  Array.from(new Set(cities));

export const expandCitiesForCapitalRegions = (
  baseCities: readonly string[],
  options: CapitalRegionExpansionOptions = {},
): string[] => {
  const {
    includeMoscowRegion = true,
    includeSaintPetersburgInnerCities = true,
    includeLeningradRegion = false,
  } = options;
  const baseCitySet = new Set(baseCities);
  const expanded = [...baseCities];

  if (includeMoscowRegion && baseCitySet.has('Москва')) {
    expanded.push(...MOSCOW_AND_MOSCOW_REGION_CITIES);
  }

  if (baseCitySet.has('Санкт-Петербург')) {
    if (includeSaintPetersburgInnerCities) {
      expanded.push(...SAINT_PETERSBURG_INNER_CITIES);
    }
    if (includeLeningradRegion) {
      expanded.push(...LENINGRAD_REGION_CITIES);
    }
  }

  return uniqueCities(expanded);
};
