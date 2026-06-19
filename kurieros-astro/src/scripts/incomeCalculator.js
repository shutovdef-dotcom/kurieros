const calculatorRoot = document.getElementById('income-calculator');

if (calculatorRoot && calculatorRoot.dataset.ready !== 'true') {
	calculatorRoot.dataset.ready = 'true';

	const ratesJson = calculatorRoot.dataset.rates || '{}';
	const fallbackRateJson = calculatorRoot.dataset.fallbackRate || '{}';
	let rates = {};
	try { rates = JSON.parse(ratesJson); } catch (error) { console.error('[calc] bad ratesJson', error); }
	let fallbackRate = {};
	try { fallbackRate = JSON.parse(fallbackRateJson); } catch (error) { console.error('[calc] bad fallbackRateJson', error); }

	const daysRange = document.getElementById('days-range');
	const hoursRange = document.getElementById('hours-range');
	const citySelect = document.getElementById('calc-city-select');
	const transportSelect = document.getElementById('calc-transport-select');
	const daysVal = document.getElementById('days-val');
	const hoursVal = document.getElementById('hours-val');
	const totalAmount = document.getElementById('total-amount');
	const totalCurrency = document.getElementById('total-currency');

	let lastResult = 0;

	function normalizeRateEntry(entry, fallback) {
		if (typeof entry === 'number' && Number.isFinite(entry)) {
			return { rate: entry, label: '₽' };
		}
		if (entry && typeof entry === 'object') {
			const rate = Number(entry.rate);
			if (Number.isFinite(rate) && rate > 0) {
				return {
					rate,
					label: String(entry.label || '₽'),
				};
			}
		}
		return fallback;
	}

	function calculate() {
		if (!daysRange || !hoursRange || !citySelect || !daysVal || !hoursVal || !totalAmount) return;
		const days = Number.parseInt(daysRange.value, 10);
		const hours = Number.parseInt(hoursRange.value, 10);
		const cityName = citySelect.value;
		const transport = transportSelect ? transportSelect.value : 'auto';
		const ratesForTransport = rates[transport] || rates.auto || {};
		const transportFallback = normalizeRateEntry(
			(fallbackRate && fallbackRate[transport]) || fallbackRate.auto,
			{ rate: 350, label: '₽' },
		);
		const rateEntry = normalizeRateEntry(ratesForTransport[cityName], transportFallback);
		const total = days * hours * rateEntry.rate * 1.2;

		daysVal.textContent = days;
		hoursVal.textContent = hours;
		totalAmount.textContent = total.toLocaleString('ru-RU');
		if (totalCurrency) totalCurrency.textContent = rateEntry.label;
		lastResult = total;
	}

	function dispatchCalculatorSubmit() {
		if (!daysRange || !hoursRange || !citySelect) return;
		const days = Number.parseInt(daysRange.value, 10);
		const hours = Number.parseInt(hoursRange.value, 10);
		window.dispatchEvent(new CustomEvent('kurieros:calculator-submit', {
			detail: {
				source: 'income_calculator',
				city: citySelect.value,
				hours_per_day: hours,
				days_per_month: days,
				result_monthly: Math.round(lastResult),
			},
		}));
	}

	daysRange?.addEventListener('input', calculate);
	hoursRange?.addEventListener('input', calculate);
	citySelect?.addEventListener('change', calculate);
	transportSelect?.addEventListener('change', calculate);

	daysRange?.addEventListener('change', dispatchCalculatorSubmit);
	hoursRange?.addEventListener('change', dispatchCalculatorSubmit);
	citySelect?.addEventListener('change', dispatchCalculatorSubmit);
	transportSelect?.addEventListener('change', dispatchCalculatorSubmit);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', calculate, { once: true });
	} else {
		calculate();
	}
}
