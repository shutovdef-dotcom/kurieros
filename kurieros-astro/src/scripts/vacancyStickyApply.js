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
		let io;
		function observeHero() {
			io?.disconnect();
			const header = document.querySelector('.site-header');
			const mobileNav = document.querySelector('.bottom-nav');
			const headerHeight = header?.getBoundingClientRect().height || 0;
			const navHeight = mobileNav?.getBoundingClientRect().height || 0;
			// Keep an available action when fixed navigation covers the hero CTA.
			// Measurements include the mobile menu's safe-area padding.
			io = new IntersectionObserver(function (entries) {
				const heroVisible = entries.some(function (entry) {
					return entry.isIntersecting && entry.intersectionRatio >= 0.99;
				});
				bar.classList.toggle('hidden', heroVisible);
			}, {
				rootMargin: `-${headerHeight}px 0px -${navHeight}px 0px`,
				threshold: [0, 0.99],
			});
			io.observe(heroBtn);
		}
		observeHero();
		window.addEventListener('resize', observeHero);
	} else {
		bar.classList.remove('hidden');
	}

})();
