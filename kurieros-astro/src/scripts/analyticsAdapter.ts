export type AnalyticsValue = number | string;
export type AnalyticsPayload = Record<string, unknown>;

export type AnalyticsEventName =
	| 'apply_click'
	| 'apply_redirect_start'
	| 'calculator_submit'
	| 'compare_toggle'
	| 'grid_city_select'
	| 'grid_filter_change'
	| 'grid_reveal_more'
	| 'ozon_lead_open'
	| 'ozon_lead_submit'
	| 'vacancy_open';

export type AnalyticsDimensions = {
	page_type: string;
	landing_cluster: string;
	indexability_reason: string;
	source_slug: string;
	company: string;
	city: string;
	transport: string;
};

export type AnalyticsRuntime = {
	gtag?: (...args: unknown[]) => void;
	ym?: (...args: unknown[]) => void;
	metrikaId?: number;
	pageDimensions?: Partial<AnalyticsDimensions>;
	disabled?: boolean;
};

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		ym?: (...args: unknown[]) => void;
		__kurerokSkipAnalytics?: boolean;
	}
}

const DIMENSION_KEYS = [
	'page_type',
	'landing_cluster',
	'indexability_reason',
	'source_slug',
	'company',
	'city',
	'transport',
] as const satisfies ReadonlyArray<keyof AnalyticsDimensions>;

const EVENT_KEYS: Record<AnalyticsEventName, readonly string[]> = {
	apply_click: [
		'vacancy_id',
		'vacancy_slug',
		'salary_max',
		'employment_type',
		'card_position',
		'partner_domain',
		'cta_position',
	],
	apply_redirect_start: [
		'apply_slug',
		'vacancy_slug',
		'partner_domain',
		'delay_ms',
	],
	calculator_submit: [
		'hours_per_day',
		'days_per_week',
		'days_per_month',
		'result_monthly',
		'source',
	],
	compare_toggle: [
		'vacancy_id',
		'vacancy_slug',
		'salary_max',
		'employment_type',
		'card_position',
		'compare_state',
	],
	grid_city_select: [
		'listing_path',
		'rendered_count',
		'remaining_count',
		'total_count',
		'batch_size',
		'city_slug',
		'filter_name',
		'filter_value',
	],
	grid_filter_change: [
		'listing_path',
		'rendered_count',
		'remaining_count',
		'total_count',
		'batch_size',
		'city_slug',
		'filter_name',
		'filter_value',
	],
	grid_reveal_more: [
		'listing_path',
		'rendered_count',
		'remaining_count',
		'total_count',
		'batch_size',
		'next_batch_url',
	],
	ozon_lead_open: [
		'vacancy_slug',
		'cta_position',
	],
	ozon_lead_submit: [
		'vacancy_slug',
		'cta_position',
	],
	vacancy_open: [
		'vacancy_id',
		'vacancy_slug',
		'salary_max',
		'employment_type',
		'card_position',
		'click_position',
		'destination_path',
	],
};

const DEFAULT_DIMENSIONS: AnalyticsDimensions = {
	page_type: 'other',
	landing_cluster: 'other',
	indexability_reason: 'unknown',
	source_slug: '',
	company: '',
	city: '',
	transport: '',
};

const EMAIL_LIKE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const MAX_STRING_LENGTH = 160;

const looksLikePhone = (value: string): boolean => {
	const digits = value.replace(/\D/g, '');
	return digits.length >= 10;
};

const sanitizeValue = (value: unknown): AnalyticsValue | undefined => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined;
	}
	if (typeof value !== 'string') return undefined;

	const normalized = value.trim().slice(0, MAX_STRING_LENGTH);
	if (!normalized) return '';
	if (EMAIL_LIKE.test(normalized) || looksLikePhone(normalized)) return undefined;
	return normalized;
};

