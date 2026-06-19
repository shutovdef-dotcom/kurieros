(function () {
	const bar = document.getElementById('vacancy-sticky-apply');
	if (!bar) return;

	const labelEl = bar.querySelector('.vacancy-sticky-apply-label');
	const heroBtn = document.querySelector('.apply-btn-hero');

	if (!heroBtn) return;

	document.body.classList.add('has-vacancy-sticky-apply');

	if (labelEl) {
		const heroText = (heroBtn.textContent || '').trim();
		if (heroText) labelEl.textContent = heroText;
	}

	if (typeof IntersectionObserver === 'function') {
		const io = new IntersectionObserver(function (entries) {
			const heroVisible = entries.some(function (entry) {
				return entry.isIntersecting;
			});
			bar.classList.toggle('hidden', heroVisible);
		}, { threshold: 0 });
		io.observe(heroBtn);
	} else {
		bar.classList.remove('hidden');
	}

	bar.addEventListener('click', function (event) {
		event.preventDefault();
		heroBtn.click();
	});
})();
