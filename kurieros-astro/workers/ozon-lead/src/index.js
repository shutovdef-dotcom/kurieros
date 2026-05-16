/**
 * Cloudflare Worker — Ozon courier lead proxy.
 *
 * Receives a lead from kurerok.ru's modal, fills the
 * recruitment.ozon.ru/ref-courier-sklad referral form on behalf of
 * the user (their name + phone + chosen vacancy + city + hire
 * object) using the site owner's referrer credentials stored as
 * Worker secrets, and pings a Telegram bot for owner-side
 * awareness.
 *
 * The user never sees the referrer phone — it lives only in env.
 * After successful submission Ozon sends an SMS directly to the
 * candidate's phone; the candidate completes registration via
 * Госуслуги inside the Ozon Job mobile app.
 *
 * Required Worker secrets (set via `wrangler secret put`):
 *   OZON_REFERRER_NAME      — full name of the recruiter (e.g. "Иванов Иван Иванович")
 *   OZON_REFERRER_PHONE     — masked +7(XXX)XXX-XX-XX
 *   TELEGRAM_BOT_TOKEN      — same bot used for Telegram alerts
 *   TELEGRAM_CHAT_ID        — destination chat
 *
 * Optional vars (in `wrangler.toml` [vars]):
 *   ALLOWED_ORIGINS         — comma-separated list (default: https://kurerok.ru)
 *   OZON_CITIZENSHIP_ID     — int (default 7 = РФ)
 *
 * Per-request POST body (JSON, kurerok.ru → Worker /lead):
 *   name              — candidate full name
 *   phone             — candidate phone (any format with ≥10 digits)
 *   transport         — "auto" / "foot" / "bicycle" / human label (info only,
 *                       used for the Telegram alert; Ozon ignores it)
 *   vacancy           — combineCustomerVacancy slug, e.g. "rocket:courier"
 *   cityID            — UUID of the operational city
 *   hireObjectUUID    — UUID of the specific hire location
 *
 * The (vacancy, cityID, hireObjectUUID) triple is validated against
 * ALLOWED_TUPLES (whitelist auto-generated from the live form by
 * tools/build-worker-whitelist.mjs). Defence-in-depth so a malicious
 * cross-origin POST cannot pivot this proxy to arbitrary Ozon HR
 * pipelines (e.g. "региональный директор").
 *
 * Backwards compatibility: if vacancy / cityID / hireObjectUUID are
 * absent from the body, the Worker falls back to the original
 * Москва / `rocket:courier` defaults so older deployed kurerok.ru
 * bundles keep working through the redeploy window.
 */

import { ALLOWED_TUPLES, ALLOWED_VACANCIES } from './whitelist.js';

const OZON_API = 'https://sigma-bff-api.ozon.ru/v1/actions';
const OZON_REFERER = 'https://recruitment.ozon.ru/ref-courier-sklad';

// Legacy defaults (Москва, rocket:courier, личный легковой авто).
// Used only when the request omits per-vacancy fields. Kept as a
// safety net — once the redeployed bundle ships, every request
// carries explicit (vacancy, cityID, hireObjectUUID).
const LEGACY_DEFAULTS = {
	vacancy: 'rocket:courier',
	cityID: '73d71199-1e3c-11e9-90e9-9418826ee072',
	hireObjectUUID: '8bc59f96-1fb5-11ed-861d-0242ac120002',
};

/**
 * Format any user-typed phone into the +7(XXX)XXX-XX-XX shape Ozon expects.
 * Accepts +79991234567 / 89991234567 / 9991234567 / +7 999 123-45-67 — all
 * normalize to the same string.
 */
function formatPhone(raw) {
	const digits = String(raw || '').replace(/\D/g, '');
	let ten;
	if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) ten = digits.slice(1);
	else if (digits.length === 10) ten = digits;
	else return null;
	return `+7(${ten.slice(0, 3)})${ten.slice(3, 6)}-${ten.slice(6, 8)}-${ten.slice(8, 10)}`;
}

function corsHeaders(env, origin) {
	const allowed = String(env.ALLOWED_ORIGINS || 'https://kurerok.ru')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const isAllowed = origin && allowed.includes(origin);
	return {
		'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0] || '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
		'Vary': 'Origin',
	};
}

function jsonResponse(body, init = {}) {
	const headers = { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) };
	return new Response(JSON.stringify(body), { ...init, headers });
}

