import type { ApplyManifest } from '../utils/applyManifest';
import { trackEvent } from './analyticsAdapter';

type ApplyElements = {
  loading: HTMLElement;
  error: HTMLElement;
  jobCard: HTMLElement;
  status: HTMLElement;
  progressBar: HTMLElement;
  directLink: HTMLAnchorElement;
  errorTitle: HTMLElement;
  errorText: HTMLElement;
};

type ApplyContext = {
  title?: string;
  company?: string;
  city?: string;
  salary?: string;
  sourceSlug?: string;
  transport?: string;
  partnerDomain?: string;
};

declare const __BUILD_TIMESTAMP__: string;

const REDIRECT_DELAY_MS = 4000;
const applyManifestVersion = (
  typeof __BUILD_TIMESTAMP__ === 'string' &&
  __BUILD_TIMESTAMP__ &&
  __BUILD_TIMESTAMP__ !== 'undefined'
) ? __BUILD_TIMESTAMP__ : String(Date.now());

const getById = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const getElements = (): ApplyElements | null => {
  const loading = getById('apply-loading');
  const error = getById('apply-error');
  const jobCard = getById('apply-job');
  const status = getById('apply-status');
  const progressBar = getById('apply-progress-bar');
  const directLink = getById<HTMLAnchorElement>('apply-direct-link');
  const errorTitle = getById('apply-error-title');
  const errorText = getById('apply-error-text');

  if (
    !loading ||
    !error ||
    !jobCard ||
    !status ||
    !progressBar ||
    !directLink ||
    !errorTitle ||
    !errorText
  ) {
    return null;
  }

  return {
    loading,
    error,
    jobCard,
    status,
    progressBar,
    directLink,
    errorTitle,
    errorText,
  };
};

const setVisible = (node: HTMLElement, visible: boolean) => {
  node.hidden = !visible;
};

const showError = (elements: ApplyElements, title: string, text: string) => {
  setVisible(elements.loading, false);
  setVisible(elements.jobCard, false);
  setVisible(elements.error, true);
  elements.errorTitle.textContent = title;
  elements.errorText.textContent = text;
};

const getJobKey = (): string => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('job') || params.get('id') || '').trim();
};

const getApplyContext = (jobKey: string): ApplyContext => {
  try {
    const raw = window.sessionStorage.getItem(`kurerok:apply:${jobKey}`);
    return raw ? JSON.parse(raw) as ApplyContext : {};
  } catch {
    return {};
  }
};

const getPartnerDomain = (applyUrl: string): string => {
  try {
    return new URL(applyUrl).hostname;
  } catch {
    return '';
  }
};

const isSafeRedirectUrl = (applyUrl: string): boolean => {
  try {
    return new URL(applyUrl).protocol === 'https:';
  } catch {
    return false;
  }
};

const emitApplyRedirectStart = (
  jobKey: string,
  applyUrl: string,
  context: ApplyContext,
) => {
  trackEvent('apply_redirect_start', {
    apply_slug: jobKey,
    vacancy_slug: jobKey.split('--')[0],
    source_slug: context.sourceSlug || '',
    company: context.company || '',
    city: context.city || '',
    transport: context.transport || '',
    partner_domain: context.partnerDomain || getPartnerDomain(applyUrl),
    delay_ms: REDIRECT_DELAY_MS,
  });
};

const loadManifest = async (): Promise<ApplyManifest> => {
  const response = await fetch(`/api/v1/apply-jobs.json?v=${encodeURIComponent(applyManifestVersion)}`, {
    credentials: 'same-origin',
    cache: 'no-cache',
  });
  if (!response.ok) {
    throw new Error(`apply manifest failed: ${response.status}`);
  }
  return response.json() as Promise<ApplyManifest>;
};

const startRedirectCountdown = (
  elements: ApplyElements,
  jobKey: string,
  applyUrl: string,
  context: ApplyContext,
) => {
  elements.directLink.href = applyUrl;
  elements.directLink.hidden = false;
  elements.status.textContent = 'Переход откроется через 4 секунды.';
  elements.progressBar.classList.add('is-running');
  setVisible(elements.loading, false);
  setVisible(elements.jobCard, true);

  emitApplyRedirectStart(jobKey, applyUrl, context);

  window.setTimeout(() => {
    window.location.assign(applyUrl);
  }, REDIRECT_DELAY_MS);
};

const initApplyRedirect = async () => {
  const elements = getElements();
  if (!elements) return;

  const jobKey = getJobKey();
  if (!jobKey) {
    showError(
      elements,
      'Вакансия не выбрана',
      'Вернитесь к списку вакансий и нажмите кнопку отклика ещё раз.',
    );
    return;
  }

  let applyUrl = '';
  try {
    const manifest = await loadManifest();
    applyUrl = manifest.targets[jobKey] || '';
  } catch {
    showError(
      elements,
      'Не удалось загрузить данные вакансии',
      'Попробуйте обновить страницу или перейти к вакансии заново.',
    );
    return;
  }

  if (!applyUrl || !isSafeRedirectUrl(applyUrl)) {
    showError(
      elements,
      'Вакансия недоступна',
      'Ссылка устарела или вакансия уже закрыта. Выберите другую вакансию в каталоге.',
    );
    return;
  }

  startRedirectCountdown(elements, jobKey, applyUrl, getApplyContext(jobKey));
};

void initApplyRedirect();

export {};
