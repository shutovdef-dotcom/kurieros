(function () {
	var configElement = document.getElementById('kurerok-analytics-config');
	if (!configElement) return;

	var config = {};
	try {
		config = JSON.parse(configElement.textContent || '{}');
	} catch {
		return;
	}

	var ga4MeasurementId = String(config.ga4MeasurementId || '').trim();
	var yandexMetrikaId = String(config.yandexMetrikaId || '').trim();

	if (window.__kurerokSkipAnalytics) {
		if (ga4MeasurementId) {
			window.gtag = function () {};
		}
		return;
	}

	if (ga4MeasurementId) {
		var gtagScript = document.createElement('script');
		gtagScript.async = true;
		gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4MeasurementId);
		document.head.appendChild(gtagScript);

		window.dataLayer = window.dataLayer || [];
		function gtag() {
			window.dataLayer.push(arguments);
		}
		gtag('js', new Date());
		gtag('config', ga4MeasurementId, {
			anonymize_ip: true,
		});
		window.gtag = gtag;
	}

	if (yandexMetrikaId) {
		(function (m, e, t, r, i, k, a) {
			m[i] = m[i] || function () {
				(m[i].a = m[i].a || []).push(arguments);
			};
			m[i].l = 1 * new Date();
			for (var j = 0; j < document.scripts.length; j += 1) {
				if (document.scripts[j].src === r) return;
			}
			k = e.createElement(t);
			a = e.getElementsByTagName(t)[0];
			k.async = 1;
			k.src = r;
			a.parentNode.insertBefore(k, a);
		})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

		ym(Number(yandexMetrikaId), 'init', {
			clickmap: true,
			trackLinks: true,
			accurateTrackBounce: true,
			webvisor: true,
		});
	}
})();
