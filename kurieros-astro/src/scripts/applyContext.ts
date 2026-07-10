const closestFromEvent = <T extends Element>(
  eventTarget: EventTarget | null,
  selector: string,
): T | null => (
  eventTarget instanceof Element ? eventTarget.closest<T>(selector) : null
);

const textFrom = (root: ParentNode | null, selector: string): string => {
  const node = root?.querySelector(selector);
  return node ? (node.textContent || '').trim() : '';
};

const getApplyJobKey = (href: string): string => {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== '/apply/') return '';
    return (url.searchParams.get('job') || url.searchParams.get('id') || '').trim();
  } catch {
    return '';
  }
};

const getApplyTitle = (target: HTMLAnchorElement): string => {
  const card = target.closest('.job-card');
  if (card) return textFrom(card, '.job-title');

  const subjectCard = target.closest('.subject-card');
  if (subjectCard) return textFrom(subjectCard, 'h3');

  return textFrom(document, '.vacancy-title');
};

const getApplySalary = (target: HTMLAnchorElement): string => {
  const card = target.closest('.job-card');
  if (card) return textFrom(card, '.salary-tag');
  return textFrom(document, '.vacancy-salary-card strong');
};

document.addEventListener('click', (event) => {
  const target = closestFromEvent<HTMLAnchorElement>(event.target, 'a[data-apply-cta]');
  if (!target) return;

  const jobKey = getApplyJobKey(target.getAttribute('href') || '');
  if (!jobKey) return;

  const data = target.dataset;
	const vacancyPage = document.querySelector<HTMLElement>('.vacancy-page');
  const context = {
    title: getApplyTitle(target),
    company: data.applyCompany || vacancyPage?.dataset.analyticsCompany || '',
    city: data.applyCity || vacancyPage?.dataset.analyticsCity || '',
    salary: getApplySalary(target),
    sourceSlug: data.applySourceSlug || vacancyPage?.dataset.vacancySourceSlug || '',
    transport: data.applyTransport || vacancyPage?.dataset.analyticsTransport || '',
    partnerDomain: data.applyPartnerDomain || '',
  };

  try {
    window.sessionStorage.setItem(`kurerok:apply:${jobKey}`, JSON.stringify(context));
  } catch {
    /* Storage can be disabled; /apply/ falls back to neutral copy. */
  }
}, { passive: true });

export {};
