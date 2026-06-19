// Main JobGrid browser controller.
//
// Extracted from JobGrid.astro IIFE #1 during the 2026-06-14
// code-health plan. It intentionally reads all page-specific state
// from DOM/data-* attributes so the Astro component can keep only
// server-side filtering, markup, and styles.
import { safeLocalStorage } from './safeStorage.js';
import { stripEventHandlers } from './sanitize.js';
(function () {
const gridConfig = document.getElementById('jobs-grid')?.dataset || {};
const initialCity = gridConfig.initialCity || '';
const initialSearch = gridConfig.initialSearch || '';

// Source of truth: `MAX_COMPARE_IDS` in src/scripts/compare/compareList.ts.
// This browser controller still carries a local literal so the grid can
// initialise without depending on compare page code. Keep this value in
// sync with compareList.ts (tests/compareListParity.test.ts pins it).
const MAX_COMPARE_IDS = 4;
let compareList = [];
let selectedCity = initialCity || '';
const normalizedInitialSearch = initialSearch.toLowerCase();
const COMPARE_BOUND_ATTR = 'data-compare-bound';

function parseStoredCompareList() {
	try {
		const rawList = JSON.parse(safeLocalStorage.get('compareList') || '[]');
		if (!Array.isArray(rawList)) return [];

		return rawList
			.map((id) => Number.parseInt(String(id), 10))
			.filter((id) => Number.isFinite(id));
	} catch {
		return [];
	}
}

function normalizeCompareList(ids) {
	// `.slice(0, MAX_COMPARE_IDS)` here is a DEFENSIVE cap on whatever is
	// already in localStorage (corrupt / hand-edited / pre-cap legacy
	// data) — it is NOT the add-overflow path. A fresh "add to compare"
	// that overflows is handled by toggleCompare, which drops the OLDEST
	// id. On already-capped storage this slice is a no-op; on tampered
	// storage there is no "newest" to honour, so a head-truncation is
	// the correct, predictable behaviour.
	return ids
		.filter((id, index, list) => list.indexOf(id) === index)
		.slice(0, MAX_COMPARE_IDS);
}

function syncCompareList({ emitEvent = true } = {}) {
	const rawList = parseStoredCompareList();
	const normalizedList = normalizeCompareList(rawList);
	compareList = normalizedList;

	if (JSON.stringify(rawList) !== JSON.stringify(normalizedList)) {
		safeLocalStorage.set('compareList', JSON.stringify(normalizedList));
		if (emitEvent) {
			window.dispatchEvent(new CustomEvent('compareUpdate'));
		}
	}

	return normalizedList;
}

function getTranslation(key, defaultText) {
	const lang = window.kurieros_i18n?.currentLang || 'ru';
	const dict = window.translations ? (window.translations[lang] || window.translations['ru']) : null;
	if (!dict) return defaultText;
	return key.split('.').reduce((prev, curr) => prev && prev[curr], dict) || defaultText;
}

function getCompareButtonLabel(isActive) {
	return isActive
		? `<span data-t="job.in_compare">${getTranslation('job.in_compare', 'В сравнении')}</span> ✓`
		: `<span data-t="job.compare">${getTranslation('job.compare', '+ Сравнить')}</span>`;
}

function setCompareButtonState(button, isActive) {
	if (!button) return;
	button.classList.toggle('active', isActive);
	button.innerHTML = getCompareButtonLabel(isActive);
}

function matchesSearch(card, searchTerm) {
	if (!searchTerm) return true;

	const searchText = (card.dataset.searchText || '').toLowerCase();
	const title = card.querySelector('.job-title')?.textContent?.toLowerCase() || '';
	const company = card.querySelector('.company-name')?.textContent?.toLowerCase() || '';
	const location = (card.dataset.location || '').toLowerCase();

	return searchText.includes(searchTerm)
		|| title.includes(searchTerm)
		|| company.includes(searchTerm)
		|| location.includes(searchTerm);
}

function mapAgeFilterToTag(value) {
	if (value === '16plus') return '16plus';
	if (value === '18plus') return '18+';
	return 'all';
}

function hasTag(card, tag) {
	if (!tag || tag === 'all') return true;
	const tags = (card.dataset.tags || '')
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);

	return tags.includes(tag.toLowerCase());
}

// City-key helpers — the browser-controller twin of `normalizeCityKey` (owned by
// `src/utils/cities.ts`) and `splitLocationKeys` (owned by
// `src/utils/jobFilters.ts`, which builds on the re-exported
// `normalizeCityKey`). This keeps the logic ported verbatim. The two
// MUST behave identically: lowercase +
// ё→е + NBSP/narrow-NBSP/figure-space repair + em-dash→hyphen +
// whitespace collapse + dash trimming, then a comma-split into the
// set of cities a `job.location` covers (rare «Алнаши, Вавож» rows).
function normalizeCityKey(value) {
	return String(value || '')
		.replace(/[   ]/g, ' ')
		.replace(/[‐-―]/g, '-')
		.replace(/\s+/g, ' ')
		.replace(/\s*-\s*/g, '-')
		.trim()
		.toLowerCase()
		.replace(/ё/g, 'е');
}
function splitLocationCityKeys(location) {
	return String(location || '')
		.split(',')
		.map((part) => normalizeCityKey(part))
		.filter((key) => key.length > 0);
}

function toggleCompare(id) {
	syncCompareList({ emitEvent: false });
	const index = compareList.indexOf(id);
	if (index === -1) {
		if (compareList.length >= MAX_COMPARE_IDS) {
			// Overflow on a fresh add: drop the OLDEST id (`slice(1)`) and
			// append the just-added one. This keeps the job the user just
			// picked — the intuitive behaviour. All compare-list eviction
			// converges on drop-oldest here (audit v5 M10).
			compareList = [...compareList.slice(1), id];
		} else {
			compareList = [...compareList, id];
		}
	} else {
		compareList = compareList.filter((item) => item !== id);
	}

	safeLocalStorage.set('compareList', JSON.stringify(compareList));
	window.dispatchEvent(new CustomEvent('compareUpdate'));

	document.querySelectorAll('.btn-compare').forEach((btn) => {
		const buttonId = Number.parseInt(btn.dataset.id || '', 10);
		setCompareButtonState(btn, compareList.includes(buttonId));
	});
}

function syncCompareButtons(root = document) {
	root.querySelectorAll('.btn-compare').forEach((btn) => {
		const id = Number.parseInt(btn.dataset.id || '', 10);
		setCompareButtonState(btn, compareList.includes(id));
		if (btn.dataset.compareBound === 'true') return;
		btn.dataset.compareBound = 'true';
		btn.setAttribute(COMPARE_BOUND_ATTR, 'true');
		btn.addEventListener('click', (event) => {
			event.preventDefault();
			const currentId = Number.parseInt(btn.dataset.id || '', 10);
			if (Number.isFinite(currentId)) {
				toggleCompare(currentId);
			}
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const ageFilterSelect = document.getElementById('vacancy-age-filter');
	const transportFilterSelect = document.getElementById('vacancy-transport-filter');
	const employmentFilterSelect = document.getElementById('vacancy-employment-filter');
	const citizenshipFilterSelect = document.getElementById('vacancy-citizenship-filter');
	syncCompareList();
	syncCompareButtons(document);

	const grid = document.getElementById('jobs-grid');
	const revealMorePanel = document.getElementById('jobs-grid-reveal-more');
	const revealMoreText = document.getElementById('jobs-grid-reveal-more-text');
	const revealMoreButton = document.getElementById('jobs-grid-reveal-more-btn');
	const cityCache = new Map();
	let activeFetch = 0;
	// Snapshot the server-rendered grid as a cloned DocumentFragment
	// (not an innerHTML string). When the user clears the city or a
	// city fetch fails we re-attach a fresh clone of these nodes —
	// pure DOM API, no string re-parsing, so the «restore» path
	// carries the same trust as the original page render.
	const initialGridNodes = document.createDocumentFragment();
	if (grid) {
		for (const child of Array.from(grid.children)) {
			initialGridNodes.appendChild(child.cloneNode(true));
		}
	}
	// Also snapshot the grid element's own reveal-more state attrs
	// (S5 / audit v3 M12). A city switch overwrites `data-overflow-
	// count` / `data-batch-size` / `data-next-batch-url` with the
	// fetched city's values; on restore we must put the INITIAL values
	// back, otherwise the bottom-nav «Вакансии» reveal logic keeps
	// reading the failed city's stale counts against the restored home grid.
	const initialOverflowCount = grid?.getAttribute('data-overflow-count') || '0';
	const initialBatchSize = grid?.getAttribute('data-batch-size') || '24';
	const initialTotalCount = grid?.getAttribute('data-total-count') || '0';
	const initialNextBatchUrl = grid?.getAttribute('data-next-batch-url') || '';
	function setNextBatchUrl(targetGrid, url) {
		if (!targetGrid) return;
		if (url) {
			targetGrid.setAttribute('data-next-batch-url', url);
		} else {
			targetGrid.removeAttribute('data-next-batch-url');
		}
	}
	function vacancyWord(count) {
		const abs = Math.abs(count) % 100;
		const last = abs % 10;
		if (abs > 10 && abs < 20) return 'вакансий';
		if (last === 1) return 'вакансия';
		if (last >= 2 && last <= 4) return 'вакансии';
		return 'вакансий';
	}
	function countRenderedCards() {
		if (!grid) return 0;
		return Array.from(grid.children).filter((child) => child.classList.contains('job-card')).length;
	}
	function scrollToFirstNewCard(revealed) {
		if (!grid || revealed <= 0) return;
		const cards = grid.querySelectorAll('.job-card');
		const firstNew = cards[cards.length - revealed];
		if (!firstNew) return;
		window.requestAnimationFrame(() => {
			firstNew.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}
	function setRevealMoreBusy(isBusy) {
		if (!revealMoreButton) return;
		if (isBusy) {
			revealMoreButton.setAttribute('aria-disabled', 'true');
			revealMoreButton.textContent = 'Показываем вакансии...';
		} else {
			revealMoreButton.setAttribute('aria-disabled', 'false');
		}
	}
	function updateRevealMoreControls() {
		if (!revealMorePanel) return;
		const remaining = getOverflowCount();
		const hasRemaining = remaining > 0;
		const rendered = countRenderedCards();
		const total = Number.parseInt(grid?.getAttribute('data-total-count') || '', 10)
			|| rendered + remaining;
		const batchSize = Number.parseInt(grid?.getAttribute('data-batch-size') || '24', 10) || 24;
		const nextCount = Math.min(batchSize, remaining);
		const nextBatchHref = grid?.getAttribute('data-next-batch-url') || '#vacancies';
		revealMorePanel.hidden = !hasRemaining;
		if (revealMoreText) {
			revealMoreText.textContent = `${rendered} ${vacancyWord(rendered)} из ${total} ${vacancyWord(total)}`;
		}
		if (revealMoreButton) {
			revealMoreButton.setAttribute('aria-disabled', 'false');
			if (revealMoreButton instanceof HTMLAnchorElement) {
				revealMoreButton.href = nextBatchHref;
			}
			if (hasRemaining) {
				revealMoreButton.textContent = `Показать ещё ${nextCount} ${vacancyWord(nextCount)}`;
			}
		}
	}
	// Re-render the grid from the initial server snapshot — both the
	// child nodes AND the reveal-more state attributes.
	function restoreInitialGrid() {
		if (!grid) return;
		while (grid.firstChild) grid.removeChild(grid.firstChild);
		grid.appendChild(initialGridNodes.cloneNode(true));
		grid.setAttribute('data-overflow-count', initialOverflowCount);
		grid.setAttribute('data-batch-size', initialBatchSize);
		grid.setAttribute('data-total-count', initialTotalCount);
		setNextBatchUrl(grid, initialNextBatchUrl);
		updateRevealMoreControls();
	}

	// Audit H10 / v3 M15 — XSS hardening for fetched city/batch markup.
	// The sanitizer is imported from the tested canonical module now that
	// this controller is bundled instead of inlined in JobGrid.astro.
	// Whitelist-clone the children of a freshly fetched #jobs-grid
	// into the live grid. Replaces the old `innerHTML` assignment:
	// we only adopt nodes we recognise (`.job-card`, the legacy C2
	// overflow `<template>`, and the server's `.no-results` block), clone them
	// via the DOM API (parsed-doc scripts stay inert through a
	// clone), and strip every event-handler attribute before the
	// node enters the live tree.
	function swapGridContent(targetGrid, sourceGrid) {
		while (targetGrid.firstChild) {
			targetGrid.removeChild(targetGrid.firstChild);
		}
		for (const sourceChild of Array.from(sourceGrid.children)) {
			const isJobCard = sourceChild.classList.contains('job-card');
			const isOverflowTpl = sourceChild.tagName === 'TEMPLATE'
				&& sourceChild.classList.contains('jobs-grid-overflow');
			const isNoResults = sourceChild.classList.contains('no-results');
			if (!isJobCard && !isOverflowTpl && !isNoResults) continue;
			const cloned = sourceChild.cloneNode(true);
			stripEventHandlers(cloned);
			targetGrid.appendChild(cloned);
		}
	}

	// QW7 — Render N skeleton cards while a city page is being fetched.
	// Count taken from sessionStorage of last-shown card count (or 6
	// fallback) so the skeleton matches the user's previous view.
	function renderSkeleton(count) {
		if (!grid) return;
		const SKELETON_CARD = '<div class="job-card-skeleton" aria-hidden="true">'
			+ '<div class="job-card-skeleton-top">'
			+ '<div class="job-card-skeleton-row job-card-skeleton-logo"></div>'
			+ '<div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-title"></div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-company"></div>'
			+ '</div>'
			+ '</div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-meta"></div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-cols"></div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-actions"></div>'
			+ '<div class="job-card-skeleton-row job-card-skeleton-actions"></div>'
			+ '</div>';
		const n = Math.max(3, Math.min(count || 6, 12));
		let html = '<div class="job-grid-loading" role="status" aria-live="polite">'
			+ '<span class="job-grid-loading-spinner" aria-hidden="true"></span>'
			+ 'Загружаем вакансии…'
			+ '</div>';
		for (let i = 0; i < n; i++) html += SKELETON_CARD;
		grid.innerHTML = html;
	}

	// S5 / audit v3 M12 — minimal inline notice when a city-grid
	// fetch fails. Without it the failure is silent: the grid
	// quietly falls back to the initial city with no signal to
	// the user. Built with `textContent` (no user input, but
	// XSS-proof by construction) and auto-removed.
	const CITY_FETCH_ERROR_TTL_MS = 6000;
	let cityFetchErrorTimeout = null;
	function showCityFetchError() {
		if (!grid || !grid.parentNode) return;
		let notice = document.getElementById('city-fetch-error');
		if (!notice) {
			notice = document.createElement('div');
			notice.id = 'city-fetch-error';
			notice.className = 'no-filter-match';
			notice.setAttribute('role', 'status');
			notice.setAttribute('aria-live', 'polite');
			grid.parentNode.insertBefore(notice, grid);
		}
		notice.textContent = 'Не удалось загрузить вакансии для города — показаны все вакансии.';
		notice.classList.remove('hidden');
		if (cityFetchErrorTimeout) clearTimeout(cityFetchErrorTimeout);
		cityFetchErrorTimeout = window.setTimeout(() => {
			notice?.classList.add('hidden');
		}, CITY_FETCH_ERROR_TTL_MS);
	}
	function hideCityFetchError() {
		if (cityFetchErrorTimeout) clearTimeout(cityFetchErrorTimeout);
		document.getElementById('city-fetch-error')?.classList.add('hidden');
	}

	let overflowLoadFailed = false;
	function showBatchFetchError() {
		if (!grid || !grid.parentNode) return;
		let notice = document.getElementById('batch-fetch-error');
		if (!notice) {
			notice = document.createElement('div');
			notice.id = 'batch-fetch-error';
			notice.className = 'no-filter-match';
			notice.setAttribute('role', 'status');
			notice.setAttribute('aria-live', 'polite');
			grid.parentNode.insertBefore(notice, grid);
		}
		notice.textContent = 'Не удалось загрузить все вакансии. Проверьте соединение и попробуйте ещё раз.';
		notice.classList.remove('hidden');
	}
	function hideBatchFetchError() {
		document.getElementById('batch-fetch-error')?.classList.add('hidden');
	}

	async function applyCurrentLanguageToDynamicGrid() {
		const i18n = window.kurieros_i18n;
		const lang = i18n?.currentLang || 'ru';
		if (!i18n || lang === 'ru') return;
		await i18n.ensureVacancyTranslations?.(lang);
		if (i18n.currentLang === lang) {
			i18n.applyTranslations?.();
		}
	}

	async function refreshDynamicGrid() {
		syncCompareButtons(grid || document);
		await applyCurrentLanguageToDynamicGrid();
		filterJobs();
	}

	// Fetch the dedicated city-grid fragment endpoint
	// (/api/grid/{slug}/ — audit v2 M14) and clone its
	// already-rendered .jobs-grid children via the DOM API
	// (`swapGridContent`) — preserves Astro scoped styles
	// (data-astro-cid-*) and JobCard markup without duplicating the
	// template in JS, and without the XSS surface of `innerHTML`.
	//
	// The fragment endpoint emits ONLY the `#jobs-grid` element
	// (server-rendered with the same <JobCard> component), so the
	// city switch downloads ~7 KB gzip instead of the ~67 KB full
	// `/rabota-kurerom-{slug}/` page — ~60 KB of nav/hero/footer/
	// CSS/scripts that the old DOMParser path parsed and discarded.
	async function renderJobsForCity(citySlug, cityName) {
		if (!grid) return;
		// Any new city action clears a prior city-fetch-error notice.
		hideCityFetchError();
		if (!citySlug) {
			// User cleared the city — restore initial server-rendered grid.
			restoreInitialGrid();
			await refreshDynamicGrid();
			return;
		}
		const ticket = ++activeFetch;
		let html = cityCache.get(citySlug);
		if (!html) {
			// Show skeleton only when we'll actually hit the network.
			// In-memory cityCache hit → instant grid swap, skeleton
			// would just flash for a frame and feel like a glitch.
			const prevCardCount = grid.querySelectorAll('.job-card').length || 6;
			renderSkeleton(prevCardCount);
			try {
				// Bug1 fix: `no-cache` (was `force-cache`). Browser still
				// uses HTTP cache via conditional GET (If-None-Match /
				// If-Modified-Since → 304 fast path), but doesn't serve
				// stale content after a site re-deploy.
				//
				// M14: hits `/api/grid/{slug}/` — the dedicated fragment
				// endpoint (just the `#jobs-grid` markup, ~7 KB gzip),
				// not the full `/rabota-kurerom-{slug}/` page (~67 KB).
				const res = await fetch(`/api/grid/${citySlug}/`, { cache: 'no-cache' });
				if (!res.ok) throw new Error('HTTP ' + res.status);
				html = await res.text();
				cityCache.set(citySlug, html);
			} catch (err) {
				console.warn('city page fetch failed', err);
				// S5 / audit v3 M12 — restore the INITIAL server grid so
				// the user isn't stuck on the skeleton. `restoreInitialGrid`
				// also puts the initial `data-overflow-count` / `data-batch-
				// size` back, so the bottom-nav reveal logic no longer reads
				// the failed city's stale counts.
				restoreInitialGrid();
				// `restoreInitialGrid` shows the INITIAL grid, not the city
				// the user picked — so re-sync the city <select> and the
				// module-level `selectedCity` back to that initial city,
				// otherwise the selector claims one city while the grid
				// shows another (a silent selector/grid desync).
				selectedCity = initialCity || '';
				const citySelect = document.getElementById('city-select');
				if (citySelect && citySelect.value !== selectedCity) {
					citySelect.value = selectedCity;
				}
				// Re-wire the restored grid (compare buttons + dropdown
				// filters) — the success path does this too.
				await refreshDynamicGrid();
				// Minimal inline notice so the failure isn't silent.
				showCityFetchError();
				return;
			}
		}
		if (ticket !== activeFetch) return; // stale response
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const newGrid = doc.getElementById('jobs-grid');
		if (!newGrid || newGrid.children.length === 0) {
			// Build «no results» fallback with DOM API — citySlug/cityName
			// come from a static map today, but routing this through
			// textContent + property-set href makes the surface XSS-proof
			// even if a future change feeds user-influenced values in.
			const wrap = document.createElement('div');
			wrap.className = 'no-results';

			const heading = document.createElement('h3');
			heading.textContent = `В городе ${String(cityName || citySlug)} нет активных вакансий`;

			const lead = document.createElement('p');
			lead.textContent = 'Полный список доступен на странице города.';

			const link = document.createElement('a');
			link.className = 'btn-primary';
			link.href = `/rabota-kurerom-${encodeURIComponent(citySlug)}/`;
			link.textContent = 'Открыть страницу города';

			wrap.append(heading, lead, link);
			grid.replaceChildren(wrap);
			grid.setAttribute('data-overflow-count', '0');
			grid.setAttribute('data-total-count', '0');
			setNextBatchUrl(grid, '');
			updateRevealMoreControls();
			await applyCurrentLanguageToDynamicGrid();
			return;
		}
		// Audit H10 — DOM-API whitelist clone instead of
		// `grid.innerHTML = newGrid.innerHTML`. `swapGridContent`
		// adopts only recognised nodes and strips every event-handler
		// attribute, so a poisoned `<img onerror=…>` in the fetched
		// city HTML can't execute in the visitor's origin.
		swapGridContent(grid, newGrid);
		// Mirror the fetched city's overflow count + batch size so the
		// bottom-nav «Вакансии» reveal logic (C2) keeps working after
		// the home grid is hot-swapped.
		grid.setAttribute('data-overflow-count', newGrid.getAttribute('data-overflow-count') || '0');
		grid.setAttribute('data-batch-size', newGrid.getAttribute('data-batch-size') || '24');
		grid.setAttribute('data-total-count', newGrid.getAttribute('data-total-count') || '0');
		setNextBatchUrl(grid, newGrid.getAttribute('data-next-batch-url') || '');
		updateRevealMoreControls();
		await refreshDynamicGrid();
	}

	window.addEventListener('kurieros:city-selected', (event) => {
		selectedCity = event.detail?.city || '';
		const slug = event.detail?.slug || '';
		renderJobsForCity(slug, selectedCity);
	});

	// Hub city filter — bead B15 / Decision H. The hub page's <select>
	// dispatches `kurieros:hub-city-filter` with the chosen city name
	// (or '' for "Все города"). Hubs now keep the initial HTML to the
	// first 24 cards, so a specific city filter first materialises all
	// lazy batches from `/api/grid-batch/.../`, then re-runs the existing
	// client-side city pass. The network work happens only after an
	// explicit user action.
	let hubOverflowMaterialised = false;
	window.addEventListener('kurieros:hub-city-filter', async (event) => {
		selectedCity = event.detail?.city || '';
		if (selectedCity && !hubOverflowMaterialised && grid) {
			hubOverflowMaterialised = await ensureAllOverflowLoaded();
			if (!hubOverflowMaterialised) return;
		}
		filterJobs();
	});

	window.addEventListener('storage', (event) => {
		if (event.key !== 'compareList') return;
		syncCompareList({ emitEvent: false });
		syncCompareButtons(document);
	});

	ageFilterSelect?.addEventListener('change', filterJobsAfterOptionalLoad);
	transportFilterSelect?.addEventListener('change', filterJobsAfterOptionalLoad);
	employmentFilterSelect?.addEventListener('change', filterJobsAfterOptionalLoad);
	citizenshipFilterSelect?.addEventListener('change', filterJobsAfterOptionalLoad);

	function hasActiveDropdownFilters() {
		return (
			(ageFilterSelect && ageFilterSelect.value !== 'all') ||
			(transportFilterSelect && transportFilterSelect.value !== 'all') ||
			(employmentFilterSelect && employmentFilterSelect.value !== 'all') ||
			(citizenshipFilterSelect && citizenshipFilterSelect.value !== 'all')
		);
	}

	// see src/utils/jobFilters.ts for the source-of-truth predicate;
	// this is the DOM-side adapter (reads card.dataset.*, layers
	// in age/transport/employment/citizenship dropdown filters on
	// top). The city match uses the same exact, comma-split,
	// normalized semantics as `jobFilters.ts#jobMatches` — ported
	// inline above as `normalizeCityKey` / `splitLocationCityKeys`
		// because this DOM-side adapter intentionally stays browser-only (H12).
	function filterJobs() {
		const term = normalizedInitialSearch;
		const selectedAgeTag = mapAgeFilterToTag(ageFilterSelect?.value || 'all');
		const selectedTransportTag = transportFilterSelect?.value || 'all';
		const employmentValue = employmentFilterSelect?.value || 'all';
		const selectedEmploymentTag = employmentValue === 'all' ? 'all' : 'emp:' + employmentValue;
		const citizenshipValue = citizenshipFilterSelect?.value || 'all';
		const selectedCitizenshipTag = citizenshipValue === 'all' ? 'all' : 'cit:' + citizenshipValue;

		// Two-pass:
		//   1. Mark each card as match/no-match into a Map
		//   2. If at least one match → apply visibility per the map
		//      If zero matches → show every card AND surface the
		//      «no filter match» notice (per UX spec — user must
		//      never land on an empty grid).
		const cards = Array.from(document.querySelectorAll('.job-card'));
		const selectedCityKey = normalizeCityKey(selectedCity);
		const matches = cards.filter((card) => {
			// City match — exact, comma-split, normalized (H12), the
			// inline twin of `jobFilters.ts#jobMatches`. The legacy
			// substring `location.includes(city)` over-matched «Дно»
			// into «Видное»/«Медногорск»; this splits the card's
			// `data-location` into its city keys and requires an
			// exact match. «Вся Россия» rows free-pass any city.
			const cityKeys = splitLocationCityKeys(card.dataset.location);
			const isNationwide = cityKeys.length === 1 && cityKeys[0] === 'вся россия';
			const matchesCity = !selectedCityKey || isNationwide || cityKeys.includes(selectedCityKey);
			const matchesSearchTerm = matchesSearch(card, term);
			const matchesAge = hasTag(card, selectedAgeTag);
			const matchesTransport = hasTag(card, selectedTransportTag);
			const matchesEmployment = hasTag(card, selectedEmploymentTag);
			const matchesCitizenship = hasTag(card, selectedCitizenshipTag);
			return matchesSearchTerm && matchesCity && matchesAge && matchesTransport && matchesEmployment && matchesCitizenship;
		});

		const noMatchNotice = document.getElementById('no-filter-match');
		const anyDropdownActive = hasActiveDropdownFilters();

		if (matches.length === 0 && anyDropdownActive) {
			// Fall back to the full city/category set with a banner.
			cards.forEach((card) => { card.style.display = 'flex'; });
			noMatchNotice?.classList.remove('hidden');
		} else {
			const matchSet = new Set(matches);
			cards.forEach((card) => {
				card.style.display = matchSet.has(card) ? 'flex' : 'none';
			});
			noMatchNotice?.classList.add('hidden');
		}
	}

	let overflowMaterialisedForDropdowns = false;
	async function filterJobsAfterOptionalLoad() {
		if (!overflowMaterialisedForDropdowns && hasActiveDropdownFilters()) {
			overflowMaterialisedForDropdowns = await ensureAllOverflowLoaded();
			if (!overflowMaterialisedForDropdowns) return;
		}
		filterJobs();
	}

	filterJobs();
	updateRevealMoreControls();

	function getOverflowCount() {
		if (!grid) return 0;
		return Number.parseInt(grid.getAttribute('data-overflow-count') || '0', 10) || 0;
	}

	function appendBatchCards(sourceRoot, insertBeforeNode = null) {
		if (!grid || !sourceRoot) return 0;
		const fragment = document.createDocumentFragment();
		let appended = 0;
		for (const sourceChild of Array.from(sourceRoot.children)) {
			if (!sourceChild.classList.contains('job-card')) continue;
			const cloned = sourceChild.cloneNode(true);
			stripEventHandlers(cloned);
			fragment.appendChild(cloned);
			appended += 1;
		}
		if (appended === 0) return 0;
		grid.insertBefore(fragment, insertBeforeNode);
		return appended;
	}

	function revealFromLegacyTemplate() {
		if (!grid) return 0;
		const tpl = grid.querySelector('template.jobs-grid-overflow');
		if (!tpl || !('content' in tpl)) return 0;
		const remaining = tpl.content.querySelectorAll('.job-card');
		if (remaining.length === 0) {
			grid.setAttribute('data-overflow-count', '0');
			setNextBatchUrl(grid, '');
			updateRevealMoreControls();
			return 0;
		}
		const batchSize = Number.parseInt(grid.dataset.batchSize || '24', 10) || 24;
		const take = Math.min(batchSize, remaining.length);
		for (let i = 0; i < take; i++) {
			const card = remaining[i];
			const cloned = card.cloneNode(true);
			stripEventHandlers(cloned);
			grid.insertBefore(cloned, tpl);
			card.remove();
		}
		const next = tpl.content.querySelectorAll('.job-card').length;
		grid.setAttribute('data-overflow-count', String(next));
		if (next === 0) setNextBatchUrl(grid, '');
		updateRevealMoreControls();
		return take;
	}

	let revealMoreInFlight = null;

	async function revealMoreJobsOnce() {
		if (!grid) return 0;

		const legacyRevealed = revealFromLegacyTemplate();
		if (legacyRevealed > 0) {
			await refreshDynamicGrid();
			return legacyRevealed;
		}

		const batchUrl = grid.getAttribute('data-next-batch-url') || '';
		if (!batchUrl) {
			grid.setAttribute('data-overflow-count', '0');
			updateRevealMoreControls();
			return 0;
		}

		let html = '';
		try {
			hideBatchFetchError();
			overflowLoadFailed = false;
			const res = await fetch(batchUrl, { cache: 'no-cache' });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			html = await res.text();
		} catch (err) {
			console.warn('job batch fetch failed', err);
			overflowLoadFailed = true;
			showBatchFetchError();
			return 0;
		}

		const doc = new DOMParser().parseFromString(html, 'text/html');
		const batchRoot = doc.querySelector('.jobs-grid-batch');
		if (!batchRoot) {
			grid.setAttribute('data-overflow-count', '0');
			setNextBatchUrl(grid, '');
			updateRevealMoreControls();
			return 0;
		}

		const revealed = appendBatchCards(batchRoot);
		grid.setAttribute('data-overflow-count', batchRoot.getAttribute('data-overflow-count') || '0');
		setNextBatchUrl(grid, batchRoot.getAttribute('data-next-batch-url') || '');
		updateRevealMoreControls();
		await refreshDynamicGrid();
		return revealed;
	}

	async function revealMoreJobs() {
		if (revealMoreInFlight) return revealMoreInFlight;
		revealMoreInFlight = revealMoreJobsOnce();
		try {
			return await revealMoreInFlight;
		} finally {
			revealMoreInFlight = null;
		}
	}

	async function ensureAllOverflowLoaded() {
		hideBatchFetchError();
		overflowLoadFailed = false;
		let guard = 0;
		while (getOverflowCount() > 0 && guard < 250) {
			const revealed = await revealMoreJobs();
			if (revealed <= 0) break;
			guard += 1;
		}
		return getOverflowCount() === 0 && !overflowLoadFailed;
	}

	window.addEventListener('kurieros:reveal-more-jobs', async () => {
		const revealed = await revealMoreJobs();
		scrollToFirstNewCard(revealed);
	});

	revealMoreButton?.addEventListener('click', async (event) => {
		event.preventDefault();
		if (revealMoreButton.getAttribute('aria-disabled') === 'true') return;
		setRevealMoreBusy(true);
		const revealed = await revealMoreJobs();
		setRevealMoreBusy(false);
		updateRevealMoreControls();
		scrollToFirstNewCard(revealed);
	});
});
})();
