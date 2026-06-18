import { describe, expect, it, vi } from 'vitest';

import {
  normalizeReviewsApi,
  submitReview,
  type ReviewPayload,
} from '../src/scripts/reviews/submitReview';

const payload: ReviewPayload = {
  name: 'Алексей',
  city: 'Москва',
  pros: 'Удобный график',
  cons: '',
  comment: 'Нормальный вариант для подработки.',
  rating: '5',
  jobId: '100011',
  submittedAt: '2026-06-13T00:00:00.000Z',
};

describe('review submit layer', () => {
  it('normalizes the reviews API endpoint', () => {
    expect(normalizeReviewsApi('  https://worker.example/reviews  ')).toBe(
      'https://worker.example/reviews',
    );
    expect(normalizeReviewsApi(undefined)).toBe('');
  });

  it('uses local fallback when no endpoint is configured', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(submitReview('', payload, fetchMock)).resolves.toEqual({
      ok: true,
      mode: 'local',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts JSON payload to the configured endpoint', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    await expect(
      submitReview('https://worker.example/reviews', payload, fetchMock),
    ).resolves.toEqual({ ok: true, mode: 'api' });

    expect(fetchMock).toHaveBeenCalledWith('https://worker.example/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('returns a stable failure on non-2xx responses', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(
      submitReview('https://worker.example/reviews', payload, fetchMock),
    ).resolves.toEqual({ ok: false, error: 'review_submit_failed' });
  });

  it('returns a stable failure on network errors', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));

    await expect(
      submitReview('https://worker.example/reviews', payload, fetchMock),
    ).resolves.toEqual({ ok: false, error: 'review_submit_unavailable' });
  });
});
