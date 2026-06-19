(function () {
	const modal = document.getElementById('ozon-lead-modal');
	if (!modal) return;

	const ozonLeadApi = String(modal.dataset.ozonLeadApi || '').trim();
	const form = document.getElementById('ozon-lead-form');
	const submitBtn = document.getElementById('ozon-lead-submit');
	const errorEl = document.getElementById('ozon-lead-error');
	const stageForm = modal.querySelector('[data-stage="form"]');
	const stageSuccess = modal.querySelector('[data-stage="success"]');

	const showError = (msg) => {
		if (!errorEl) return;
		errorEl.textContent = msg;
		errorEl.classList.remove('hidden');
	};
	const clearError = () => errorEl?.classList.add('hidden');

	const setBusy = (busy) => {
		if (!submitBtn) return;
		submitBtn.disabled = busy;
		submitBtn.classList.toggle('busy', busy);
	};

	const open = (context) => {
		modal.classList.remove('hidden');
		document.body.classList.add('ozon-lead-modal-open');
		modal.dataset.context = JSON.stringify(context || {});
		stageForm?.classList.remove('hidden');
		stageSuccess?.classList.add('hidden');
		clearError();
		// QW12: touch autofocus opens the keyboard and covers the modal.
		if (!window.matchMedia('(pointer: coarse)').matches) {
			setTimeout(() => form?.querySelector('input[name="name"]')?.focus(), 50);
		}
		if (typeof window.gtag === 'function') {
			window.gtag('event', 'ozon_lead_open', {
				context_company: context?.company || '',
				context_city: context?.city || '',
				context_position: context?.position || '',
			});
		}
	};

	const close = () => {
		modal.classList.add('hidden');
		document.body.classList.remove('ozon-lead-modal-open');
		form?.reset();
		setBusy(false);
		clearError();
	};

	window.openOzonLeadModal = open;

	modal.querySelectorAll('[data-ozon-lead-close]').forEach((el) => {
		el.addEventListener('click', close);
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
	});

	document.addEventListener('click', (event) => {
		const trigger = event.target instanceof Element
			? event.target.closest('[data-lead-form-type="ozon"]')
			: null;
		if (!trigger) return;
		event.preventDefault();
		open({
			company: trigger.dataset.applyCompany || 'Ozon',
			city: trigger.dataset.applyCity || '',
			transport: trigger.dataset.applyTransport || '',
			position: trigger.dataset.applyPosition || '',
			ozonVacancy: trigger.dataset.ozonVacancy || '',
			ozonCustomer: trigger.dataset.ozonCustomer || '',
			ozonCityId: trigger.dataset.ozonCityId || '',
			ozonHireObjectUuid: trigger.dataset.ozonHireObjectUuid || '',
		});
	});

	const submitToWorker = async (data, ctx) => {
		if (!ozonLeadApi) {
			console.warn('[ozon-lead] submission skipped — PUBLIC_OZON_LEAD_API is not set in this build');
			return { skipped: true };
		}
		const response = await fetch(ozonLeadApi, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: data.name,
				phone: data.phone,
				transport: data.transport,
				vacancy: (ctx && ctx.ozonVacancy) || '',
				customer: (ctx && ctx.ozonCustomer) || '',
				cityID: (ctx && ctx.ozonCityId) || '',
				hireObjectUUID: (ctx && ctx.ozonHireObjectUuid) || '',
			}),
		});
		let payload = null;
		try {
			payload = await response.json();
		} catch (_) {
			payload = null;
		}
		if (!response.ok || (payload && payload.ok === false)) {
			const errCode = (payload && payload.error) || (`http_${response.status}`);
			throw new Error(errCode);
		}
		return { sent: true };
	};

	const transportLabels = {
		auto: 'Авто',
		foot: 'Пешком',
		bicycle: 'Велосипед / самокат',
	};

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearError();
		const formData = new FormData(form);
		const name = String(formData.get('name') ?? '').trim();
		const phoneRaw = String(formData.get('phone') ?? '').trim();
		const transportKey = String(formData.get('transport') ?? 'auto');
		const transport = transportLabels[transportKey] || transportKey;

		if (name.length < 2) {
			showError('Укажите имя — минимум 2 символа.');
			return;
		}
		const phoneDigits = phoneRaw.replace(/\D+/g, '');
		if (phoneDigits.length < 10) {
			showError('Похоже, в номере не хватает цифр. Проверьте телефон.');
			return;
		}

		let ctx = {};
		try {
			ctx = JSON.parse(modal.dataset.context || '{}');
		} catch (_) {
			ctx = {};
		}

		setBusy(true);
		try {
			const result = await submitToWorker({ name, phone: phoneRaw, transport }, ctx);
			if (!result || result.sent !== true) {
				showError('Форма временно недоступна, попробуйте позже.');
				return;
			}
			if (typeof window.gtag === 'function') {
				window.gtag('event', 'ozon_lead_submit', {
					transport: transportKey,
					context_position: ctx.position || '',
				});
			}
			stageForm?.classList.add('hidden');
			stageSuccess?.classList.remove('hidden');
		} catch (err) {
			console.warn('[ozon-lead] submit failed', err);
			const code = String(err?.message || '');
			let msg = 'Не удалось отправить заявку. Попробуйте ещё раз через минуту.';
			if (code === 'invalid_phone') msg = 'Похоже, в номере не хватает цифр. Проверьте телефон.';
			else if (code === 'name_too_short') msg = 'Укажите имя — минимум 2 символа.';
			else if (code === 'ozon_submit_failed') msg = 'Ozon временно не отвечает. Попробуйте через минуту.';
			showError(msg);
		} finally {
			setBusy(false);
		}
	});
})();
