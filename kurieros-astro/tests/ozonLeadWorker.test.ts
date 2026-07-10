import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, {
  corsHeaders,
  escapeHtml,
  formatPhone,
  isLeadFlowFresh,
} from '../workers/ozon-lead/src/index.js';

const LEGACY_CITY_ID = '73d71199-1e3c-11e9-90e9-9418826ee072';
const LEGACY_HIRE_OBJECT_UUID = '8bc59f96-1fb5-11ed-861d-0242ac120002';

const env = {
  ALLOWED_ORIGINS: 'https://kurerok.ru,https://www.kurerok.ru',
  OZON_CITIZENSHIP_ID: '7',
  OZON_LEAD_VERIFIED_AT: new Date().toISOString(),
};

const readJson = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text()) as T;

const leadRequest = (body: unknown, origin = 'https://kurerok.ru') =>
  new Request('https://worker.example/lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ozon lead worker helpers', () => {
  it('normalizes Russian phone formats to Ozon format', () => {
    expect(formatPhone('+7 999 123-45-67')).toBe('+7(999)123-45-67');
    expect(formatPhone('8 (999) 123-45-67')).toBe('+7(999)123-45-67');
    expect(formatPhone('9991234567')).toBe('+7(999)123-45-67');
  });

  it('rejects malformed phone values', () => {
    expect(formatPhone('12345')).toBeNull();
    expect(formatPhone('+1 999 123 45 67')).toBeNull();
  });

  it('allows only configured CORS origins and falls back predictably', () => {
    expect(corsHeaders(env, 'https://www.kurerok.ru')['Access-Control-Allow-Origin'])
      .toBe('https://www.kurerok.ru');
    expect(corsHeaders(env, 'https://evil.example')['Access-Control-Allow-Origin'])
      .toBe('https://kurerok.ru');
  });

  it('escapes Telegram HTML fields', () => {
    expect(escapeHtml('<Ivan & Co>')).toBe('&lt;Ivan &amp; Co&gt;');
  });

  it('accepts only a recent, valid lead-flow verification timestamp', () => {
    const now = new Date('2026-07-10T12:00:00.000Z');

    expect(isLeadFlowFresh('2026-07-09T12:00:00.000Z', now)).toBe(true);
    expect(isLeadFlowFresh('2026-06-09T11:59:59.000Z', now)).toBe(false);
    expect(isLeadFlowFresh('', now)).toBe(false);
    expect(isLeadFlowFresh('invalid', now)).toBe(false);
    expect(isLeadFlowFresh('2026-07-10T12:06:00.000Z', now)).toBe(false);
  });
});

describe('ozon lead worker request handling', () => {
  it('handles OPTIONS preflight without touching downstream APIs', async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/lead', {
        method: 'OPTIONS',
        headers: { Origin: 'https://kurerok.ru' },
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://kurerok.ru');
  });

  it('rejects non-POST methods', async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/lead', { method: 'GET' }),
      env,
    );

    expect(response.status).toBe(405);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'method_not_allowed',
    });
  });

  it('rejects invalid JSON bodies', async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'invalid_json',
    });
  });

  it('rejects stale or missing verification before reading or forwarding PII', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const request = leadRequest({
      name: 'Секретное Имя',
      phone: '+79991234567',
    });
    const jsonSpy = vi.spyOn(request, 'json');

    const response = await worker.fetch(request, {
      ...env,
      OZON_LEAD_VERIFIED_AT: '2026-04-29T00:00:00.000Z',
    });

    expect(response.status).toBe(503);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'lead_form_unavailable',
    });
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed UUID fields before whitelist lookup', async () => {
    const response = await worker.fetch(
      leadRequest({
        name: 'Тестовый Кандидат',
        phone: '+79991234567',
        vacancy: 'rocket:courier',
        cityID: 'not-a-uuid',
        hireObjectUUID: LEGACY_HIRE_OBJECT_UUID,
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'invalid_city',
    });
  });

  it('rejects unknown vacancy slugs', async () => {
    const response = await worker.fetch(
      leadRequest({
        name: 'Тестовый Кандидат',
        phone: '+79991234567',
        vacancy: 'regional-director',
        cityID: LEGACY_CITY_ID,
        hireObjectUUID: LEGACY_HIRE_OBJECT_UUID,
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'invalid_vacancy',
    });
  });

  it('fails loudly when required Ozon secrets are absent', async () => {
    const response = await worker.fetch(
      leadRequest({
        name: 'Тестовый Кандидат',
        phone: '+79991234567',
      }),
      env,
    );

    expect(response.status).toBe(502);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: 'ozon_submit_failed',
    });
  });

  it('submits the legacy-compatible payload when validation succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const response = await worker.fetch(
      leadRequest({
        name: 'Тестовый Кандидат',
        phone: '+79991234567',
      }),
      {
        ...env,
        OZON_REFERRER_NAME: 'Иванов Иван Иванович',
        OZON_REFERRER_PHONE: '+7(999)000-00-00',
      },
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://sigma-bff-api.ozon.ru/v1/actions');
  });

  it('sends Telegram only a PII-free operational success alert', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const response = await worker.fetch(
      leadRequest({
        name: 'Секретное Имя',
        phone: '+79991234567',
      }),
      {
        ...env,
        OZON_REFERRER_NAME: 'Иванов Иван Иванович',
        OZON_REFERRER_PHONE: '+7(999)000-00-00',
        TELEGRAM_BOT_TOKEN: 'test-token',
        TELEGRAM_CHAT_ID: '123',
      },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const telegramRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(telegramRequest.text).toContain('Статус заявки Ozon');
    expect(telegramRequest.text).not.toContain('Секретное Имя');
    expect(telegramRequest.text).not.toContain('+7(999)123-45-67');
  });

  it('does not copy candidate or upstream response PII into Telegram or logs on errors', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        '{"candidate":"Секретное Имя","phone":"+7(999)123-45-67"}',
        { status: 500 },
      ))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await worker.fetch(
      leadRequest({
        name: 'Секретное Имя',
        phone: '+79991234567',
      }),
      {
        ...env,
        OZON_REFERRER_NAME: 'Иванов Иван Иванович',
        OZON_REFERRER_PHONE: '+7(999)000-00-00',
        TELEGRAM_BOT_TOKEN: 'test-token',
        TELEGRAM_CHAT_ID: '123',
      },
    );

    expect(response.status).toBe(502);
    const telegramRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    const observabilityOutput = JSON.stringify({
      telegram: telegramRequest,
      logs: warn.mock.calls,
    });
    expect(observabilityOutput).not.toContain('Секретное Имя');
    expect(observabilityOutput).not.toContain('+7(999)123-45-67');
    expect(observabilityOutput).not.toContain('candidate');
  });
});
