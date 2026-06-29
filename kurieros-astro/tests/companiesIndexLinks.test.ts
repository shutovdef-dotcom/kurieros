import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const companiesIndexSource = () =>
  readFileSync(new URL('../src/pages/companies/index.astro', import.meta.url), 'utf8');

describe('companies index links', () => {
  it('opens the internal company guide page from every company card', () => {
    const source = companiesIndexSource();

    expect(source).toContain('href={company.href}');
    expect(source).toContain('Открыть страницу');
    expect(source).not.toContain('href={company.applyLink}');
    expect(source).not.toContain('target={isExternalApplyLink');
    expect(source).not.toContain('conversion-first behaviour');
  });
});
