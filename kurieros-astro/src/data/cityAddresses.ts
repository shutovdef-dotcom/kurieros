/**
 * City-level postal addresses used to fill the `PostalAddress` inside
 * the JobPosting `jobLocation` schema.
 *
 * The site is an aggregator — we don't have per-vacancy street
 * addresses — so we use synthetic city-centre addresses (well-known
 * landmarks + central postal codes) to satisfy Google's expectation
 * of a complete `PostalAddress` (streetAddress + postalCode +
 * addressRegion) on a JobPosting.
 *
 * For cities not in the explicit map, `getCityPostalAddress` returns
 * a sensible fallback (street «Центр города», no postal code, region
 * = city name) so the schema stays valid without inventing
 * potentially-wrong postal codes.
 *
 * Used by: src/utils/schema.ts → buildJobPostingSchema().
 */

export type CityPostalAddress = {
	streetAddress: string;
	postalCode?: string;
	addressRegion: string;
};

const CITY_ADDRESSES: Readonly<Record<string, CityPostalAddress>> = {
	'Москва': {
		streetAddress: 'Красная площадь, 1',
		postalCode: '109012',
		addressRegion: 'Москва',
	},
	'Санкт-Петербург': {
		streetAddress: 'Невский проспект, 1',
		postalCode: '191186',
		addressRegion: 'Санкт-Петербург',
	},
	'Новосибирск': {
		streetAddress: 'Красный проспект, 1',
		postalCode: '630007',
		addressRegion: 'Новосибирская область',
	},
	'Екатеринбург': {
		streetAddress: 'Площадь 1905 года, 1',
		postalCode: '620014',
		addressRegion: 'Свердловская область',
	},
	'Казань': {
		streetAddress: 'Кремлёвская улица, 1',
		postalCode: '420111',
		addressRegion: 'Республика Татарстан',
	},
	'Нижний Новгород': {
		streetAddress: 'Кремль, корпус 1',
		postalCode: '603082',
		addressRegion: 'Нижегородская область',
	},
	'Челябинск': {
		streetAddress: 'Площадь Революции, 1',
		postalCode: '454091',
		addressRegion: 'Челябинская область',
	},
	'Самара': {
		streetAddress: 'Площадь Куйбышева, 1',
		postalCode: '443010',
		addressRegion: 'Самарская область',
	},
	'Уфа': {
		streetAddress: 'Советская площадь, 1',
		postalCode: '450077',
		addressRegion: 'Республика Башкортостан',
	},
	'Ростов-на-Дону': {
		streetAddress: 'Большая Садовая улица, 1',
		postalCode: '344002',
		addressRegion: 'Ростовская область',
	},
	'Краснодар': {
		streetAddress: 'Красная улица, 1',
		postalCode: '350000',
		addressRegion: 'Краснодарский край',
	},
	'Воронеж': {
		streetAddress: 'Площадь Ленина, 1',
		postalCode: '394018',
		addressRegion: 'Воронежская область',
	},
	'Пермь': {
		streetAddress: 'Комсомольский проспект, 1',
		postalCode: '614000',
		addressRegion: 'Пермский край',
	},
	'Волгоград': {
		streetAddress: 'Площадь Павших Борцов, 1',
		postalCode: '400131',
		addressRegion: 'Волгоградская область',
	},
	'Красноярск': {
		streetAddress: 'Площадь Революции, 1',
		postalCode: '660049',
		addressRegion: 'Красноярский край',
	},
	'Саратов': {
		streetAddress: 'Театральная площадь, 1',
		postalCode: '410012',
		addressRegion: 'Саратовская область',
	},
	'Тюмень': {
		streetAddress: 'улица Ленина, 1',
		postalCode: '625000',
		addressRegion: 'Тюменская область',
	},
	'Омск': {
		streetAddress: 'улица Ленина, 1',
		postalCode: '644099',
		addressRegion: 'Омская область',
	},
	'Тольятти': {
		streetAddress: 'Центральная площадь, 1',
		postalCode: '445020',
		addressRegion: 'Самарская область',
	},
	'Ижевск': {
		streetAddress: 'Центральная площадь, 1',
		postalCode: '426000',
		addressRegion: 'Удмуртская Республика',
	},
	'Барнаул': {
		streetAddress: 'Площадь Советов, 1',
		postalCode: '656049',
		addressRegion: 'Алтайский край',
	},
	'Ульяновск': {
		streetAddress: 'Соборная площадь, 1',
		postalCode: '432063',
		addressRegion: 'Ульяновская область',
	},
	'Иркутск': {
		streetAddress: 'улица Ленина, 1',
		postalCode: '664025',
		addressRegion: 'Иркутская область',
	},
	'Хабаровск': {
		streetAddress: 'Площадь имени Ленина, 1',
		postalCode: '680000',
		addressRegion: 'Хабаровский край',
	},
	'Владивосток': {
		streetAddress: 'Светланская улица, 1',
		postalCode: '690091',
		addressRegion: 'Приморский край',
	},
	'Махачкала': {
		streetAddress: 'Площадь имени Ленина, 1',
		postalCode: '367000',
		addressRegion: 'Республика Дагестан',
	},
	'Ярославль': {
		streetAddress: 'Советская площадь, 1',
		postalCode: '150000',
		addressRegion: 'Ярославская область',
	},
	'Кемерово': {
		streetAddress: 'Советский проспект, 1',
		postalCode: '650000',
		addressRegion: 'Кемеровская область',
	},
	'Томск': {
		streetAddress: 'Площадь Ленина, 1',
		postalCode: '634050',
		addressRegion: 'Томская область',
	},
	'Сочи': {
		streetAddress: 'Курортный проспект, 1',
		postalCode: '354000',
		addressRegion: 'Краснодарский край',
	},
	'Калининград': {
		streetAddress: 'Площадь Победы, 1',
		postalCode: '236000',
		addressRegion: 'Калининградская область',
	},
};

/**
 * Look up a synthetic central address for a city.
 *
 * For cities not in the explicit map we return a generic «Центр
 * города» placeholder + the city name as `addressRegion`. This keeps
 * the schema valid (Google wants non-empty `streetAddress` +
 * `addressRegion`) without inventing wrong postal codes.
 */
export const getCityPostalAddress = (city: string): CityPostalAddress => {
	const known = CITY_ADDRESSES[city];
	if (known) return known;
	return {
		streetAddress: 'Центр города',
		addressRegion: city,
	};
};

export { CITY_ADDRESSES };
