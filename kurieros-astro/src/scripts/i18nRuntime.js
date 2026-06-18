const STORAGE_KEY = 'site-lang';
const DEFAULT_LANG = 'ru';
const SESSION_KEY_PREFIX = 'kurieros_vt_';

function readI18nConfig() {
	try {
		return JSON.parse(document.getElementById('kurieros-i18n-config')?.textContent || '{}');
	} catch (_) {
		return {};
	}
}

function createSafeStorage(storage) {
	return {
		get(key) {
			try {
				return storage.getItem(key);
			} catch (_) {
				return null;
			}
		},
		set(key, value) {
			try {
				storage.setItem(key, value);
			} catch (_) {
				// Safari Private Browsing and restricted WKWebViews can reject writes.
			}
		},
	};
}

function onDomReady(callback) {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', callback, { once: true });
		return;
	}
	callback();
}

function initI18nRuntime() {
	const i18nConfig = readI18nConfig();
	const translations = i18nConfig.translations || { ru: {} };
	const supportedLangs = Array.isArray(i18nConfig.supportedLanguages)
		? i18nConfig.supportedLanguages
		: [DEFAULT_LANG];
	const vacancyTranslationsBase = i18nConfig.vacancyTranslationsBase || '/vacancy-translations';
	const vacancyTranslationsVersion = i18nConfig.vacancyTranslationsVersion || '';
	const safeStorage = createSafeStorage(localStorage);
	const loadedFragments = new Set();

	function sessionKey(lang, sourceSlug) {
		return `${SESSION_KEY_PREFIX}${lang}/${sourceSlug}/${vacancyTranslationsVersion}`;
	}

	function loadFragmentFromSession(lang, sourceSlug) {
		try {
			const raw = sessionStorage.getItem(sessionKey(lang, sourceSlug));
			if (!raw) return null;
			return JSON.parse(raw);
		} catch (_) {
			return null;
		}
	}

	function storeFragmentInSession(lang, sourceSlug, fragment) {
		try {
			sessionStorage.setItem(sessionKey(lang, sourceSlug), JSON.stringify(fragment));
		} catch (_) {
			// QuotaExceededError or SecurityError: skip persistence and let the HTTP
			// cache handle repeat visits for the same build-versioned URL.
		}
	}

	function cleanupOldSessionFragments() {
		const cleanupSentinelKey = `${SESSION_KEY_PREFIX}__cleanup_for__`;
		try {
			const lastCleanedVersion = sessionStorage.getItem(cleanupSentinelKey);
			if (lastCleanedVersion === vacancyTranslationsVersion) return;

			const currentSuffix = `/${vacancyTranslationsVersion}`;
			for (let i = sessionStorage.length - 1; i >= 0; i--) {
				const key = sessionStorage.key(i);
				if (key && key.indexOf(SESSION_KEY_PREFIX) === 0
					&& key !== cleanupSentinelKey
					&& !key.endsWith(currentSuffix)) {
					sessionStorage.removeItem(key);
				}
			}
			sessionStorage.setItem(cleanupSentinelKey, vacancyTranslationsVersion);
		} catch (_) {
			// sessionStorage unavailable — nothing to clean.
		}
	}

	function getSafeLang(lang) {
		return supportedLangs.includes(lang) ? lang : DEFAULT_LANG;
	}

	function detectSystemLanguage() {
		const candidates = [];
		if (Array.isArray(navigator.languages)) {
			candidates.push(...navigator.languages);
		}
		if (navigator.language) {
			candidates.push(navigator.language);
		}

		for (const locale of candidates) {
			if (!locale || typeof locale !== 'string') continue;
			const normalizedLocale = locale.trim().toLowerCase();
			if (!normalizedLocale) continue;

			const fullMatch = getSafeLang(normalizedLocale);
			if (fullMatch === normalizedLocale) {
				return fullMatch;
			}

			const baseLang = normalizedLocale.split(/[-_]/)[0];
			const safeBase = getSafeLang(baseLang);
			if (safeBase === baseLang) {
				return safeBase;
			}
		}

		return DEFAULT_LANG;
	}

	function pageHasVacancyTranslationKeys() {
		return Boolean(document.querySelector('[data-t^="vacancies."]'));
	}

	function getVisibleVacancySourceSlugs() {
		const nodes = document.querySelectorAll('[data-vacancy-source-slug]');
		const slugs = new Set();
		nodes.forEach((node) => {
			const slug = node.dataset.vacancySourceSlug;
			if (slug) slugs.add(slug);
		});
		return Array.from(slugs);
	}

	function expandFragment(fragment) {
		if (!fragment || typeof fragment !== 'object') return {};
		if (!('entries' in fragment) && !('defaults' in fragment)
			&& Object.keys(fragment).length > 0) {
			console.warn('[i18n] expandFragment: unexpected fragment shape',
				Object.keys(fragment).slice(0, 3));
		}
		const defaults = fragment.defaults || {};
		const entries = fragment.entries || {};
		const expanded = {};
		for (const id in entries) {
			if (Object.prototype.hasOwnProperty.call(entries, id)) {
				expanded[id] = Object.assign({}, defaults, entries[id]);
			}
		}
		return expanded;
	}

	async function fetchFragment(lang, sourceSlug) {
		const cacheKey = `${lang}/${sourceSlug}`;
		if (loadedFragments.has(cacheKey)) return null;

		const sessionFragment = loadFragmentFromSession(lang, sourceSlug);
		if (sessionFragment) {
			loadedFragments.add(cacheKey);
			return sessionFragment;
		}

		const url = `${vacancyTranslationsBase}/${lang}/${sourceSlug}.json?v=${vacancyTranslationsVersion}`;
		try {
			const response = await fetch(url, { cache: 'force-cache' });
			if (!response.ok) {
				if (response.status >= 400 && response.status < 500) {
					loadedFragments.add(cacheKey);
				}
				window.dispatchEvent(new CustomEvent('kurieros:fragment-load-failed', {
					detail: { lang, sourceSlug, status: response.status, url },
				}));
				return null;
			}
			const fragment = await response.json();
			loadedFragments.add(cacheKey);
			storeFragmentInSession(lang, sourceSlug, fragment);
			return fragment;
		} catch (error) {
			window.dispatchEvent(new CustomEvent('kurieros:fragment-load-failed', {
				detail: { lang, sourceSlug, error: String(error), url },
			}));
			console.warn('Failed to load vacancy translations fragment', lang, sourceSlug, error);
			return null;
		}
	}

	async function ensureVacancyTranslations(lang) {
		if (lang === DEFAULT_LANG || !pageHasVacancyTranslationKeys()) {
			return;
		}
		const slugs = getVisibleVacancySourceSlugs();
		if (slugs.length === 0) return;

		const fragments = await Promise.all(
			slugs.map((slug) => fetchFragment(lang, slug)),
		);

		const langDictionary = translations[lang]
			? translations[lang]
			: structuredClone(translations[DEFAULT_LANG] ?? {});
		const currentVacancies = langDictionary.vacancies || {};
		const merged = { ...currentVacancies };
		for (const fragment of fragments) {
			if (!fragment) continue;
			Object.assign(merged, expandFragment(fragment));
		}
		translations[lang] = {
			...langDictionary,
			vacancies: merged,
		};
	}

	function getNestedValue(obj, path) {
		return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
	}

	function cacheOriginalTranslations() {
		const elements = document.querySelectorAll('[data-t]');
		const contentElements = document.querySelectorAll('[data-t-content]');
		const titleElement = document.querySelector('[data-t-title]');

		elements.forEach((el) => {
			if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
				if (el.dataset.tOriginalPlaceholder === undefined) {
					el.dataset.tOriginalPlaceholder = el.placeholder || '';
				}
				return;
			}

			if (el.dataset.tOriginalText === undefined) {
				el.dataset.tOriginalText = el.textContent || '';
			}
		});

		contentElements.forEach((el) => {
			if (el.dataset.tOriginalContent === undefined) {
				el.dataset.tOriginalContent = el.getAttribute('content') || '';
			}
		});

		if (titleElement && titleElement.dataset.tOriginalTitle === undefined) {
			titleElement.dataset.tOriginalTitle = titleElement.textContent || document.title || '';
		}
	}

	cleanupOldSessionFragments();
	window.translations = translations;

	const savedLang = safeStorage.get(STORAGE_KEY);
	const initialLang = getSafeLang(savedLang || detectSystemLanguage());
	if (savedLang !== initialLang) {
		safeStorage.set(STORAGE_KEY, initialLang);
	}

	window.kurieros_i18n = {
		currentLang: initialLang,
		ensureVacancyTranslations,

		async setLanguage(lang) {
			lang = getSafeLang(lang);
			this.currentLang = lang;
			safeStorage.set(STORAGE_KEY, lang);
			await this.ensureVacancyTranslations(lang);
			// Guard rapid switches: only the latest requested language may repaint.
			if (this.currentLang !== lang) return;
			this.applyTranslations();
			window.dispatchEvent(new CustomEvent('kurieros:lang-change', { detail: { lang } }));
		},

		applyTranslations() {
			cacheOriginalTranslations();
			const elements = document.querySelectorAll('[data-t]');
			const contentElements = document.querySelectorAll('[data-t-content]');
			const titleElement = document.querySelector('[data-t-title]');
			const lang = getSafeLang(this.currentLang);
			const langData = translations[lang] || translations[DEFAULT_LANG];

			elements.forEach((el) => {
				const key = el.getAttribute('data-t');
				if (!key) {
					return;
				}

				const translation = getNestedValue(langData, key);
				const defaultTranslation = getNestedValue(translations[DEFAULT_LANG], key);

				if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
					const fallback = defaultTranslation ?? el.dataset.tOriginalPlaceholder ?? '';
					const nextValue = translation ?? fallback;
					el.placeholder = nextValue;
					return;
				}

				const fallback = defaultTranslation ?? el.dataset.tOriginalText ?? '';
				const nextValue = translation ?? fallback;
				el.textContent = nextValue;
			});

			contentElements.forEach((el) => {
				const key = el.getAttribute('data-t-content');
				if (!key) {
					return;
				}

				const translation = getNestedValue(langData, key);
				const defaultTranslation = getNestedValue(translations[DEFAULT_LANG], key);
				const fallback = defaultTranslation ?? el.dataset.tOriginalContent ?? '';
				const nextValue = translation ?? fallback;
				el.setAttribute('content', nextValue);
			});

			if (titleElement) {
				const key = titleElement.getAttribute('data-t-title');
				const translation = key ? getNestedValue(langData, key) : undefined;
				const defaultTranslation = key ? getNestedValue(translations[DEFAULT_LANG], key) : undefined;
				const fallback = defaultTranslation ?? titleElement.dataset.tOriginalTitle ?? document.title;
				const nextValue = translation ?? fallback;
				titleElement.textContent = nextValue;
				document.title = nextValue;
			}

			document.documentElement.setAttribute('lang', lang);
		},
	};

	window.kurieros_i18n.ensureVacancyTranslations(window.kurieros_i18n.currentLang)
		.then(() => window.kurieros_i18n.applyTranslations());
}

onDomReady(initI18nRuntime);
