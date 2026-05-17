// Bug2 fix — Geo-aware city prefetch on idle.
//
// Extracted verbatim from JobGrid.astro IIFE #3 (Wave 21d, audit v5 M8 /
// TODO H14). This block uses ZERO `define:vars` constants and ZERO
// JobGrid-frontmatter variables — only browser globals — so it is loaded
// as a bundled (non-`is:inline`) ES module the same way `compare.astro`
// loads `compareInit.ts`. The internal `location.pathname === '/'`
// self-gate is the correctness guarantee and is kept exactly as-is: the
// module may be loaded on every listing page and no-ops off the home page.
//
// Подгревает HTTP-кэш браузера для города, в котором, скорее всего,
// находится пользователь — по IANA-таймзоне (`Intl.DateTimeFormat`).
// Не делает сетевых запросов к geo-сервисам, не просит permission,
// работает даже офлайн (timezone берётся из ОС).
//
// Эвристика «VPN или нет»: системная таймзона остаётся настройкой ОС.
// VPN меняет IP, но обычно НЕ трогает Date()/Intl. Поэтому пользователь
// под VPN из-под российской ОС всё равно увидит Europe/Moscow.
//
// Гарды:
//  • prefetch только с home page (на city pages пользователь уже
//    смотрит свой регион, прогрев бесполезен);
//  • respect `Save-Data` header preference (Data Saver mode);
//  • не качать на slow-2g/2g/3g — экономим трафик;
//  • запуск через `requestIdleCallback` после window.load —
//    не конкурирует с основной отрисовкой;
//  • `.catch(() => {})` чтобы 404 на неизвестный slug не падал в консоль.

// `navigator.connection` (Network Information API) and the legacy
// vendor-prefixed twins are not in the standard TS DOM lib; declare the
// minimal shape this module reads. `requestIdleCallback` is likewise not
// in every TS lib target.
interface NetworkInformationLike {
	saveData?: boolean;
	effectiveType?: string;
}
interface NavigatorWithConnection {
	connection?: NetworkInformationLike;
	mozConnection?: NetworkInformationLike;
	webkitConnection?: NetworkInformationLike;
}
interface WindowWithIdleCallback {
	requestIdleCallback?: (
		cb: () => void,
		opts?: { timeout?: number },
	) => number;
}

(function () {
	if (location.pathname !== '/' && location.pathname !== '/index.html') return;

	// Карта IANA timezone → top-3 город этого региона по populated/демографии.
	// Slug'и проверены против Astro-роутов (404'ятся на неизвестных — guard через .catch).
	const TZ_TO_CITIES: Record<string, string[]> = {
		'Europe/Moscow':       ['moskva', 'sankt-peterburg', 'nizhniy-novgorod'],
		'Europe/Kaliningrad':  ['kaliningrad'],
		'Europe/Samara':       ['samara', 'ulyanovsk'],
		'Europe/Volgograd':    ['volgograd'],
		'Europe/Saratov':      ['saratov'],
		'Europe/Astrakhan':    ['astrahan'],
		'Europe/Ulyanovsk':    ['ulyanovsk'],
		'Europe/Kirov':        ['kirov'],
		'Asia/Yekaterinburg':  ['ekaterinburg', 'chelyabinsk', 'ufa'],
		'Asia/Omsk':           ['omsk'],
		'Asia/Novosibirsk':    ['novosibirsk', 'tomsk'],
		'Asia/Novokuznetsk':   ['novokuznetsk'],
		'Asia/Krasnoyarsk':    ['krasnoyarsk'],
		'Asia/Irkutsk':        ['irkutsk'],
		'Asia/Yakutsk':        ['yakutsk'],
		'Asia/Vladivostok':    ['vladivostok'],
		'Asia/Sakhalin':       ['yuzhno-sahalinsk'],
		'Asia/Magadan':        ['magadan'],
		'Asia/Kamchatka':      ['petropavlovsk-kamchatskiy'],
		'Asia/Anadyr':         ['anadyr'],
		'Asia/Chita':          ['chita']
	};
	// Fallback для не-российских таймзон (туристы / диаспора) —
	// топ-3 русских города. Без него пользователь из Тбилиси
	// (Asia/Tbilisi) увидит cold-cache на любой клик.
	const DEFAULT_TARGETS = ['moskva', 'sankt-peterburg', 'nizhniy-novgorod'];

	function getTargets() {
		try {
			const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (TZ_TO_CITIES[tz]) return TZ_TO_CITIES[tz];
		} catch (_) {
			/* Intl недоступен — древние браузеры */
		}
		return DEFAULT_TARGETS;
	}

	function shouldPrefetch() {
		const nav = navigator as Navigator & NavigatorWithConnection;
		const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
		if (!conn) return true; // не знаем — пробуем
		if (conn.saveData) return false; // Data Saver включён
		if (conn.effectiveType && /(slow-2g|2g|3g)/.test(conn.effectiveType)) return false;
		return true;
	}

	function prefetchOnIdle() {
		if (!shouldPrefetch()) return;
		const targets = getTargets().slice(0, 3); // максимум 3 × ~7KB gzip ≈ 21KB

		const idle = (window as Window & WindowWithIdleCallback).requestIdleCallback
			|| function (cb: () => void) { return setTimeout(cb, 1500); };
		idle(function () {
			targets.forEach(function (slug) {
				// M14: прогреваем `/api/grid/{slug}/` — тот же лёгкий
				// fragment-эндпоинт, что и `renderJobsForCity` фетчит при
				// выборе города (раньше качали полную ~67 KB страницу).
				// `cache: 'no-cache'` — браузер ставит response в кэш с
				// валидацией. Когда пользователь выберет город,
				// renderJobsForCity тоже использует 'no-cache' →
				// условный GET → 304 → instant подмена грида.
				fetch('/api/grid/' + slug + '/', {
					cache: 'no-cache',
					credentials: 'same-origin'
				}).catch(function () { /* 404 на неизвестный slug — ОК */ });
			});
		}, { timeout: 3000 });
	}

	if (document.readyState === 'complete') {
		prefetchOnIdle();
	} else {
		window.addEventListener('load', prefetchOnIdle, { once: true });
	}
})();
