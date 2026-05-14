import type { APIRoute, InferGetStaticPropsType } from 'astro';
import jobsData from '../../../data/jobs';
import { getCitiesFromJobs } from '../../../utils/cities';

// Per-city slim JSON endpoint for the home page job grid.
// Generated statically for every city present in jobsData.
// Allows the home page to lazily fetch jobs for any selected city
// without inlining the full ~3.7 MB catalog into HTML.

export const getStaticPaths = () =>
	getCitiesFromJobs(jobsData).map((city) => ({
		params: { slug: city.slug },
		props: { city },
	}));

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = ({ props }) => {
	const { city } = props;
	const cityName = city.name;
	const cityLower = cityName.toLowerCase();

	const matched = jobsData.filter((job) => {
		const loc = (job.location || '').toLowerCase();
		return loc.includes(cityLower) || job.location === 'Вся Россия';
	});

	// Cap to 24 — same UX limit as the home grid.
	const slim = matched.slice(0, 24).map((job) => ({
		id: job.id,
		slug: job.slug,
		title: job.title,
		company: job.company,
		companyLogo: job.companyLogo,
		salary: job.salary,
		location: job.location,
		tags: job.tags,
		details: {
			rate: job.details.rate,
			schedule: job.details.schedule,
			education: job.details.education,
			age: job.details.age,
			payment_freq: job.details.payment_freq,
			medical_book: job.details.medical_book,
		},
		applyLink: job.applyLink,
		updatedAt: job.updatedAt,
	}));

	return new Response(
		JSON.stringify({
			city: cityName,
			total: matched.length,
			items: slim,
		}),
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=600, s-maxage=3600',
				'X-Robots-Tag': 'noindex',
			},
		},
	);
};
