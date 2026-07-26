import {
  getJobPostingEligibility,
  type JobPostingEligibilityInput,
  type JobPostingEligibilityReason,
} from '../utils/jobPostingEligibility';

/**
 * Search Console → Job Postings → Valid items, captured read-only on
 * 2026-07-10 from the 2026-07-09 report. The historical cohort is retained
 * for URL/indexability continuity and review tracking only. Since 2026-07-26,
 * JobPosting markup is controlled by the all-active vacancy policy, not by
 * this old bridge cohort.
 */
export const LEGACY_GSC_VALID_JOB_PATHS = [
  '/v/voxys-call-center-operator-chelyabinsk-office/',
  '/v/ruki-door-installer-ivanteevka-service/',
  '/v/ozon-truck-driver-rostov-na-donu-auto/',
  '/v/ozon-goods-handler-horugvino-foot/',
  '/v/ozon-fresh-courier-nizhniy-novgorod-foot/',
  '/v/ruki-door-installer-kolomna-service/',
  '/v/kuper-foot-courier-novovoronezh-foot/',
  '/v/ozon-truck-driver-novosibirsk-auto/',
  '/v/ozon-goods-handler-dmitrov-foot/',
  '/v/samokat-courier-krasnodar-bicycle/',
  '/v/ruki-door-installer-balashiha-service/',
  '/v/kuper-foot-courier-sankt-peterburg-foot/',
  '/v/ozon-goods-handler-nevinnomyssk-foot/',
  '/v/alfa-bank-representative-kazan-foot/',
  '/v/ruki-kitchen-assembler-dubna-service/',
  '/v/ozon-fresh-courier-samara-foot/',
  '/v/ozon-fresh-courier-bykovo-foot/',
  '/v/ruki-kitchen-assembler-mozhaysk-service/',
  '/v/yandex-go-courier-belarus-minsk-auto/',
  '/v/qlean-cleaner-aprelevka-service/',
  '/v/samokat-courier-barnaul-bicycle/',
  '/v/kuper-auto-courier-volzhsk-auto/',
  '/v/tetrika-teacher-irbit-remote/',
  '/v/burger-king-cook-cashier-nizhniy-novgorod-foot/',
  '/v/tetrika-teacher-tetyushi-remote/',
  '/v/tetrika-teacher-trehgornyy-remote/',
  '/v/tetrika-teacher-lytkarino-remote/',
  '/v/ruki-kitchen-assembler-kotelniki-service/',
  '/v/mts-bank-operator-voskresensk-remote/',
] as const;

export const LEGACY_JOBPOSTING_REVIEW_BY = '2026-08-10';

const legacyValidPathSet = new Set<string>(LEGACY_GSC_VALID_JOB_PATHS);
const legacyReviewDeadline = new Date(
  `${LEGACY_JOBPOSTING_REVIEW_BY}T23:59:59.999Z`,
).getTime();

type JobPostingRolloutReason =
  | JobPostingEligibilityReason
  | 'legacy_bridge_expired';

type ResolveJobPostingRolloutInput = {
  path: string;
  evidence: JobPostingEligibilityInput;
  now?: Date;
};

export type JobPostingRolloutDecision = {
  emit: boolean;
  mode: 'jobposting_markup' | 'blocked';
  reasons: JobPostingRolloutReason[];
};

export const resolveJobPostingRollout = ({
  path,
  evidence,
  now = new Date(),
}: ResolveJobPostingRolloutInput): JobPostingRolloutDecision => {
  const strictDecision = getJobPostingEligibility(evidence, { now });
  if (strictDecision.eligible) {
    return { emit: true, mode: 'jobposting_markup', reasons: [] };
  }

  const isLegacyPath = legacyValidPathSet.has(path);
  const bridgeExpired = now.getTime() > legacyReviewDeadline;

  return {
    emit: false,
    mode: 'blocked',
    reasons: [
      ...strictDecision.reasons,
      ...(isLegacyPath && bridgeExpired ? ['legacy_bridge_expired' as const] : []),
    ],
  };
};
