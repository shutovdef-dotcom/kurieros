# kurerok-ozon-lead — Cloudflare Worker

Серверный прокси для лид-формы Ozon на kurerok.ru.

## Как это работает

```
Пользователь
    ↓ заполняет форму на kurerok.ru (имя + телефон)
[OzonLeadModal.astro]
    ↓ POST { name, phone, transport? }
[Cloudflare Worker]  ← реф-телефон владельца хранится здесь, в browser НЕ виден
    ↓ POST на https://sigma-bff-api.ozon.ru/v1/actions
[Ozon Recruitment API]
    ↘ PII-free статус в Telegram (без имени, телефона и ответа Ozon)
    ↓ SMS на телефон пользователя
Пользователь регится через Госуслуги в приложении Ozon Job
```

Реф-телефон владельца **никогда** не попадает в HTML/JS на стороне браузера —
он живёт только в Worker secret.

## Деплой (один раз)

### 1. Установить wrangler CLI

```sh
npm install -g wrangler
wrangler login   # откроет браузер для входа в Cloudflare
```

### 2. Создать Cloudflare-аккаунт (если ещё нет)

https://dash.cloudflare.com/sign-up — бесплатный план.
Workers free tier — 100 000 запросов/день.

### 3. Запустить деплой

```sh
cd workers/ozon-lead
wrangler deploy
```

После первого деплоя получите URL вида
`https://kurerok-ozon-lead.<ваш-аккаунт>.workers.dev`.

### 4. Прописать secrets

```sh
wrangler secret put OZON_REFERRER_NAME
# Введите ФИО реферера: Иванов Иван Иванович

wrangler secret put OZON_REFERRER_PHONE
# Введите ваш реф-телефон в формате +7(XXX)XXX-XX-XX
# Пример: +7(996)951-96-41

wrangler secret put TELEGRAM_BOT_TOKEN
# Введите токен бота из @BotFather

wrangler secret put TELEGRAM_CHAT_ID
# Введите ваш chat_id (число)
```

### 5. Прописать Worker URL в kurerok.ru

В GitHub Actions Variables добавить:

- `PUBLIC_OZON_LEAD_API` = `https://kurerok-ozon-lead.<ваш-аккаунт>.workers.dev/lead`

Затем редеплой kurerok.ru:

```sh
cd kurieros-astro
git commit --allow-empty -m "chore: trigger redeploy with PUBLIC_OZON_LEAD_API"
git push
```

## Локальная разработка

```sh
wrangler dev   # запускает Worker на http://localhost:8787
# Тест:
curl -X POST http://localhost:8787/lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Тестовый Кандидат","phone":"+79001234567"}'
```

Локальные проверки из корня репозитория:

```sh
npm run lint:worker
npm run test:worker
npm run check:worker
```

`check:worker` запускает lint и unit-тесты Worker helpers / request handler.
POST в реальные Ozon/Telegram API в тестах не выполняется.

## Эндпоинты

| Метод | Путь | Назначение |
|-------|------|-----------|
| `OPTIONS` | `/lead` | CORS preflight (kurerok.ru разрешён) |
| `POST` | `/lead` | Передать имя и телефон в Ozon; отправить в Telegram только PII-free статус |

### Тело POST (от kurerok.ru)

```json
{
  "name": "Иванов Иван Иванович",
  "phone": "+79991234567"
}
```

### Ответ

```json
{ "ok": true }
```

или

```json
{ "ok": false, "error": "ozon_submit_failed" }
```

Worker больше не требует `OZON_LEAD_VERIFIED_AT` и не закрывает поток по 30-дневному timestamp.
Доступность заявки контролируется metadata вакансии на сайте, whitelist пары
`vacancy/cityID/hireObjectUUID`, CORS, rate-limit и обязательные Worker secrets.

## Ротация секретов

Если токен Telegram-бота скомпрометирован:

```sh
# 1. В Telegram @BotFather → /revoke → выберите бот → получите новый токен
# 2. Обновите Worker:
wrangler secret put TELEGRAM_BOT_TOKEN
# 3. Готово — новый токен подхватится без переразвёртывания
```

## Лимиты

- 100 000 invocations/день (free tier Cloudflare)
- 10 ms CPU per invocation
- 6 концурентных подключений к downstream API

Этого хватит для 5–10 тысяч лидов в день.

## Конфигурация (для других вакансий)

Чтобы добавить ещё одну вакансию (например, Ozon Fresh пеший в СПб),
достаточно создать второй Worker с другими `OZON_*` ID и подключить
его к новой вакансии в `vacancies.ts` через свой `lead-form:<provider>`
маркер.

UUID для разных городов и адресов можно достать через DevTools на
форме `https://recruitment.ozon.ru/ref-courier-sklad`:
- Открыть форму → выбрать нужный город/адрес
- В Network tab найти POST `actions` с `action: "GetCitiesV2"` или `"GetHireObjectsV2"`
- В response — список UUID для городов и адресов
