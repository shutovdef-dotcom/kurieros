// QW6 + QW14 — scroll restore on back-nav, back-to-top button.
//
// Extracted verbatim from JobGrid.astro IIFE #2 (Wave 21d, audit v5 M8 /
// TODO H14). This block uses ZERO `define:vars` constants and ZERO
// JobGrid-frontmatter variables — only browser globals + DOM ids — so it
// is loaded as a bundled (non-`is:inline`) ES module the same way
// `compare.astro` loads `compareInit.ts`.
//
// Kept in its own IIFE so it can't be derailed by the larger
// compare/filter handler (which is wrapped in DOMContentLoaded +
// define:vars and therefore stays `is:inline` in JobGrid.astro).
(function () {
	const SCROLL_KEY = 'kurieros:jobs-scroll:' + window.location.pathname;

	// --- QW6: scroll restore ---
	// Save scrollY when the user clicks any link inside the grid
	// (job title, company name, "сравнить", "откликнуться"). On the
	// next load of THIS pathname, jump back to that position. Clear
	// the entry after restore so a fresh top-level visit always
	// starts at the top.
	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest('.job-card a');
		if (!link || !(link instanceof HTMLAnchorElement)) return;
		if (link.target === '_blank') return; // external apply opens new tab
		try {
			const dest = new URL(link.href, window.location.origin);
			if (dest.origin !== window.location.origin) return;
		} catch (_) {
			return;
		}
		try {
			sessionStorage.setItem(SCROLL_KEY, String(window.scrollY | 0));
		} catch (_) {
			/* private mode / quota — silently skip */
		}
	}, true);

	const restoreScroll = () => {
		let stored = null;
		try { stored = sessionStorage.getItem(SCROLL_KEY); } catch (_) { stored = null; }
		if (stored === null) return;
		const y = Number.parseInt(stored, 10);
		if (!Number.isFinite(y) || y <= 0) {
			try { sessionStorage.removeItem(SCROLL_KEY); } catch (_) {}
			return;
		}
		// Two rAFs: first lets layout settle after Astro hydration,
		// second performs the jump. `behavior: 'auto'` (instant) —
		// smooth-scroll on revisit feels nervous.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				window.scrollTo({ top: y, behavior: 'auto' });
				try { sessionStorage.removeItem(SCROLL_KEY); } catch (_) {}
			});
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', restoreScroll, { once: true });
	} else {
		restoreScroll();
	}

	// --- QW14: back-to-top ---
	const btn = document.getElementById('back-to-top');
	const grid = document.getElementById('jobs-grid');
	if (!btn || !grid) return;

	const SHOW_AFTER_INDEX = 7; // 0-based — i.e., after 8th card

	let onScroll: (() => void) | null = null;
	const teardown = () => {
		if (onScroll) {
			window.removeEventListener('scroll', onScroll);
			onScroll = null;
		}
	};

	const setupSentinel = () => {
		teardown();
		const cards = grid.querySelectorAll('.job-card');
		if (cards.length <= SHOW_AFTER_INDEX) {
			btn.classList.add('hidden');
			return;
		}
		const sentinel = cards[SHOW_AFTER_INDEX];
		onScroll = () => {
			const rect = sentinel.getBoundingClientRect();
			const passed = rect.bottom < 0;
			btn.classList.toggle('hidden', !passed);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
	};

	btn.addEventListener('click', () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	// Initial setup + re-setup when grid mutates (city swap, reveal-more).
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', setupSentinel, { once: true });
	} else {
		setupSentinel();
	}
	window.addEventListener('kurieros:reveal-more-jobs', () => {
		// reveal-more appends cards but the 8th-card sentinel doesn't
		// change identity unless the list was shorter than 8 before.
		// Cheap to re-attach defensively.
		setupSentinel();
	});
	window.addEventListener('kurieros:city-selected', () => {
		// City swap rebuilds .jobs-grid children — the old sentinel
		// node is gone. Wait one tick for the swap to land.
		setTimeout(setupSentinel, 50);
	});
})();
