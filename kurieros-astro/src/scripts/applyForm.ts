import type { ApplyManifest } from '../utils/applyManifest';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type ApplyElements = {
  root: HTMLElement;
  loading: HTMLElement;
  error: HTMLElement;
  formWrap: HTMLElement;
  form: HTMLFormElement;
  submit: HTMLButtonElement;
  status: HTMLElement;
  jobTitle: HTMLElement;
  jobMeta: HTMLElement;
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

const getById = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const getElements = (): ApplyElements | null => {
  const root = getById('apply-page');
  const loading = getById('apply-loading');
  const error = getById('apply-error');
  const formWrap = getById('apply-form-wrap');
  const form = getById<HTMLFormElement>('apply-form');
  const submit = getById<HTMLButtonElement>('apply-submit');
  const status = getById('apply-status');
  const jobTitle = getById('apply-job-title');
  const jobMeta = getById('apply-job-meta');
  const errorTitle = getById('apply-error-title');
  const errorText = getById('apply-error-text');

  if (!root || !loading || !error || !formWrap || !form || !submit || !status || !jobTitle || !jobMeta || !errorTitle || !errorText) {
    return null;
  }

  return { root, loading, error, formWrap, form, submit, status, jobTitle, jobMeta, errorTitle, errorText };
};

const setVisible = (node: HTMLElement, visible: boolean) => {
  node.hidden = !visible;
};

const showError = (elements: ApplyElements, title: string, text: string) => {
  setVisible(elements.loading, false);
  setVisible(elements.formWrap, false);
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

const emitApplyFormSubmit = (jobKey: string, applyUrl: string, context: ApplyContext) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'apply_form_submit', {
    apply_slug: jobKey,
    vacancy_slug: jobKey.split('--')[0],
    source_slug: context.sourceSlug || '',
    company: context.company || '',
    city: context.city || '',
    transport: context.transport || '',
    partner_domain: context.partnerDomain || getPartnerDomain(applyUrl),
  });
};

const loadManifest = async (): Promise<ApplyManifest> => {
  const response = await fetch('/api/v1/apply-jobs.json', {
    credentials: 'same-origin',
    cache: 'force-cache',
  });
  if (!response.ok) {
    throw new Error(`apply manifest failed: ${response.status}`);
  }
  return response.json() as Promise<ApplyManifest>;
};

const initApplyForm = async () => {
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

  if (!applyUrl) {
    showError(
      elements,
      'Вакансия недоступна',
      'Ссылка устарела или вакансия уже закрыта. Выберите другую вакансию в каталоге.',
    );
    return;
  }

  const context = getApplyContext(jobKey);
  elements.jobTitle.textContent = context.title || 'Выбранная вакансия';
  elements.jobMeta.textContent = [context.company, context.city, context.salary]
    .filter(Boolean)
    .join(' · ') || 'Контакты не сохраняются на КурьерОк';
  setVisible(elements.loading, false);
  setVisible(elements.formWrap, true);

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.status.textContent = '';

    if (!elements.form.reportValidity()) return;

    elements.submit.disabled = true;
    elements.submit.textContent = 'Открываем анкету...';
    elements.status.textContent =
      'КурьерОк не сохраняет введённые данные. Сейчас откроется страница работодателя, где нужно завершить отклик.';
    emitApplyFormSubmit(jobKey, applyUrl, context);

    window.setTimeout(() => {
      window.location.assign(applyUrl);
    }, 650);
  });
};

void initApplyForm();

export {};
