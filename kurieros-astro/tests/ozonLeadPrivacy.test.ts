import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

describe('Ozon lead disclosure and fail-closed UI contract', () => {
  it('names the PII processor, recipient, purpose, and retention boundary in the form', () => {
    const modal = readProjectFile('src/components/OzonLeadModal.astro');

    expect(modal).toContain('Cloudflare Worker');
    expect(modal).toContain('в Ozon');
    expect(modal).toContain('для передачи заявки');
    expect(modal).toContain('не сохраняет');
    expect(modal).toContain('/privacy/');
    expect(modal).not.toContain('Передаём номер только в Ozon');
    expect(modal).not.toContain('мы перезвоним');
  });

  it('documents exact Ozon-form recipients and storage boundaries in privacy policy', () => {
    const privacy = readProjectFile('src/pages/privacy.astro');

    expect(privacy).toContain('Имя и номер телефона');
    expect(privacy).toContain('Cloudflare Workers');
    expect(privacy).toContain('Ozon');
    expect(privacy).toContain('не передаются в Telegram');
    expect(privacy).toContain('только в течение обработки запроса');
    expect(privacy).toContain('не сохраняются в базе данных КурьерОк');
  });

  it('renders an unavailable state instead of lead triggers for ineligible jobs', () => {
    const card = readProjectFile('src/components/JobCard.astro');
    const detailPage = readProjectFile('src/pages/v/[slug].astro');
    const baseLayout = readProjectFile('src/layouts/BaseLayout.astro');

    expect(card).toContain('getLeadFormEligibility');
    expect(card).toContain('Отклик временно недоступен');
    expect(detailPage).toContain('getLeadFormEligibility');
    expect(detailPage).toContain('isLeadFormUnavailable');
    expect(baseLayout).toContain('hasEligibleLeadForms');
  });
});
