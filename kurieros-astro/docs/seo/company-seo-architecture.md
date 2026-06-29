# SEO-архитектура страниц компаний

Цель: у каждого работодателя есть одна главная индексируемая страница
бренда, а коммерческие листинги не конкурируют с ней по тому же интенту.

## Правило URL

Главная SEO-страница работодателя всегда:

```text
/companies/{companySlug}/
```

Она рендерится через `CompanyEditorialGuidePage` и строится из
`getCompanyGuide(slug, company)`. Если ручного override нет, guide создается
автоматически из `CompanyEntity`.

Коммерческие страницы вида `/rabota-kurerom-{brand}/` остаются списками
вакансий и CTA-страницами. Если такая страница совпадает с брендовым
интентом, она должна cross-canonical на `/companies/{slug}/` и ссылаться на
разбор работодателя через `src/utils/companySeo.ts`.

## Текущая карта

| Работодатель | Главная SEO-страница | Коммерческий листинг |
| --- | --- | --- |
| Купер | `/companies/kuper-ex-sbermarket/` | `/rabota-kurerom-kuper/` canonical -> company |
| Яндекс Еда | `/companies/yandex-eda/` | нет отдельного брендового листинга; `/rabota-kurerom-eda/` широкий food intent |
| Самокат | `/companies/samokat/` | `/rabota-kurerom-samokat/` canonical -> company |
| Ozon | `/companies/ozon/` | `/rabota-kurerom-ozon/` canonical -> company |
| Ozon fresh | `/companies/ozon-fresh/` | нет отдельного листинга |
| Альфа-Банк | `/companies/alfa-bank/` | нет отдельного листинга |
| Т-Банк | `/companies/t-bank/` | нет отдельного листинга |
| Тетрика | `/companies/tetrika/` | нет отдельного листинга |
| Остальные компании | `/companies/{slug}/` | только если добавлен в `COMPANY_COMMERCIAL_HUBS` |

## Чеклист новой компании

При добавлении нового работодателя проверь:

1. `src/data/companyHomepages.ts` — официальный сайт для `hiringOrganization.url`.
2. `src/data/companyIndustry.ts` — корректная отрасль для JobPosting.
3. `src/utils/companyPopularity.ts` — место в витринной сортировке каталога.
4. `src/data/partnerLinks.ts` и исходный `VacancySource` — логотип, CPA/lead URL, UTM.
5. `/companies/{slug}/` — guide появляется автоматически; ручной override в `companyGuides.ts` нужен только для крупных брендов или сложного FAQ.
6. `src/utils/companySeo.ts` — добавь commercial hub только если есть отдельный `/rabota-kurerom-{brand}/` листинг.
7. Вакансии `/v/{slug}/` должны ссылаться на `/companies/{slug}/`, а не на внешний `applyLink`.
8. Если добавлен brand listing, проверь canonical, внутреннюю ссылку на employer guide и отсутствие конкурирующего H1/description.

Контракт закреплен в `tests/companySeo.test.ts`: компания не должна попасть
в каталог без базовой SEO-интеграции.
