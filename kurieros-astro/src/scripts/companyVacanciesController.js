import { stripEventHandlers } from './sanitize.js';

(function () {
  function vacancyWord(count) {
    const abs = Math.abs(count) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return 'вакансий';
    if (last === 1) return 'вакансия';
    if (last >= 2 && last <= 4) return 'вакансии';
    return 'вакансий';
  }

  function getNumberAttribute(element, name, fallback = 0) {
    const value = Number.parseInt(element?.getAttribute(name) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  }

  function appendBatchCards(grid, batchRoot) {
    const fragment = document.createDocumentFragment();
    let appended = 0;

    for (const sourceChild of Array.from(batchRoot.children)) {
      if (!sourceChild.classList.contains('job-card')) continue;
      const cloned = sourceChild.cloneNode(true);
      stripEventHandlers(cloned);
      fragment.appendChild(cloned);
      appended += 1;
    }

    if (appended > 0) {
      grid.appendChild(fragment);
    }

    return appended;
  }

  function setupCompanyVacanciesGrid(grid) {
    const panel = document.getElementById('company-vacancies-more');
    const text = document.getElementById('company-vacancies-more-text');
    const button = document.getElementById('company-vacancies-more-btn');
    if (!panel || !button) return;

    const total = getNumberAttribute(grid, 'data-total-count');
    const batchSize = getNumberAttribute(grid, 'data-batch-size', 24);

    function getRemainingCount() {
      return getNumberAttribute(grid, 'data-remaining-count');
    }

    function getRenderedCount() {
      return grid.querySelectorAll('.job-card').length;
    }

    function setNextBatchUrl(url) {
      if (url) {
        grid.setAttribute('data-next-batch-url', url);
      } else {
        grid.removeAttribute('data-next-batch-url');
      }
    }

    function updateControls() {
      const remaining = getRemainingCount();
      const rendered = getRenderedCount();
      const hasRemaining = remaining > 0;
      const nextCount = Math.min(batchSize, remaining);
      const nextBatchUrl = grid.getAttribute('data-next-batch-url') || '#company-vacancies';

      panel.hidden = !hasRemaining;
      if (text) {
        text.textContent = `Показано ${rendered} из ${total} ${vacancyWord(total)}`;
      }
      if (button instanceof HTMLAnchorElement) {
        button.href = nextBatchUrl;
      }
      if (hasRemaining) {
        button.textContent = `Показать ещё ${nextCount} ${vacancyWord(nextCount)}`;
        button.setAttribute('aria-disabled', 'false');
      }
    }

    let inFlight = null;
    async function loadNextBatch() {
      if (inFlight) return inFlight;

      inFlight = (async () => {
        const batchUrl = grid.getAttribute('data-next-batch-url') || '';
        if (!batchUrl) {
          grid.setAttribute('data-remaining-count', '0');
          updateControls();
          return 0;
        }

        let html = '';
        try {
          button.setAttribute('aria-disabled', 'true');
          button.textContent = 'Показываем вакансии...';
          const res = await fetch(batchUrl, { cache: 'no-cache' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          html = await res.text();
        } catch (error) {
          console.warn('company vacancy batch fetch failed', error);
          return 0;
        } finally {
          button.setAttribute('aria-disabled', 'false');
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const batchRoot = doc.querySelector('.company-vacancies-batch');
        if (!batchRoot) {
          grid.setAttribute('data-remaining-count', '0');
          setNextBatchUrl('');
          updateControls();
          return 0;
        }

        const appended = appendBatchCards(grid, batchRoot);
        grid.setAttribute('data-remaining-count', batchRoot.getAttribute('data-remaining-count') || '0');
        setNextBatchUrl(batchRoot.getAttribute('data-next-batch-url') || '');
        updateControls();
        return appended;
      })();

      try {
        return await inFlight;
      } finally {
        inFlight = null;
      }
    }

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      if (button.getAttribute('aria-disabled') === 'true') return;
      await loadNextBatch();
    });

    updateControls();
  }

  function init() {
    const grid = document.querySelector('[data-company-vacancies-grid]');
    if (grid) setupCompanyVacanciesGrid(grid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
