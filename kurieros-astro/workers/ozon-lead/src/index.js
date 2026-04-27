/**
 * Cloudflare Worker — Ozon courier lead proxy.
 *
 * Receives a lead from kurerok.ru's modal, fills the
 * recruitment.ozon.ru/ref-courier-sklad referral form on behalf of
 * the user (their name + phone) using the site owner's referrer
 * credentials stored as Worker secrets, and pings a Telegram bot
 * for owner-side awareness.
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
 *   OZON_VACANCY            — combineCustomerVacancy slug (default: rocket:courier)
 *   OZON_CITIZENSHIP_ID     — int (default 7 = РФ)
 *   OZON_CITY_ID            — UUID for the operational city
 *   OZON_HIRE_OBJECT_UUID   — UUID for the hire location
 */

const OZON_API = 'https://sigma-bff-api.ozon.ru/v1/actions';
const OZON_REFERER = 'https://recruitment.ozon.ru/ref-courier-sklad';

// Sensible defaults — Москва, ул. Скотопрогонная, д 35, стр 3 (Ozon HR sandbox)
// for "Курьер на личном легковом автомобиле".
const DEFAULTS = {
	OZON_VACANCY: 'rocket:courier',
	OZON_CITIZENSHIP_ID: 7,
	OZON_CITY_ID: '73d71199-1e3c-11e9-90e9-9418826ee072',
	OZON_HIRE_OBJECT_UUID: '8bc59f96-1fb5-11ed-861d-0242ac120002',
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

async function notifyTelegram(env, { name, phone, transport, ozonStatus }) {
	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
	const text = [
		'🆕 <b>Новая заявка с kurerok.ru — Ozon</b>',
		'',
		`👤 ${escapeHtml(name)}`,
		`📞 ${escapeHtml(phone)}`,
		transport ? `🚗 ${escapeHtml(transport)}` : null,
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
	} catch (_) {
		// Best-effort — Telegram failure must not break the lead flow.
	}
}

async function submitToOzon(env, { name, phone }) {
	const referrerName = String(env.OZON_REFERRER_NAME || '').trim();
	const referrerPhone = String(env.OZON_REFERRER_PHONE || '').trim();
	if (!referrerName || !referrerPhone) {
		throw new Error('worker_misconfigured: missing OZON_REFERRER_* secrets');
	}

	const inner = {
		referrerFirstName: referrerName,
		referrerPhone,
		fullName: name,
		phone,
		combineCustomerVacancy: env.OZON_VACANCY || DEFAULTS.OZON_VACANCY,
		citizenshipID: Number(env.OZON_CITIZENSHIP_ID || DEFAULTS.OZON_CITIZENSHIP_ID),
		cityID: env.OZON_CITY_ID || DEFAULTS.OZON_CITY_ID,
		hireObjectUUID: env.OZON_HIRE_OBJECT_UUID || DEFAULTS.OZON_HIRE_OBJECT_UUID,
		utm_source: 'referral_campaign',
		fullpath: OZON_REFERER,
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

		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse({ ok: false, error: 'invalid_json' }, { status: 400, headers: cors });
		}

		const name = String(body?.name || '').trim();
		const phoneRaw = String(body?.phone || '').trim();
		const transport = String(body?.transport || '').trim();

		if (name.length < 2) {
			return jsonResponse({ ok: false, error: 'name_too_short' }, { status: 400, headers: cors });
		}
		const phone = formatPhone(phoneRaw);
		if (!phone) {
			return jsonResponse({ ok: false, error: 'invalid_phone' }, { status: 400, headers: cors });
		}

		try {
			const ozon = await submitToOzon(env, { name, phone });
			await notifyTelegram(env, { name, phone, transport, ozonStatus: `OK (${ozon.status})` });
			return jsonResponse({ ok: true }, { status: 200, headers: cors });
		} catch (err) {
			await notifyTelegram(env, {
				name,
				phone,
				transport,
				ozonStatus: `ERROR — ${err.message}`,
			});
			return jsonResponse(
				{ ok: false, error: 'ozon_submit_failed' },
				{ status: 502, headers: cors },
			);
		}
	},
};
