# Timeweb deployment

This project keeps GitHub as the source of truth and uses Timeweb only as the
static hosting runtime. GitHub Actions builds Astro and publishes the generated
`dist/` folder to Timeweb over a restricted FTP account.

## Target architecture

```text
git push main
  -> GitHub Actions
  -> npm ci
  -> npm run lint / typecheck / test
  -> npm run build
  -> npm run check:yandex-feed
  -> npm run test:dist
  -> npm run size:dist:check
  -> FTP sync dist/ to Timeweb public_html
```

GitHub Pages can stay enabled as a rollback/fallback during migration. DNS is
switched to Timeweb only after the Timeweb copy is verified.

## Timeweb setup

1. In Timeweb, create or verify the site `kurerok.ru`.
2. Enable SSL for `kurerok.ru` after the site exists.
3. Create a dedicated "Пользователь ПУ/FTP" for deployment.
4. Scope that user to the exact website directory:

```text
/kurerok.ru/public_html
```

When the FTP user is scoped to `kurerok.ru/public_html`, FTP `/` is already the
site root. Do not use the main Timeweb account password for CI.

## GitHub configuration

Create the GitHub Environment:

```text
timeweb-production
```

Recommended: enable required reviewers for this environment until the first
several deployments are proven stable.

Add these environment secrets:

```text
TIMEWEB_FTP_HOST       vh440.timeweb.ru
TIMEWEB_FTP_USER       cw556341_<deploy-user>
TIMEWEB_FTP_PASSWORD   <deploy-user-password>
```

Add these environment variables:

```text
TIMEWEB_REMOTE_DIR                 /
TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT   true
TIMEWEB_FTP_PORT                   21
TIMEWEB_FTP_TLS                    false
TIMEWEB_VERIFY_URL                 <empty until DNS cutover>
```

`TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT=true` is a safety latch. It is valid only
when the FTP user is scoped to `kurerok.ru/public_html`. If the FTP user is not
scoped, set `TIMEWEB_REMOTE_DIR` to the absolute public directory instead, for
example `/kurerok.ru/public_html/`, and leave the safety latch unset.

Leave `TIMEWEB_VERIFY_URL` empty before DNS cutover unless Timeweb gives a
technical preview URL. If it is set to `https://kurerok.ru/` too early, the
workflow will only smoke-check the current GitHub Pages copy.

Keep the existing repository variable:

```text
PUBLIC_OZON_LEAD_API
```

## First deployment

1. Run the `Deploy Astro to Timeweb` workflow manually with
   `workflow_dispatch`.
2. Confirm the deploy job completed.
3. Before DNS cutover, verify through a Timeweb preview or direct hosting check
   if available.
4. After DNS points to Timeweb, set `TIMEWEB_VERIFY_URL=https://kurerok.ru/`.
5. Enable automatic deployment by setting repository/environment variable:

```text
TIMEWEB_AUTO_DEPLOY=true
```

Until `TIMEWEB_AUTO_DEPLOY=true`, pushes to `main` do not deploy to Timeweb.
Manual dispatch remains available.

`TIMEWEB_AUTO_DEPLOY` must be a repository variable because it controls whether
the build job starts on `push`. The `TIMEWEB_*` deployment settings above can be
environment variables on `timeweb-production`.

The repository includes a helper for the GitHub side of the setup:

```bash
cd kurieros-astro
export TIMEWEB_FTP_USER='cw556341_<deploy-user>'
export TIMEWEB_FTP_PASSWORD='<deploy-user-password>'
npm run deploy:timeweb:setup
unset TIMEWEB_FTP_USER TIMEWEB_FTP_PASSWORD
```

The script creates/updates the `timeweb-production` environment, stores the
Timeweb FTP settings as GitHub environment secrets/variables, and leaves
`TIMEWEB_AUTO_DEPLOY=false` unless explicitly overridden. It does not create the
FTP user in Timeweb.

Check readiness without changing GitHub settings:

```bash
cd kurieros-astro
npm run deploy:timeweb:check
```

Before the commit is pushed and the GitHub environment is configured, this
preflight is expected to fail on the remote workflow, environment, secrets, and
variables. After setup, all required checks should pass; `TIMEWEB_AUTO_DEPLOY`
may remain a warning until automatic deploys are intentionally enabled.

After the commit is pushed to `main`, start the first deployment manually:

```bash
npm run deploy:timeweb:run
npm run deploy:timeweb:watch
```

## Rollback

Before DNS cutover: keep GitHub Pages DNS records unchanged.

After DNS cutover:

1. Re-run the workflow on a known-good commit, or revert and push a fix.
2. If Timeweb is unhealthy and GitHub Pages is still configured, temporarily
   point DNS back to GitHub Pages records.

## Safety notes

- Do not commit FTP passwords or Timeweb panel tokens.
- Keep the deploy FTP user scoped to `kurerok.ru/public_html`.
- The workflow preserves `.htaccess` and `.well-known/` on the server while
  deleting stale generated site files.
- DNS changes are not automated by this workflow.
