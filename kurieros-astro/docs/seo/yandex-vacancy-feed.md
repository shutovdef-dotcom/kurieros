# Yandex vacancy feed

`/yandex-vacancies.xml` is the YML feed for Yandex Webmaster rich search results in the **Vacancies** business category.

## What it contains

- Active RUB vacancies that have public detail pages under `/v/`.
- `sets` for city listings, category listings, transport hubs, and company pages when the set has at least 3 offers.
- `offers` with employer, vacancy URL, monthly salary, category, unique logo URL, conversion score, region, schedule, employment type, and publication date.

The feed intentionally excludes non-RUB vacancies in the first version because the first Webmaster upload should target the **Russia** region and `RUR` currency.

## Local checks

```bash
npm run check:yandex-feed
npm run build
```

After build, inspect:

```text
dist/yandex-vacancies.xml
```

## Webmaster upload

Upload URL:

```text
https://kurerok.ru/yandex-vacancies.xml
```

In Yandex Webmaster:

1. Open **Услуги и предложения в поиске** -> **Фиды и ошибки**.
2. Click **Загрузить фид**.
3. Choose business category **Вакансии**.
4. Choose region **Россия**.
5. Paste `https://kurerok.ru/yandex-vacancies.xml`.

Do not add duplicate copies of the same feed URL. If Yandex reports errors, fix the generator and request recheck in Webmaster.