function escapeHtml(s) {
	return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

async function notifyTelegram(env, { name, phone, transport, vacancy, cityID, hireObjectUUID, ozonStatus }) {
	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
	const text = [
		'🆕 <b>Новая заявка с kurerok.ru — Ozon</b>',
		'',
		`👤 ${escapeHtml(name)}`,
		`📞 ${escapeHtml(phone)}`,
		transport ? `🚗 ${escapeHtml(transport)}` : null,
		'',
		`💼 Вакансия: <code>${escapeHtml(vacancy)}</code>`,
		`🏙 Город: <code>${escapeHtml(cityID)}</code>`,
		`📍 Адрес: <code>${escapeHtml(hireObjectUUID)}</code>`,
		'',
		`📤 Ozon API: <b>${escapeHtml(ozonStatus)}</b>`,
		`🕒 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
	]
		.filter(Boolean)
		.join('\n');
	try {
		await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: env.TELEGRAM_CHAT_ID,
				text,
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			}),
		});
	} catch (err) {
		// Best-effort — Telegram failure must not break the lead flow.
		// Log it so a missing/invalid bot token or a Telegram outage is
		// observable in the Cloudflare Worker logs (audit ref v3 L14).
		console.warn('[ozon-lead] Telegram notification failed', err);
	}
}

// Two upstream payload schemas Ozon ref forms expect:
//   ref-courier-sklad   ->  { combineCustomerVacancy: 'rocket:courier', ... }
//   fresh-referral-office -> { customer: 'express', vacancy: 'courier', ... }
// We discriminate on `customer === 'express'` and route fullpath to
// match the upstream landing page.
const OZON_REFERER_FRESH = 'https://recruitment.ozon.ru/fresh-referral-office';

async function submitToOzon(env, { name, phone, customer, vacancy, cityID, hireObjectUUID }) {
	const referrerName = String(env.OZON_REFERRER_NAME || '').trim();
	const referrerPhone = String(env.OZON_REFERRER_PHONE || '').trim();
	if (!referrerName || !referrerPhone) {
		throw new Error('worker_misconfigured: missing OZON_REFERRER_* secrets');
	}

	const isFresh = customer === 'express';
	const inner = {
		referrerFirstName: referrerName,
		referrerPhone,
		fullName: name,
		phone,
		...(isFresh
			? { customer, vacancy }
			: { combineCustomerVacancy: vacancy }),
		citizenshipID: Number(env.OZON_CITIZENSHIP_ID || 7),
		cityID,
		hireObjectUUID,
		utm_source: 'referral_campaign',
		fullpath: isFresh ? OZON_REFERER_FRESH : OZON_REFERER,
	};
	const payload = { action: 'SendReplyRequest', body: JSON.stringify(inner) };

	const res = await fetch(OZON_API, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Origin': 'https://recruitment.ozon.ru',
			'Referer': OZON_REFERER,
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
				'(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
		},
		body: JSON.stringify(payload),
	});

	const text = await res.text();
	if (!res.ok) {
		const err = new Error(`ozon_${res.status}`);
		err.detail = text.slice(0, 400);
		throw err;
	}
	return { status: res.status, response: text.slice(0, 200) };
}

export default {
	async fetch(request, env) {
		const origin = request.headers.get('Origin') || '';
		const cors = corsHeaders(env, origin);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}
		if (request.method !== 'POST') {
			return jsonResponse({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: cors });
		}
		const url = new URL(request.url);
		if (!/^\/lead\/?$/.test(url.pathname)) {
			return jsonResponse({ ok: false, error: 'not_found' }, { status: 404, headers: cors });
		}

		// Per-IP rate limit (5 req/60s). Cloudflare-side, applied before
		// any business logic so spammers can't burn Ozon SMS / Telegram
		// quota even though CORS doesn't apply to non-browser clients.
		// Configured in wrangler.toml as `RATE_LIMITER` binding.
		if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
			const ip = request.headers.get('CF-Connecting-IP')
				|| request.headers.get('X-Forwarded-For')
				|| 'unknown';
			try {
				const { success } = await env.RATE_LIMITER.limit({ key: ip });
				if (!success) {
					return jsonResponse({ ok: false, error: 'rate_limited' }, { status: 429, headers: cors });
				}
			} catch (err) {
				// Best-effort: if the rate-limiter binding misbehaves, do
				// NOT block the lead — fall through to the normal flow.
				// Log it so a binding misconfiguration is visible in the
				// Cloudflare Worker logs instead of failing silently
				// (audit ref v3 L14).
				console.warn('[ozon-lead] rate limiter unavailable', err);
			}
		}

		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse({ ok: false, error: 'invalid_json' }, { status: 400, headers: cors });
		}

		const name = String(body?.name || '').trim();
		const phoneRaw = String(body?.phone || '').trim();
		const transport = String(body?.transport || '').trim();
		const reqVacancy = String(body?.vacancy || '').trim();
		const reqCityID = String(body?.cityID || '').trim();
		const reqHireObjectUUID = String(body?.hireObjectUUID || '').trim();
		const reqCustomer = String(body?.customer || '').trim();

		if (name.length < 2) {
			return jsonResponse({ ok: false, error: 'name_too_short' }, { status: 400, headers: cors });
		}
		// Upper bound (audit ref v3 M17 / L14) — cap the name so a
		// malformed or hostile body can't push an oversized string into
		// the Ozon payload or the Telegram alert. The modal mirrors this
		// with `maxlength="200"` on the name input.
		if (name.length > 200) {
			return jsonResponse({ ok: false, error: 'name_too_long' }, { status: 400, headers: cors });
		}
		const phone = formatPhone(phoneRaw);
		if (!phone) {
			return jsonResponse({ ok: false, error: 'invalid_phone' }, { status: 400, headers: cors });
		}

		// Resolve vacancy triple. If the bundle is older and didn't send
		// the new fields, fall back to legacy Москва/rocket:courier
		// defaults rather than rejecting (graceful degradation through
		// the redeploy window).
		const vacancy = reqVacancy || LEGACY_DEFAULTS.vacancy;
		const cityID = reqCityID || LEGACY_DEFAULTS.cityID;
		const hireObjectUUID = reqHireObjectUUID || LEGACY_DEFAULTS.hireObjectUUID;
		const customer = reqCustomer || ''; // legacy bundles never set this

		// Whitelist key:
		//   • ref-courier-sklad: raw vacancy slug (`rocket:courier`).
		//   • fresh-referral-office: composite `${customer}:${vacancy}`
		//     (e.g. `express:courier`) to match the build-worker-whitelist
		//     output that prefixes Fresh entries with their customer.
		const whitelistSlug = customer === 'express' ? `${customer}:${vacancy}` : vacancy;
		// Defence-in-depth: a malicious origin (or compromised bundle)
		// could try to send an unrelated vacancy slug — reject anything
		// not in the whitelist generated from the live forms.
		if (!ALLOWED_VACANCIES.has(whitelistSlug)) {
			return jsonResponse(
				{ ok: false, error: 'invalid_vacancy' },
				{ status: 400, headers: cors },
			);
		}
		const tupleKey = `${whitelistSlug}|${cityID}|${hireObjectUUID}`;
		if (!ALLOWED_TUPLES.has(tupleKey)) {
			return jsonResponse(
				{ ok: false, error: 'invalid_vacancy_city_combination' },
				{ status: 400, headers: cors },
			);
		}

		try {
			const ozon = await submitToOzon(env, { name, phone, customer, vacancy, cityID, hireObjectUUID });
			await notifyTelegram(env, {
				name,
				phone,
				transport,
				vacancy: whitelistSlug,
				cityID,
				hireObjectUUID,
				ozonStatus: `OK (${ozon.status})`,
			});
			return jsonResponse({ ok: true }, { status: 200, headers: cors });
		} catch (err) {
			// Include err.detail (Ozon API response body, set by submitToOzon
			// on non-2xx) so debugging from a Telegram alert doesn't require
			// digging in Cloudflare logs. Truncated to keep the message under
			// Telegram's 4096-char hard limit.
			const detail = err && err.detail
				? ` | ${String(err.detail).slice(0, 600)}`
				: '';
			await notifyTelegram(env, {
				name,
				phone,
				transport,
				vacancy: whitelistSlug,
				cityID,
				hireObjectUUID,
				ozonStatus: `ERROR — ${err.message}${detail}`,
			});
			return jsonResponse(
				{ ok: false, error: 'ozon_submit_failed' },
				{ status: 502, headers: cors },
			);
		}
	},
};
