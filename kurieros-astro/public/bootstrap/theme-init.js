(function() {
	var savedTheme = null;
	var savedColorMode = null;

	try {
		savedTheme = localStorage.getItem('site-theme');
		savedColorMode = localStorage.getItem('site-color-mode');
	} catch (_) {
		// localStorage can throw in Safari Private Browsing and restricted WebViews.
	}

	var bodyClass = savedTheme && savedTheme !== 'default'
		? 'theme-' + savedTheme
		: '';
	document.documentElement.dataset.initialTheme = bodyClass;

	var hasSavedMode = savedColorMode === 'dark' || savedColorMode === 'light';
	var systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	var colorMode = hasSavedMode ? savedColorMode : (systemPrefersDark ? 'dark' : 'light');
	var isDark = colorMode === 'dark';

	document.documentElement.dataset.initialColorMode = colorMode;
	document.documentElement.style.colorScheme = colorMode;
	document.documentElement.classList.toggle('dark-mode', isDark);

	(function syncBodyDarkClass() {
		function applyBodyTheme() {
			if (!document.body) return false;
			document.body.className = bodyClass || '';
			document.body.classList.toggle('dark-mode', isDark);
			document.body.dataset.colorMode = colorMode;
			return true;
		}

		if (applyBodyTheme()) return;

		new MutationObserver(function(_records, observer) {
			if (applyBodyTheme()) {
				observer.disconnect();
			}
		}).observe(document.documentElement, { childList: true });
	})();
})();
