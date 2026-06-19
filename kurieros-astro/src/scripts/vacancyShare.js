// Shared vacancy detail share dropdown controller.
(function () {
	if (typeof navigator.share === 'function') {
		document.querySelectorAll('.share-option-native').forEach((button) => {
			button.removeAttribute('hidden');
		});
	}

	let lastTrigger = null;

	function closeAllDropdowns(restoreFocus) {
		document.querySelectorAll('.share-dropdown:not([hidden])').forEach((dropdown) => {
			dropdown.setAttribute('hidden', '');
			const trigger = dropdown.parentElement
				&& dropdown.parentElement.querySelector('[data-share-vacancy]');
			if (trigger) trigger.setAttribute('aria-expanded', 'false');
		});
		if (restoreFocus && lastTrigger) {
			try {
				lastTrigger.focus();
			} catch (_) {
				// The opener can disappear during navigation or re-rendering.
			}
		}
		lastTrigger = null;
	}

	function announce(wrap, message) {
		const status = wrap && wrap.querySelector('[data-share-status]');
		if (!status) return;
		status.textContent = '';
		setTimeout(() => {
			status.textContent = message;
		}, 10);
	}

	function flashOption(shareOption, html, ms) {
		const original = shareOption.innerHTML;
		shareOption.innerHTML = html;
		setTimeout(() => {
			shareOption.innerHTML = original;
		}, ms || 1500);
	}

	function openExternal(url) {
		const opened = window.open(url, '_blank', 'noopener,noreferrer');
		if (!opened) {
			console.warn('share: popup blocked or failed to open', url);
		}
		return Boolean(opened);
	}

	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		const shareBtn = target.closest('[data-share-vacancy]');
		if (shareBtn) {
			event.preventDefault();
			event.stopPropagation();
			const wrap = shareBtn.closest('.share-wrap');
			const dropdown = wrap && wrap.querySelector('.share-dropdown');
			if (!dropdown) {
				console.warn('share: dropdown panel missing in wrap', wrap);
				return;
			}
			document.querySelectorAll('.share-dropdown:not([hidden])').forEach((openDropdown) => {
				if (openDropdown !== dropdown) openDropdown.setAttribute('hidden', '');
			});
			const willOpen = dropdown.hasAttribute('hidden');
			if (willOpen) {
				dropdown.removeAttribute('hidden');
				shareBtn.setAttribute('aria-expanded', 'true');
				lastTrigger = shareBtn;
			} else {
				dropdown.setAttribute('hidden', '');
				shareBtn.setAttribute('aria-expanded', 'false');
				lastTrigger = null;
			}
			return;
		}

		const shareOption = target.closest('[data-share-target]');
		if (shareOption) {
			event.preventDefault();
			const wrap = shareOption.closest('.share-wrap');
			const trigger = wrap && wrap.querySelector('[data-share-vacancy]');
			if (!trigger) {
				console.warn('share: trigger missing for option', shareOption);
				return;
			}
			const slug = trigger.dataset.shareSlug || '';
			const title = trigger.dataset.shareTitle || 'Вакансия курьера';
			const salary = trigger.dataset.shareSalary || '';
			const url = `https://kurerok.ru/v/${encodeURIComponent(slug)}/?utm_source=share&utm_medium=user`;
			const text = title + (salary ? ` · ${salary}` : '');
			const action = shareOption.dataset.shareTarget;

			if (action === 'telegram') {
				openExternal(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
			} else if (action === 'whatsapp') {
				openExternal(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);
			} else if (action === 'vk') {
				openExternal(
					`https://vk.com/share.php?url=${encodeURIComponent(url)}`
						+ `&title=${encodeURIComponent(title)}`
						+ `&description=${encodeURIComponent(salary)}`,
				);
			} else if (action === 'max') {
				openExternal(`https://max.ru/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
			} else if (action === 'copy') {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(url).then(() => {
						flashOption(shareOption, '<span class="share-option-icon" aria-hidden="true">✓</span> Ссылка скопирована');
						announce(wrap, 'Ссылка скопирована');
					}).catch((err) => {
						console.warn('share: clipboard write failed', err);
						flashOption(shareOption, '<span class="share-option-icon" aria-hidden="true">!</span> Не удалось скопировать');
						announce(wrap, 'Не удалось скопировать ссылку');
					});
				} else {
					flashOption(shareOption, '<span class="share-option-icon" aria-hidden="true">!</span> Копирование недоступно');
					announce(wrap, 'Копирование ссылок недоступно в этом браузере');
				}
			} else if (action === 'native' && typeof navigator.share === 'function') {
				navigator.share({ title, text, url }).catch((err) => {
					if (err && err.name !== 'AbortError') {
						console.warn('share: navigator.share failed', err);
					}
				});
			}

			if (action !== 'copy') closeAllDropdowns(false);

			if (typeof window.gtag === 'function') {
				window.gtag('event', 'share_vacancy', { vacancy_slug: slug, method: action });
			}
			return;
		}

		if (!target.closest('.share-wrap')) {
			closeAllDropdowns(false);
		}
	}, true);

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		const openDropdown = document.querySelector('.share-dropdown:not([hidden])');
		if (!openDropdown) return;
		closeAllDropdowns(true);
	});
})();
