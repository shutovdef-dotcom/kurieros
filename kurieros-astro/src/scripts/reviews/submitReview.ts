export type ReviewPayload = {
  name: string;
  city: string;
  pros: string;
  cons: string;
  comment: string;
  rating: string;
  jobId: string | null;
  submittedAt: string;
};

export type ReviewSubmitResult =
  | { ok: true; mode: 'api' | 'local' }
  | { ok: false; error: 'review_submit_failed' | 'review_submit_unavailable' };

type FetchLike = typeof fetch;

export function normalizeReviewsApi(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

export async function submitReview(
  reviewsApi: string,
  payload: ReviewPayload,
  fetchImpl: FetchLike = fetch,
): Promise<ReviewSubmitResult> {
  const endpoint = normalizeReviewsApi(reviewsApi);
  if (!endpoint) {
    return { ok: true, mode: 'local' };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false, error: 'review_submit_failed' };
    }
    return { ok: true, mode: 'api' };
  } catch {
    return { ok: false, error: 'review_submit_unavailable' };
  }
}
