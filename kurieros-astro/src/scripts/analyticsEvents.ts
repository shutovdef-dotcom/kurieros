type AnalyticsValue = number | string | undefined;
type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

const safeNum = (value: unknown): number | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
};

const closestFromEvent = <T extends Element>(
	eventTarget: EventTarget | null,
	selector: string,
): T | null => (
	eventTarget instanceof Element ? eventTarget.closest<T>(selector) : null
);

const textFrom = (root: Element | null, selector: string): string => {
	const node = root?.querySelector(selector);
	return node ? (node.textContent || '').trim() : '';
};

const getCardPosition = (card: Element | null): number | undefined => {
	if (!card) return undefined;
	const cards = Array.from(document.querySelectorAll('.job-card'));
	const visibleCards = cards.filter((item) =>
		item.getClientRects().length > 0 && window.getComputedStyle(item).display !== 'none',
	);
	const visibleIndex = visibleCards.indexOf(card);
	if (visibleIndex !== -1) return visibleIndex + 1;
	const index = cards.indexOf(card);
	return index !== -1 ? index + 1 : undefined;
};

const getGridContext = (): AnalyticsPayload => {
	const grid = document.getElementById('jobs-grid');
	return {
		listing_path: window.location.pathname,
		rendered_count: grid ? grid.querySelectorAll('.job-card').length : undefined,
		remaining_count: safeNum(grid?.getAttribute('data-overflow-count')),
		total_count: safeNum(grid?.getAttribute('data-total-count')),
		batch_size: safeNum(grid?.getAttribute('data-batch-size')),
	};
};

const getDestinationPath = (link: Element | null): string => {
	const href = link?.getAttribute('href') || '';
	if (!href) return '';
	try {
		return new URL(href, window.location.origin).pathname;
	} catch {
		return href;
	}
};

const getCardEventPayload = (
	target: HTMLElement | null,
	card: HTMLElement | null,
): AnalyticsPayload => {
	const cta = target || card?.querySelector<HTMLElement>('[data-apply-cta]') || null;
	const data = cta?.dataset ?? {};
	return {
		vacancy_id: data.applyVacancyId || card?.dataset.id || '',
		vacancy_slug: data.applyVacancySlug || card?.dataset.slug || '',
		source_slug: data.applySourceSlug || card?.dataset.vacancySourceSlug || '',
		company: data.applyCompany || textFrom(card, '.company-name'),
		city: data.applyCity || card?.dataset.location || '',
		transport: data.applyTransport || '',
		salary_max: safeNum(data.applySalaryMax),
		employment_type: data.applyEmployment || '',
		card_position: getCardPosition(card),
	};
};

document.addEventListener('click', (event) => {
	const target = closestFromEvent<HTMLElement>(event.target, '[data-apply-cta]');
	if (!target || typeof window.gtag !== 'function') return;

	const card = target.closest<HTMLElement>('.job-card');
	const payload = getCardEventPayload(target, card);
	let partnerDomain = '';

	try {
		const href = target.getAttribute('href') || '';
		if (href && href.startsWith('http')) {
			partnerDomain = new URL(href).hostname;
		}
	} catch {
		/* same-origin or invalid URL */
	}

	payload.partner_domain = partnerDomain;
	payload.cta_position = target.dataset.applyPosition || '';
	window.gtag('event', 'apply_click', payload);
}, { passive: true });

document.addEventListener('click', (event) => {
	const titleLink = closestFromEvent<HTMLElement>(event.target, '.job-card .job-title');
	if (!titleLink || typeof window.gtag !== 'function') return;

	const card = titleLink.closest<HTMLElement>('.job-card');
	if (!card) return;

	const payload = getCardEventPayload(null, card);
	payload.click_position = 'grid_title';
	payload.destination_path = getDestinationPath(titleLink);
	window.gtag('event', 'vacancy_open', payload);
}, { passive: true });

document.addEventListener('click', (event) => {
	const target = closestFromEvent<HTMLElement>(event.target, '#jobs-grid-reveal-more-btn');
	if (!target || typeof window.gtag !== 'function') return;

	const payload = getGridContext();
	payload.next_batch_url = target.getAttribute('href') || '';
	window.gtag('event', 'grid_reveal_more', payload);
}, { passive: true });

document.addEventListener('click', (event) => {
	const target = closestFromEvent<HTMLElement>(event.target, '.btn-compare[data-id]');
	if (!target || typeof window.gtag !== 'function') return;

	const card = target.closest<HTMLElement>('.job-card');
	const payload = getCardEventPayload(null, card);
	payload.compare_state = target.classList.contains('active') ? 'selected' : 'removed';
	window.gtag('event', 'compare_toggle', payload);
}, { passive: true });

document.addEventListener('change', (event) => {
	const target = closestFromEvent<HTMLSelectElement>(
		event.target,
		'[data-listing-city-filter], #city-select, #vacancy-age-filter, #vacancy-transport-filter, #vacancy-employment-filter, #vacancy-citizenship-filter',
	);
	if (!target || typeof window.gtag !== 'function') return;

	const payload = getGridContext();
	const selectedOption = target.selectedOptions[0];

	if (target.matches('[data-listing-city-filter]')) {
		payload.city = selectedOption?.dataset.name || '';
		payload.city_slug = target.value || '';
		payload.filter_name = 'hub_city';
		payload.filter_value = target.value || 'all';
		window.gtag('event', 'grid_city_select', payload);
		return;
	}

	if (target.id === 'city-select') {
		payload.city = target.value || '';
		payload.filter_name = 'home_city';
		payload.filter_value = target.value || 'all';
		window.gtag('event', 'grid_city_select', payload);
		return;
	}

	const filterNames: Record<string, string> = {
		'vacancy-age-filter': 'age',
		'vacancy-transport-filter': 'transport',
		'vacancy-employment-filter': 'employment',
		'vacancy-citizenship-filter': 'citizenship',
	};
	payload.filter_name = filterNames[target.id] || target.id || '';
	payload.filter_value = target.value || 'all';
	window.gtag('event', 'grid_filter_change', payload);
}, { passive: true });

window.addEventListener('kurieros:calculator-submit', (event) => {
	if (typeof window.gtag !== 'function') return;

	const detail = event instanceof CustomEvent && event.detail ? event.detail : {};
	window.gtag('event', 'calculator_submit', {
		city: detail.city || '',
		transport: detail.transport || '',
		hours_per_day: safeNum(detail.hours_per_day),
		days_per_week: safeNum(detail.days_per_week),
		days_per_month: safeNum(detail.days_per_month),
		result_monthly: safeNum(detail.result_monthly),
		source: detail.source || '',
	});
});

export {};
