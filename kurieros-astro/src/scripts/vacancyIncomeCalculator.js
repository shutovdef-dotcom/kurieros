const vacancyIncomeCalculator = document.getElementById('vacancy-income-calculator');

if (vacancyIncomeCalculator) {
	const calculatorKind = vacancyIncomeCalculator.dataset.calculatorKind || 'hourly';
	const currencyLabel = vacancyIncomeCalculator.dataset.currencyLabel || '₽';
	const formatMoney = (value) => `${Math.round(value).toLocaleString('ru-RU')} ${currencyLabel}`;
	const formatHourlyRate = (value) => `${Math.round(value).toLocaleString('ru-RU')} ${currencyLabel}/час`;

	if (calculatorKind === 'hourly') {
		const hourlyRate = Number.parseInt(vacancyIncomeCalculator.dataset.hourlyRate ?? '', 10);
		const daysRange = vacancyIncomeCalculator.querySelector('#vacancy-days-range');
		const hoursRange = vacancyIncomeCalculator.querySelector('#vacancy-hours-range');
		const daysValue = vacancyIncomeCalculator.querySelector('#vacancy-days-value');
		const hoursValue = vacancyIncomeCalculator.querySelector('#vacancy-hours-value');
		const totalValue = vacancyIncomeCalculator.querySelector('#vacancy-income-total');
		const formulaValue = vacancyIncomeCalculator.querySelector('#vacancy-income-formula');

		let lastTotal = 0;

		const updateIncome = () => {
			if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return;
			const days = Number.parseInt(daysRange?.value ?? '22', 10);
			const hours = Number.parseInt(hoursRange?.value ?? '8', 10);
			const total = Math.round(days * hours * hourlyRate);
			const formattedRate = formatHourlyRate(hourlyRate);

			if (daysValue) daysValue.textContent = String(days);
			if (hoursValue) hoursValue.textContent = String(hours);
			if (totalValue) totalValue.textContent = formatMoney(total);
			if (formulaValue) formulaValue.textContent = `${days} дн × ${hours} ч × ${formattedRate}`;
			lastTotal = total;
		};

		const dispatchVacancyCalcSubmit = () => {
			const days = Number.parseInt(daysRange?.value ?? '22', 10);
			const hours = Number.parseInt(hoursRange?.value ?? '8', 10);
			window.dispatchEvent(new CustomEvent('kurieros:calculator-submit', {
				detail: {
					source: 'vacancy_income_calculator',
					city: vacancyIncomeCalculator.dataset.city || '',
					transport: vacancyIncomeCalculator.dataset.transport || '',
					hours_per_day: hours,
					days_per_month: days,
					result_monthly: lastTotal,
				},
			}));
		};

		daysRange?.addEventListener('input', updateIncome);
		hoursRange?.addEventListener('input', updateIncome);
		daysRange?.addEventListener('change', dispatchVacancyCalcSubmit);
		hoursRange?.addEventListener('change', dispatchVacancyCalcSubmit);
		updateIncome();
	} else if (calculatorKind === 'meeting') {
		const monthlyBase = Number.parseInt(vacancyIncomeCalculator.dataset.monthlyBase ?? '', 10);
		const meetingFee = Number.parseInt(vacancyIncomeCalculator.dataset.meetingFee ?? '', 10);
		const daysRange = vacancyIncomeCalculator.querySelector('#vacancy-days-range');
		const meetingsRange = vacancyIncomeCalculator.querySelector('#vacancy-meetings-range');
		const daysValue = vacancyIncomeCalculator.querySelector('#vacancy-days-value');
		const meetingsValue = vacancyIncomeCalculator.querySelector('#vacancy-meetings-value');
		const totalValue = vacancyIncomeCalculator.querySelector('#vacancy-income-total');
		const formulaValue = vacancyIncomeCalculator.querySelector('#vacancy-income-formula');

		let lastTotal = 0;

		const updateIncome = () => {
			if (!Number.isFinite(monthlyBase) || !Number.isFinite(meetingFee)) return;
			const days = Number.parseInt(daysRange?.value ?? '22', 10);
			const meetings = Number.parseInt(meetingsRange?.value ?? '4', 10);
			const total = Math.round(monthlyBase + days * meetings * meetingFee);

			if (daysValue) daysValue.textContent = String(days);
			if (meetingsValue) meetingsValue.textContent = String(meetings);
			if (totalValue) totalValue.textContent = formatMoney(total);
			if (formulaValue) {
				formulaValue.textContent = `${formatMoney(monthlyBase)} база + ${days} дн × ${meetings} встреч × ${formatMoney(meetingFee)}`;
			}
			lastTotal = total;
		};

		const dispatchVacancyCalcSubmit = () => {
			const days = Number.parseInt(daysRange?.value ?? '22', 10);
			const meetings = Number.parseInt(meetingsRange?.value ?? '4', 10);
			window.dispatchEvent(new CustomEvent('kurieros:calculator-submit', {
				detail: {
					source: 'vacancy_meeting_calculator',
					city: vacancyIncomeCalculator.dataset.city || '',
					transport: vacancyIncomeCalculator.dataset.transport || '',
					meetings_per_day: meetings,
					days_per_month: days,
					result_monthly: lastTotal,
				},
			}));
		};

		daysRange?.addEventListener('input', updateIncome);
		meetingsRange?.addEventListener('input', updateIncome);
		daysRange?.addEventListener('change', dispatchVacancyCalcSubmit);
		meetingsRange?.addEventListener('change', dispatchVacancyCalcSubmit);
		updateIncome();
	}
}
