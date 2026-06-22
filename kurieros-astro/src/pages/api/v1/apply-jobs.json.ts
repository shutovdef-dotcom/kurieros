import jobsData, { detailJobs } from '../../../data/jobs';
import { buildApplyManifest } from '../../../utils/applyManifest';

export const GET = () => new Response(
  JSON.stringify(buildApplyManifest([...jobsData, ...detailJobs])),
  {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  },
);
