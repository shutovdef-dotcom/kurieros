const VPN_MODAL_SESSION_KEY = 'vpn-modal-shown';

const safeSessionStorage = {
	get(key) {
		try {
			return sessionStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key, value) {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			// Storage can throw in Safari private mode / restricted WebViews.
		}
	},
};

function getVPNModal() {
	return document.getElementById('vpn-modal');
}

function isVPNModalDismissed() {
	return safeSessionStorage.get(VPN_MODAL_SESSION_KEY);
}

let lastFocusedBeforeOpen = null;

function isVPNModalOpen() {
	return Boolean(getVPNModal()) && !getVPNModal().classList.contains('hidden');
}

function showVPNModal() {
	const modal = getVPNModal();
	if (!modal || isVPNModalDismissed()) return;
	lastFocusedBeforeOpen = document.activeElement;
	modal.classList.remove('hidden');
	requestAnimationFrame(() => {
		document.getElementById('btn-vpn-ok')?.focus();
	});
}

function hideVPNModal() {
	getVPNModal()?.classList.add('hidden');
	safeSessionStorage.set(VPN_MODAL_SESSION_KEY, 'true');
	if (lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') {
		lastFocusedBeforeOpen.focus();
		lastFocusedBeforeOpen = null;
	}
}

function trapFocus(event) {
	if (!isVPNModalOpen()) return;
	if (event.key === 'Escape') {
		event.preventDefault();
		hideVPNModal();
		return;
	}
	if (event.key !== 'Tab') return;
	const modal = getVPNModal();
	const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
	if (focusable.length === 0) return;
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
}

function focusCitySelector() {
	const selector = document.querySelector('.city-selector-container') || document.getElementById('city-select');
	if (!selector) return false;

	selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
	setTimeout(() => document.getElementById('city-select')?.focus(), 400);
	return true;
}

function shouldAutoPromptRegion() {
	const selector = document.querySelector('.city-selector-container') || document.getElementById('city-select');
	if (!selector) return false;

	return selector.getAttribute('data-region-autoprompt') !== 'manual-only';
}

function checkVPN(data) {
	const hasInlineCitySelector = Boolean(document.getElementById('city-select') || document.querySelector('.city-selector-container'));
	if (data?.country && data.country !== 'RU' && hasInlineCitySelector && shouldAutoPromptRegion()) {
		showVPNModal();
	}
}

document.addEventListener('DOMContentLoaded', () => {
	window.addEventListener('kurieros:manual-city-required', showVPNModal);

	window.addEventListener('kurieros:region-detected', (event) => {
		checkVPN(event.detail);
	});

	if (window.kurieros_user) {
		checkVPN(window.kurieros_user);
	}

	document.getElementById('btn-vpn-ok')?.addEventListener('click', () => {
		hideVPNModal();

		if (!focusCitySelector()) {
			window.location.href = '/cities/';
		}
	});

	document.getElementById('btn-vpn-close')?.addEventListener('click', hideVPNModal);

	getVPNModal()?.addEventListener('click', (event) => {
		if (event.target === getVPNModal()) {
			hideVPNModal();
		}
	});

	document.addEventListener('keydown', trapFocus);
});