const classifyPath = (pathname: string): Pick<AnalyticsDimensions, 'page_type' | 'landing_cluster'> => {
	const path = pathname.split(/[?#]/, 1)[0].replace(/\/{2,}/g, '/');

	if (path === '/' || path === '') return { page_type: 'home', landing_cluster: 'home' };
	if (path.startsWith('/apply/')) return { page_type: 'apply_redirect', landing_cluster: 'apply' };
	if (path.startsWith('/v/')) return { page_type: 'vacancy_detail', landing_cluster: 'vacancy' };
	if (path.startsWith('/metro/')) return { page_type: 'listing', landing_cluster: 'metro' };
	if (/^\/rabota-kurerom-(?:1[4-8]-let|dlya-studentov|shkolnik)/.test(path)) {
		return { page_type: 'listing', landing_cluster: 'age' };
	}
	if ([
		'/rabota-peshim-kurerom/',
		'/rabota-avtokurerom/',
		'/rabota-velokurerom/',
	].includes(path)) {
		return { page_type: 'listing', landing_cluster: 'transport' };
	}
	if (path === '/podrabotka-kurerom/') {
		return { page_type: 'listing', landing_cluster: 'schedule' };
	}
	if (path.startsWith('/rabota-kurerom-')) {
		return { page_type: 'listing', landing_cluster: 'city_or_category' };
	}
	if (path.startsWith('/companies/')) return { page_type: 'company', landing_cluster: 'employer' };
	if (path.startsWith('/guide/')) return { page_type: 'content', landing_cluster: 'guide' };
	if (path.startsWith('/blog/')) return { page_type: 'content', landing_cluster: 'blog' };
	if (path.startsWith('/otzyvy/')) return { page_type: 'content', landing_cluster: 'reviews' };
	if (path.startsWith('/compare/')) return { page_type: 'tool', landing_cluster: 'compare' };
	if (path.startsWith('/calculator/')) return { page_type: 'tool', landing_cluster: 'calculator' };

	return { page_type: 'other', landing_cluster: 'other' };
};

export const resolveAnalyticsPageDimensions = (
	pathname: string,
	indexabilityReason = 'unknown',
): AnalyticsDimensions => ({
	...DEFAULT_DIMENSIONS,
	...classifyPath(pathname),
	indexability_reason: indexabilityReason || 'unknown',
});

export const buildSafeAnalyticsPayload = (
	eventName: AnalyticsEventName,
	payload: AnalyticsPayload = {},
	pageDimensions: Partial<AnalyticsDimensions> = {},
): Record<string, AnalyticsValue> => {
	const mergedDimensions = {
		...DEFAULT_DIMENSIONS,
		...pageDimensions,
		...Object.fromEntries(DIMENSION_KEYS.map((key) => [key, payload[key] ?? pageDimensions[key]])),
	};
	const safePayload: Record<string, AnalyticsValue> = {};

	for (const key of DIMENSION_KEYS) {
		const rawValue = mergedDimensions[key];
		const value = typeof rawValue === 'string' ? sanitizeValue(rawValue) : undefined;
		safePayload[key] = value ?? '';
	}

	for (const key of EVENT_KEYS[eventName]) {
		const value = sanitizeValue(payload[key]);
		if (value !== undefined) safePayload[key] = value;
	}

	return safePayload;
};

const readMetrikaId = (): number | undefined => {
	const configElement = document.getElementById('kurerok-analytics-config');
	if (!configElement) return undefined;
	try {
		const config = JSON.parse(configElement.textContent || '{}') as { yandexMetrikaId?: unknown };
		const value = Number(config.yandexMetrikaId);
		return Number.isSafeInteger(value) && value > 0 ? value : undefined;
	} catch {
		return undefined;
	}
};

const getIndexabilityReason = (): string => {
	const vacancyPage = document.querySelector<HTMLElement>('.vacancy-page[data-vacancy-indexability]');
	if (vacancyPage?.dataset.vacancyIndexability) return vacancyPage.dataset.vacancyIndexability;
	const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content || '';
	return /\bnoindex\b/i.test(robots) ? 'page_noindex' : 'indexable';
};

export const getCurrentAnalyticsDimensions = (): AnalyticsDimensions => {
	const dimensions = resolveAnalyticsPageDimensions(window.location.pathname, getIndexabilityReason());
	const vacancyPage = document.querySelector<HTMLElement>('.vacancy-page');
	if (!vacancyPage) return dimensions;

	return {
		...dimensions,
		source_slug: vacancyPage.dataset.vacancySourceSlug || '',
		company: vacancyPage.dataset.analyticsCompany || '',
		city: vacancyPage.dataset.analyticsCity || '',
		transport: vacancyPage.dataset.analyticsTransport || '',
	};
};

const getBrowserRuntime = (): AnalyticsRuntime => ({
	gtag: window.gtag,
	ym: window.ym,
	metrikaId: readMetrikaId(),
	pageDimensions: getCurrentAnalyticsDimensions(),
	disabled: Boolean(window.__kurerokSkipAnalytics),
});

export const trackEvent = (
	eventName: AnalyticsEventName,
	payload: AnalyticsPayload = {},
	runtimeOverride?: AnalyticsRuntime,
): void => {
	const runtime = runtimeOverride ?? getBrowserRuntime();
	if (runtime.disabled) return;

	const safePayload = buildSafeAnalyticsPayload(eventName, payload, runtime.pageDimensions);

	if (typeof runtime.gtag === 'function') {
		try {
			runtime.gtag('event', eventName, safePayload);
		} catch {
			/* One analytics provider must never block the other. */
		}
	}

	if (
		typeof runtime.ym === 'function' &&
		Number.isSafeInteger(runtime.metrikaId) &&
		(runtime.metrikaId ?? 0) > 0
	) {
		try {
			runtime.ym(runtime.metrikaId, 'reachGoal', eventName, safePayload);
		} catch {
			/* Analytics failures must not affect the product flow. */
		}
	}
};
