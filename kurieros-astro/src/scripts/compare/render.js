// Compare grid + company-links rendering helpers (browser-side).
//
// Imported via Vite `?raw` and concatenated into the inline DOMContentLoaded
// callback in `compare.astro`. Closes over (must be defined in surrounding scope):
//   - `grid` (HTMLElement)                 — main compare grid container
//   - `companyLinks` (HTMLElement|null)    — chips row for selected companies
//   - `features` (Array<{key, name}>)      — feature rows definition (compile-time)
//   - `hasAvailableJobs` (bool)            — true when totalCompareJobs > 0
//   - `applyScopedStyles` (fn)             — re-applies data-astro-cid
//   - `escapeHtml` (fn)                    — XSS-safe text escaping (defined in init)
//
// Rendered HTML structure mirrors the SSR markup in CompareGrid.astro
// so the column dividers, scoped styles, and remove-button wiring stay
// behaviourally identical across initial render and re-render.

    function renderCompanyLogo(job) {
      const firstLetter = String(job.company ?? '').trim().charAt(0) || '•';
      if (!job.companyLogo) {
        return `<span class="company-logo-letter">${escapeHtml(firstLetter)}</span>`;
      }

      return `
        <img
          src="${escapeHtml(job.companyLogo)}"
          alt="${escapeHtml(job.company)} logo"
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
        />
      `;
    }

    function renderEmptyState() {
      const emptyCopy = hasAvailableJobs
        ? {
          heading: 'Нет вакансий для сравнения',
          text: 'Добавьте 2-4 вакансии из списка, чтобы увидеть разницу по выплатам, транспорту и оформлению.',
          href: '/#vacancies',
          link: 'Вернуться к вакансиям',
        }
        : {
          heading: 'Нет вакансий для сравнения',
          text: 'Список активных вакансий очищен. Новые варианты появятся здесь после публикации карточек.',
          href: '/',
          link: 'Вернуться на главную',
        };

      grid.style.setProperty('--cols', '0');
      grid.innerHTML = `
        <div class="compare-empty-state">
          <h3>${emptyCopy.heading}</h3>
          <p>${emptyCopy.text}</p>
          <a href="${emptyCopy.href}" class="btn-primary compare-empty-state-link">${emptyCopy.link}</a>
        </div>
      `;
      applyScopedStyles(grid);

      if (companyLinks) {
        companyLinks.innerHTML = '<a href="/companies/" class="compare-chip-link">Все компании</a>';
        applyScopedStyles(companyLinks);
      }
    }

    function renderComparisonTable(jobs) {
      if (jobs.length === 0) {
        renderEmptyState();
        return;
      }

      grid.style.setProperty('--cols', jobs.length.toString());

      const headerCells = jobs.map((job, index) => `
        <div class="compare-cell job-col" data-col="${index}">
          <div class="job-card-mini">
            <button class="remove-col-btn" aria-label="Удалить" title="Удалить из сравнения" data-job-id="${job.id}" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="company-logo company-logo-${escapeHtml(job.companySlug)}">
              ${renderCompanyLogo(job)}
            </div>
            <h3>${escapeHtml(job.title)}</h3>
            <span class="company-name">${escapeHtml(job.company)}</span>
          </div>
        </div>
      `).join('');

      const featureRows = features.map((feature) => `
        <div class="compare-row">
          <div class="compare-cell feature-col">${escapeHtml(feature.name)}</div>
          ${jobs.map((job, index) => `
            <div class="compare-cell job-col" data-col="${index}">
              ${escapeHtml(job[feature.key])}
            </div>
          `).join('')}
        </div>
      `).join('');

      const actionCells = jobs.map((job, index) => `
        <div class="compare-cell job-col" data-col="${index}">
          <a href="${escapeHtml(job.link)}" class="btn-primary">Открыть карточку</a>
        </div>
      `).join('');

      grid.innerHTML = `
        <div class="compare-row compare-head">
          <div class="compare-cell feature-col empty-cell">Параметры</div>
          ${headerCells}
        </div>
        ${featureRows}
        <div class="compare-row compare-actions">
          <div class="compare-cell feature-col"></div>
          ${actionCells}
        </div>
      `;
      applyScopedStyles(grid);
    }

    function renderCompanyLinks(jobs) {
      if (!companyLinks) return;

      const companies = Array.from(new Map(jobs.map((job) => [job.company, {
        name: job.company,
        href: job.companyHref,
      }])).values());

      companyLinks.innerHTML = companies.length
        ? companies.map((company) => `<a href="${escapeHtml(company.href)}" class="compare-chip-link">${escapeHtml(company.name)}</a>`).join('')
        : '<a href="/companies/" class="compare-chip-link">Все компании</a>';
      applyScopedStyles(companyLinks);
    }
