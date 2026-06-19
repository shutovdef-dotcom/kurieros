const languageMeta = {
	ru: { name: 'Русский', flag: '🇷🇺' },
	uz: { name: "O'zbek", flag: '🇺🇿' },
	tg: { name: 'Тоҷикӣ', flag: '🇹🇯' },
	ky: { name: 'Кыргызча', flag: '🇰🇬' },
	hy: { name: 'Հայերեն', flag: '🇦🇲' },
	kk: { name: 'Қазақ', flag: '🇰🇿' },
	az: { name: 'Azərbaycan', flag: '🇦🇿' },
	uk: { name: 'Українська', flag: '🇺🇦' },
	be: { name: 'Беларуская', flag: '🇧🇾' },
	hi: { name: 'हिन्दी', flag: '🇮🇳' },
	vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
	zh: { name: '中文', flag: '🇨🇳' },
};

const safeLocalStorage = {
	get(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Storage can throw in Safari private mode / restricted WebViews.
		}
	},
};

const roots = Array.from(document.querySelectorAll('[data-lang-switcher]'));
if (roots.length) {
	const defaultLang = 'ru';

	function getSafeLang(lang) {
		return languageMeta[lang] ? lang : defaultLang;
	}

	function getCurrentLang() {
		return getSafeLang(window.kurieros_i18n?.currentLang || safeLocalStorage.get('site-lang') || defaultLang);
	}

	roots.forEach((root) => {
		if (root.dataset.ready === 'true') return;
		root.dataset.ready = 'true';

		const toggle = root.querySelector('[data-lang-toggle]');
		const dropdown = root.querySelector('[data-lang-dropdown]');
		const flagEl = root.querySelector('[data-current-lang-flag]');
		const codeEl = root.querySelector('[data-current-lang-code]');
		const options = Array.from(root.querySelectorAll('[data-lang-option]'));
		if (!toggle || !dropdown || !flagEl || !codeEl) return;

		function closeDropdown() {
			dropdown.hidden = true;
			toggle.setAttribute('aria-expanded', 'false');
		}

		function toggleDropdown() {
			const willOpen = dropdown.hidden;
			dropdown.hidden = !willOpen;
			toggle.setAttribute('aria-expanded', String(willOpen));
		}

		function updateUI(lang) {
			const safeLang = getSafeLang(lang);
			const meta = languageMeta[safeLang] || languageMeta[defaultLang];

			flagEl.textContent = meta.flag;
			codeEl.textContent = safeLang.toUpperCase();
			toggle.setAttribute('aria-label', `Сменить язык, выбран ${meta.name}`);

			options.forEach((option) => {
				const isActive = option.getAttribute('data-lang') === safeLang;
				option.classList.toggle('active', isActive);
				option.setAttribute('aria-current', isActive ? 'true' : 'false');
			});
		}

		toggle.addEventListener('click', (event) => {
			event.stopPropagation();
			toggleDropdown();
		});

		options.forEach((option) => {
			option.addEventListener('click', () => {
				const lang = getSafeLang(option.getAttribute('data-lang'));

				if (window.kurieros_i18n) {
					window.kurieros_i18n.setLanguage(lang);
				} else {
					safeLocalStorage.set('site-lang', lang);
					updateUI(lang);
				}

				closeDropdown();
			});
		});

		document.addEventListener('click', (event) => {
			if (!root.contains(event.target)) closeDropdown();
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') closeDropdown();
		});

		window.addEventListener('kurieros:lang-change', (event) => {
			updateUI(event.detail?.lang);
		});

		updateUI(getCurrentLang());
	});
}
