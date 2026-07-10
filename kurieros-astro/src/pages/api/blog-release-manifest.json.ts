import type { APIRoute } from 'astro';
import { BLOG_RELEASE_MANIFEST } from '../../utils/blogManifest';

export const prerender = true;

/**
 * The deployed release manifest is intentionally public and contains only
 * already released URLs. Scheduled CI uses it to reconcile an interrupted
 * deployment; it is never a queue of future drafts.
 */
export const GET: APIRoute = () => new Response(
  JSON.stringify(BLOG_RELEASE_MANIFEST, null, 2),
  {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  },
);
