// Helper for emitting the four `data-ozon-*` attributes consumed by
// OzonLeadModal → Cloudflare Worker. Used in JobCard and the vacancy
// detail page; if more call sites appear, route them through here so
// there's a single place to change the attribute contract.
//
// Returns an object suitable for Astro spread syntax:
//   <element {...ozonDataAttrs(job.ozonLeadForm)}>
//
// When `meta` is undefined (non-Ozon vacancies), returns an empty
// object — Astro silently skips spreading nothing.

import type { OzonLeadFormMeta } from '../data/vacancyTypes';

type OzonDataAttrs = {
	'data-ozon-vacancy'?: string;
	'data-ozon-customer'?: string;
	'data-ozon-city-id'?: string;
	'data-ozon-hire-object-uuid'?: string;
};

export function ozonDataAttrs(meta: OzonLeadFormMeta | undefined): OzonDataAttrs {
	if (!meta) return {};
	return {
		'data-ozon-vacancy': meta.vacancy,
		'data-ozon-customer': meta.customer,
		'data-ozon-city-id': meta.cityID,
		'data-ozon-hire-object-uuid': meta.hireObjectUUID,
	};
}
