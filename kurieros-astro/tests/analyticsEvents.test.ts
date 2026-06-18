import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

describe('GA4 grid funnel wiring', () => {
  it('keeps the core delegated grid events in BaseLayout', () => {
    const layout = readProjectFile('src/layouts/BaseLayout.astro');
    const module = readProjectFile('src/scripts/analyticsEvents.ts');

    expect(layout).toContain("import '../scripts/analyticsEvents'");

    expect(module).toContain("window.gtag('event', 'apply_click'");
    expect(module).toContain("window.gtag('event', 'vacancy_open'");
    expect(module).toContain("window.gtag('event', 'grid_reveal_more'");
    expect(module).toContain("window.gtag('event', 'grid_filter_change'");
    expect(module).toContain("window.gtag('event', 'grid_city_select'");
    expect(module).toContain("window.gtag('event', 'compare_toggle'");

    expect(module).toContain('vacancy_id: data.applyVacancyId');
    expect(module).toContain('vacancy_slug: data.applyVacancySlug');
    expect(module).toContain('source_slug: data.applySourceSlug');
  });

  it('adds stable vacancy identifiers to every first-party apply CTA', () => {
    const filesWithApplyCtas = [
      ['src/components/JobCard.astro', 2],
      ['src/components/vacancy/VacancyHero.astro', 2],
      ['src/components/vacancy/VacancySidebar.astro', 2],
    ] as const;

    for (const [path, expectedCount] of filesWithApplyCtas) {
      const source = readProjectFile(path);
      expect(source.match(/data-apply-vacancy-id=\{job\.id\}/g) ?? [], path).toHaveLength(expectedCount);
      expect(source.match(/data-apply-vacancy-slug=\{job\.slug\}/g) ?? [], path).toHaveLength(expectedCount);
      expect(source.match(/data-apply-source-slug=\{job\.sourceSlug\}/g) ?? [], path).toHaveLength(expectedCount);
    }
  });
});
