// Compare grid + company-links rendering for the /compare/ page (typed ESM).
//
// Replaces the former `render.js` `?raw` fragment. Where that fragment
// closed over `grid` / `companyLinks` / `features` / `hasAvailableJobs` /
// `applyScopedStyles` / `escapeHtml`, this module receives them as typed
// constructor dependencies.
//
// Rendered HTML structure mirrors the SSR markup in `CompareGrid.astro` so
// the column dividers, scoped styles, and remove-button wiring stay
// behaviourally identical across initial render and re-render.

import { escapeHtml } from './domHelpers';
import type { CompareJob, Feature } from './types';

/** Public API returned by {@link createRenderer}. */
export interface CompareRenderer {
  /** Render the side-by-side comparison table for `jobs` (empty → empty state). */
  renderComparisonTable: (jobs: CompareJob[]) => void;
  /** Render the company-chips row for the distinct companies in `jobs`. */
  renderCompanyLinks: (jobs: CompareJob[]) => void;
}

/** DOM targets + page config the renderer needs. */
interface RendererDeps {
  /** Main compare grid container. */
  grid: HTMLElement;
  /** Chips row for selected companies (absent on some layouts). */
  companyLinks: HTMLElement | null;
  /** Feature-row definitions (compile-time constant). */
  features: readonly Feature[];
  /** True when the site has at least one active vacancy. */
  hasAvailableJobs: boolean;
  /** Re-stamps the Astro `data-astro-cid-*` scope onto generated markup. */
  applyScopedStyles: (root: Element) => void;
}

/** Copy for the two empty-state variants (has vacancies vs. catalogue empty). */
interface EmptyStateCopy {
  heading: string;
  text: string;
  href: string;
  link: string;
}

/**
 * Create the compare renderer bound to the supplied DOM targets and page
 * config.
 */
export function createRenderer(deps: RendererDeps): CompareRenderer {
  const { grid, companyLinks, features, hasAvailableJobs, applyScopedStyles } = deps;

  function renderCompanyLogo(job: CompareJob): string {
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

  function renderEmptyState(): void {
    const emptyCopy: EmptyStateCopy = hasAvailableJobs
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
      companyLinks.innerHTML =
        '<a href="/companies/" class="compare-chip-link">Все компании</a>';
      applyScopedStyles(companyLinks);
    }
  }

  function renderComparisonTable(jobs: CompareJob[]): void {
    if (jobs.length === 0) {
      renderEmptyState();
      return;
    }

    grid.style.setProperty('--cols', jobs.length.toString());

    const headerCells = jobs
      .map(
        (job, index) => `
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
      `,
      )
      .join('');

    const featureRows = features
      .map(
        (feature) => `
        <div class="compare-row">
          <div class="compare-cell feature-col">${escapeHtml(feature.name)}</div>
          ${jobs
            .map(
              (job, index) => `
            <div class="compare-cell job-col" data-col="${index}">
              ${escapeHtml(job[feature.key])}
            </div>
          `,
            )
            .join('')}
        </div>
      `,
      )
      .join('');

    const actionCells = jobs
      .map(
        (job, index) => `
        <div class="compare-cell job-col" data-col="${index}">
          <a href="${escapeHtml(job.link)}" class="btn-primary">Открыть карточку</a>
        </div>
      `,
      )
      .join('');

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

  function renderCompanyLinks(jobs: CompareJob[]): void {
    if (!companyLinks) return;

    const companies = Array.from(
      new Map(
        jobs.map((job) => [
          job.company,
          { name: job.company, href: job.companyHref },
        ]),
      ).values(),
    );

    companyLinks.innerHTML = companies.length
      ? companies
          .map(
            (company) =>
              `<a href="${escapeHtml(company.href)}" class="compare-chip-link">${escapeHtml(company.name)}</a>`,
          )
          .join('')
      : '<a href="/companies/" class="compare-chip-link">Все компании</a>';
    applyScopedStyles(companyLinks);
  }

  return { renderComparisonTable, renderCompanyLinks };
}
