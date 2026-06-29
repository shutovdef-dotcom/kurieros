const DEFAULT_MAX_SERP_TITLE_LENGTH = 70;
const BRAND_SUFFIX = ' | КурьерОк';
const TRAILING_SEPARATOR_RE = /[\s,;:|·—-]+$/u;

type VacancySeoTitleInput = {
	title: string;
	salary: string;
	benefitHook?: string;
	maxLength?: number;
};

const normalizeTitlePart = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripTrailingSeparators = (value: string): string =>
	value.replace(TRAILING_SEPARATOR_RE, '').trim();

const trimAtWordBoundary = (value: string, maxLength: number): string => {
	const normalized = normalizeTitlePart(value);
	if (normalized.length <= maxLength) return normalized;

	const hardCut = normalized.slice(0, maxLength).trimEnd();
	const lastSpace = hardCut.lastIndexOf(' ');
	const minUsefulLength = Math.floor(maxLength * 0.62);
	const candidate = lastSpace >= minUsefulLength ? hardCut.slice(0, lastSpace) : hardCut;

	return stripTrailingSeparators(candidate);
};

const withBrandWhenFits = (value: string, maxLength: number): string | null => {
	const branded = `${value}${BRAND_SUFFIX}`;
	return branded.length <= maxLength ? branded : null;
};

export const buildVacancySeoTitle = ({
	title,
	salary,
	benefitHook,
	maxLength = DEFAULT_MAX_SERP_TITLE_LENGTH,
}: VacancySeoTitleInput): string => {
	const baseTitle = normalizeTitlePart(`${title} — ${salary}`);
	const hook = normalizeTitlePart(benefitHook ?? '');
	const titleWithHook = hook ? `${baseTitle} · ${hook}` : baseTitle;

	const brandedWithHook = withBrandWhenFits(titleWithHook, maxLength);
	if (brandedWithHook) return brandedWithHook;

	const brandedBase = withBrandWhenFits(baseTitle, maxLength);
	if (brandedBase) return brandedBase;

	if (baseTitle.length <= maxLength) return baseTitle;

	return trimAtWordBoundary(baseTitle, maxLength);
};
