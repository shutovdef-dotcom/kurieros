type BreadcrumbItem = {
  name: string;
  url: string;
};

export const buildBreadcrumbSchema = (
  items: BreadcrumbItem[],
  site: URL | string,
) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: new URL(item.url, site).toString(),
  })),
});

const EMPLOYMENT_KEYWORDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/самозан|\bип\b|гпх|гражданско.правов|подряд|contractor/i, 'CONTRACTOR'],
  [/полн|официал|штат|трудов\w* догов|full[\s-]?time/i, 'FULL_TIME'],
  [/частичн|подработк|неполн|part[\s-]?time/i, 'PART_TIME'],
  [/времен|temporary/i, 'TEMPORARY'],
  [/стажировк|intern/i, 'INTERN'],
];

export const mapEmploymentTypeToSchema = (label: string | undefined): string[] => {
  if (!label) return ['OTHER'];
  const found = new Set<string>();
  for (const [pattern, value] of EMPLOYMENT_KEYWORDS) {
    if (pattern.test(label)) {
      found.add(value);
    }
  }
  return found.size > 0 ? Array.from(found) : ['OTHER'];
};

const CITY_TO_REGION: Readonly<Record<string, string>> = {
  Москва: 'RU-MOW',
  'Санкт-Петербург': 'RU-SPE',
  Новосибирск: 'RU-NVS',
  Екатеринбург: 'RU-SVE',
  Казань: 'RU-TA',
  'Нижний Новгород': 'RU-NIZ',
  Челябинск: 'RU-CHE',
  Красноярск: 'RU-KYA',
  Самара: 'RU-SAM',
  Уфа: 'RU-BA',
  'Ростов-на-Дону': 'RU-ROS',
  Омск: 'RU-OMS',
  Краснодар: 'RU-KDA',
  Воронеж: 'RU-VOR',
  Пермь: 'RU-PER',
  Волгоград: 'RU-VGG',
  Саратов: 'RU-SAR',
  Тюмень: 'RU-TYU',
  Тольятти: 'RU-SAM',
  Барнаул: 'RU-ALT',
  Ижевск: 'RU-UD',
  Махачкала: 'RU-DA',
  Хабаровск: 'RU-KHA',
  Ульяновск: 'RU-ULY',
  Иркутск: 'RU-IRK',
  Владивосток: 'RU-PRI',
  Ярославль: 'RU-YAR',
  Кемерово: 'RU-KEM',
  Томск: 'RU-TOM',
  Севастополь: 'RU-SEV',
  Ставрополь: 'RU-STA',
  Оренбург: 'RU-ORE',
  Рязань: 'RU-RYA',
  Балашиха: 'RU-MOS',
  Подольск: 'RU-MOS',
  Химки: 'RU-MOS',
  Мытищи: 'RU-MOS',
  Королёв: 'RU-MOS',
  Люберцы: 'RU-MOS',
  Красногорск: 'RU-MOS',
  Сочи: 'RU-KDA',
  Калининград: 'RU-KGD',
  Тула: 'RU-TUL',
  Липецк: 'RU-LIP',
  Киров: 'RU-KIR',
  Чебоксары: 'RU-CU',
  Пенза: 'RU-PNZ',
  Астрахань: 'RU-AST',
  Брянск: 'RU-BRY',
  Тверь: 'RU-TVE',
  Иваново: 'RU-IVA',
  Магнитогорск: 'RU-CHE',
  Курск: 'RU-KRS',
  Архангельск: 'RU-ARK',
  Сургут: 'RU-KHM',
  Владимир: 'RU-VLA',
  Чита: 'RU-ZAB',
  Белгород: 'RU-BEL',
  Калуга: 'RU-KLU',
  Череповец: 'RU-VLG',
  Вологда: 'RU-VLG',
  Смоленск: 'RU-SMO',
  Курган: 'RU-KGN',
  Орёл: 'RU-ORL',
  Саранск: 'RU-MO',
  Якутск: 'RU-SA',
  'Улан-Удэ': 'RU-BU',
  Грозный: 'RU-CE',
  Кострома: 'RU-KOS',
  Тамбов: 'RU-TAM',
  'Великий Новгород': 'RU-NGR',
  Псков: 'RU-PSK',
  'Йошкар-Ола': 'RU-ME',
  Сыктывкар: 'RU-KO',
  Майкоп: 'RU-AD',
  'Нижний Тагил': 'RU-SVE',
  'Старый Оскол': 'RU-BEL',
  Энгельс: 'RU-SAR',
  'Каменск-Уральский': 'RU-SVE',
  Армавир: 'RU-KDA',
  Дзержинск: 'RU-NIZ',
  Орск: 'RU-ORE',
  Прокопьевск: 'RU-KEM',
  Бийск: 'RU-ALT',
  Шахты: 'RU-ROS',
  'Сергиев Посад': 'RU-MOS',
  Жуковский: 'RU-MOS',
  Реутов: 'RU-MOS',
  Долгопрудный: 'RU-MOS',
  Одинцово: 'RU-MOS',
  Щёлково: 'RU-MOS',
  Раменское: 'RU-MOS',
  Зеленоград: 'RU-MOW',
  Электросталь: 'RU-MOS',
  Ногинск: 'RU-MOS',
  Пушкино: 'RU-MOS',
  Видное: 'RU-MOS',
  Лобня: 'RU-MOS',
  Дмитров: 'RU-MOS',
  Чехов: 'RU-MOS',
  Серпухов: 'RU-MOS',
  Дубна: 'RU-MOS',
  Истра: 'RU-MOS',
  Клин: 'RU-MOS',
  Ступино: 'RU-MOS',
  Коломна: 'RU-MOS',
  Кашира: 'RU-MOS',
  Воскресенск: 'RU-MOS',
  Шатура: 'RU-MOS',
  'Орехово-Зуево': 'RU-MOS',
  Бронницы: 'RU-MOS',
  Можайск: 'RU-MOS',
  'Наро-Фоминск': 'RU-MOS',
  Кубинка: 'RU-MOS',
  Звенигород: 'RU-MOS',
  Котельники: 'RU-MOS',
  Лыткарино: 'RU-MOS',
  Дзержинский: 'RU-MOS',
  Фрязино: 'RU-MOS',
  Ивантеевка: 'RU-MOS',
  Колпино: 'RU-SPE',
  Пушкин: 'RU-SPE',
  Петергоф: 'RU-SPE',
  Сестрорецк: 'RU-SPE',
  Кронштадт: 'RU-SPE',
  Гатчина: 'RU-LEN',
  Выборг: 'RU-LEN',
  Кириши: 'RU-LEN',
  Тихвин: 'RU-LEN',
  'Сосновый Бор': 'RU-LEN',
  Всеволожск: 'RU-LEN',
  Кудрово: 'RU-LEN',
  Мурино: 'RU-LEN',
  Балашов: 'RU-SAR',
  Набережные: 'RU-TA',
  'Набережные Челны': 'RU-TA',
  Новокузнецк: 'RU-KEM',
  Сыктывкар_KO: 'RU-KO',
};

