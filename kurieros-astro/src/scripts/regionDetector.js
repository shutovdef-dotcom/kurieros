(async function detectRegion() {
	if (window.kurieros_user) return;

	if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
		return;
	}

	async function fetchWithTimeout(resource, options = {}) {
		const { timeout = 5000 } = options;
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeout);
		// Keep timeout cleanup on both success and failure so fallback requests do
		// not leave dangling timers referencing settled controllers.
		try {
			return await fetch(resource, { ...options, signal: controller.signal });
		} finally {
			clearTimeout(id);
		}
	}

	function normalizeGeoData(raw) {
		if (!raw) return null;

		if (raw.country) {
			return {
				city: raw.city,
				country: raw.country,
				country_name: raw.country_name,
			};
		}

		if (raw.success !== false && raw.country_code) {
			return {
				city: raw.city,
				country: raw.country_code,
				country_name: raw.country,
			};
		}

		return null;
	}

	let data = null;
	try {
		const res = await fetchWithTimeout('https://ipapi.co/json/');
		if (res.ok) {
			data = normalizeGeoData(await res.json());
		}
	} catch {
		try {
			const res = await fetchWithTimeout('https://ipwho.is/');
			if (res.ok) {
				data = normalizeGeoData(await res.json());
			}
		} catch {
			// Geo-IP is best-effort; city selector and VPN modal handle manual fallback.
		}
	}

	if (data) {
		window.kurieros_user = data;
		window.dispatchEvent(new CustomEvent('kurieros:region-detected', { detail: data }));
	}
})();