export const getAddressRegion = (city: string): string | undefined =>
  CITY_TO_REGION[city];

export type JobPostingInput = {
  title: string;
  description: string;
  slug: string;
  company: string;
  companyUrl: string;
  companyLogo?: string;
  cities: string[];
  employmentTypeLabel?: string;
  qualifications?: string;
  benefits?: string;
  hasApplyLink: boolean;
  applyLink?: string;
  baseSalaryMonthly?: number;
  hourlyRate?: number | null;
  currency?: string;
  datePosted: string;
  validThrough?: string;
  industry?: string;
};

export const buildJobPostingSchema = (input: JobPostingInput) => {
  const cities = input.cities.length ? input.cities : ['Россия'];
  const jobLocation = cities.map((city) => {
    const region = getAddressRegion(city);
    return {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(city !== 'Россия' ? { addressLocality: city } : {}),
        ...(region ? { addressRegion: region } : {}),
        addressCountry: 'RU',
      },
    };
  });

  const employmentType = mapEmploymentTypeToSchema(input.employmentTypeLabel);

  const baseSalary: Record<string, unknown> | undefined = (() => {
    if (input.baseSalaryMonthly && input.baseSalaryMonthly > 0) {
      return {
        '@type': 'MonetaryAmount',
        currency: input.currency || 'RUB',
        value: {
          '@type': 'QuantitativeValue',
          maxValue: input.baseSalaryMonthly,
          unitText: 'MONTH',
        },
      };
    }
    if (input.hourlyRate && input.hourlyRate > 0) {
      return {
        '@type': 'MonetaryAmount',
        currency: input.currency || 'RUB',
        value: {
          '@type': 'QuantitativeValue',
          value: input.hourlyRate,
          unitText: 'HOUR',
        },
      };
    }
    return undefined;
  })();

  return {
    '@type': 'JobPosting',
    title: input.title,
    description: input.description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'КурьерОк',
      value: input.slug,
    },
    datePosted: input.datePosted,
    ...(input.validThrough ? { validThrough: input.validThrough } : {}),
    employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: input.company,
      sameAs: input.companyUrl,
      ...(input.companyLogo ? { logo: input.companyLogo } : {}),
    },
    jobLocation,
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'Russia',
    },
    directApply: input.hasApplyLink,
    ...(input.hasApplyLink && input.applyLink && input.applyLink !== '#'
      ? { url: input.applyLink }
      : {}),
    ...(input.benefits ? { jobBenefits: input.benefits } : {}),
    ...(input.qualifications ? { qualifications: input.qualifications } : {}),
    industry: input.industry || 'Курьерская доставка',
    occupationalCategory: '53-3031 Driver/Sales Workers',
    experienceRequirements: {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: 0,
    },
    ...(baseSalary ? { baseSalary } : {}),
  };
};

export type PlaceSchemaInput = {
  city: string;
  pageUrl: string;
  description?: string;
};

export const buildPlaceSchema = ({ city, pageUrl, description }: PlaceSchemaInput) => {
  const region = getAddressRegion(city);
  return {
    '@type': 'Place',
    name: `Работа курьером в ${city}`,
    url: pageUrl,
    ...(description ? { description } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      ...(region ? { addressRegion: region } : {}),
      addressCountry: 'RU',
    },
  };
};
