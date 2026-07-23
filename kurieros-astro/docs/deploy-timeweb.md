# Timeweb deployment

This project keeps GitHub as the source of truth and uses Timeweb only as the
static hosting runtime. GitHub Actions builds Astro, packs the generated
`dist/` folder into one compressed archive, uploads that archive to Timeweb, and
unpacks it on the server.

The recommended transport is `ssh-archive`: upload one `tar.gz` with `scp`,
then unpack it over `ssh`. The fallback transport is `archive`: upload one zip
over FTP and run a temporary token-protected PHP unpacker from a Timeweb URL
that points to the same document root. Direct FTP mirroring works only as a
diagnostic fallback, because this site contains more than ten thousand generated
files and directories.

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
  -> compress dist/
  -> SSH upload one archive
  -> server-side unpack into Timeweb public_html
```

GitHub Pages can remain as an already-deployed rollback snapshot during
migration, but it is not an active deployment target. The legacy Pages workflow
has been removed so a normal push cannot race Timeweb, overwrite a blog release,
or bulk-submit the sitemap to IndexNow. Any future Pages mirror must use a
separate non-production domain and must not include automatic IndexNow sending.
DNS is switched to Timeweb only after the Timeweb copy is verified.

## Timeweb setup

1. In Timeweb, create or verify the site `kurerok.ru`.
2. Enable SSL for `kurerok.ru` after the site exists.
3. Create a dedicated "Пользователь ПУ/FTP" for deployment.
4. Scope that user to the exact website directory. In this Timeweb account,
   `kurerok.ru` is attached to the "Основной сайт", whose document root is:

```text
/public_html
```

When the FTP user is scoped to `/public_html`, FTP `/` is already the site root.
Do not use the main Timeweb account password for CI.

5. For the preferred `ssh-archive` method, enable SSH access in Timeweb, add a
   deploy public key, and identify the absolute SSH path for the same document
   root as `/public_html`.
   In the current Timeweb panel, SSH access is shown as disabled until it is
   activated from the hosting dashboard.
6. For the fallback `archive` method, create a Timeweb technical domain that
   points to the same `/public_html` document root. Use it as
   `TIMEWEB_UNPACK_URL` so GitHub Actions can trigger the temporary unpacker
   while public `kurerok.ru` still points to GitHub Pages. After DNS cutover,
   replace it with `https://kurerok.ru`.

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
TIMEWEB_DEPLOY_METHOD              ssh-archive
TIMEWEB_SSH_PORT                   22
TIMEWEB_SSH_REMOTE_ROOT            <absolute public_html path over SSH>
TIMEWEB_UNPACK_URL                 https://<timeweb-technical-domain>
TIMEWEB_UNPACK_INSECURE_HTTPS      false
TIMEWEB_VERIFY_URL                 <empty until DNS cutover>
```

For `ssh-archive`, add these environment secrets instead of relying on FTP for
the deploy transport:

```text
TIMEWEB_SSH_HOST          vh440.timeweb.ru
TIMEWEB_SSH_USER          cw556341
TIMEWEB_SSH_PRIVATE_KEY   <private deploy key>
```

`TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT=true` is a safety latch. It is valid only
when the FTP user is scoped to the site's public directory. For the current
Timeweb setup that directory is `/public_html`. If the FTP user is not scoped,
set `TIMEWEB_REMOTE_DIR` to the absolute public directory instead, for example
`/public_html/`, and leave the safety latch unset.

Leave `TIMEWEB_VERIFY_URL` empty before DNS cutover unless Timeweb gives a
technical preview URL. If it is set to `https://kurerok.ru/` too early, the
workflow will only smoke-check the current GitHub Pages copy.

`TIMEWEB_UNPACK_URL` is required only for `TIMEWEB_DEPLOY_METHOD=archive`. It is
different from `TIMEWEB_VERIFY_URL`: it must reach the Timeweb copy of the site,
because the FTP archive deploy opens a temporary `kurerok-unpack-*.php` file
through HTTP(S) to unpack the uploaded zip. Before DNS cutover, use a Timeweb
technical domain here. After DNS cutover, set both `TIMEWEB_UNPACK_URL` and
`TIMEWEB_VERIFY_URL` to `https://kurerok.ru`.

`TIMEWEB_DEPLOY_METHOD=ssh-archive` is the preferred production path. A manual
`workflow_dispatch` run can choose `archive` or `ftp-mirror`, but `ftp-mirror`
is a slow fallback and should not be used for routine deployments of the full
generated site.

The scheduled blog cursor accepts `archive` and `ssh-archive`. The preferred
`ssh-archive` method stamps the final publication time in Timeweb staging
immediately before the release is promoted. The `archive` fallback publishes
the candidate with its prepared timestamp and is valid for the current
FTP/PHP-unpacker Timeweb configuration. Direct `ftp-mirror` remains manual-only
for this purpose.

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
export TIMEWEB_UNPACK_URL='https://<timeweb-technical-domain>'
npm run deploy:timeweb:setup
unset TIMEWEB_FTP_USER TIMEWEB_FTP_PASSWORD TIMEWEB_UNPACK_URL
```

For the preferred SSH method:

```bash
cd kurieros-astro
npm run deploy:timeweb:ssh:key
```

Add the printed public key to Timeweb SSH access. The private key is not
printed. After SSH is enabled and the public key is registered:

```bash
export TIMEWEB_DEPLOY_METHOD='ssh-archive'
export TIMEWEB_SSH_HOST='vh440.timeweb.ru'
export TIMEWEB_SSH_USER='cw556341'
export TIMEWEB_SSH_PRIVATE_KEY_FILE="$HOME/.ssh/kurerok_timeweb_deploy"
export TIMEWEB_SSH_REMOTE_ROOT='<absolute public_html path over SSH>'
npm run deploy:timeweb:setup
unset TIMEWEB_DEPLOY_METHOD TIMEWEB_SSH_HOST TIMEWEB_SSH_USER TIMEWEB_SSH_PRIVATE_KEY_FILE TIMEWEB_SSH_REMOTE_ROOT
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
npm run deploy:timeweb:run:ssh
npm run deploy:timeweb:watch
```

Fallback manual runs:

```bash
npm run deploy:timeweb:run:archive
npm run deploy:timeweb:run:ftp
```

For a local archive sanity check after `npm run build`, run:

```bash
npm run deploy:timeweb:archive:dry-run
npm run deploy:timeweb:ssh:dry-run
```

This creates the same zip archive shape without uploading anything. On the
current generated site, the raw `dist/` is about 1 GB, but the archive is much
smaller because most output is repetitive HTML.

## Why archive deploy

The generated output currently has roughly:

```text
10,700 files
10,200 directories
~1.0 GB raw dist/
~150-200 MB zip/tar.gz archive
```

Most directories contain a single `index.html`. FTP mirror has to create and
upload each item separately, so latency dominates. Archive deploy changes the
network work to one archive upload. The large directory tree is then created
locally on Timeweb's filesystem, which is the right side of the network
boundary.

## Rollback

Before DNS cutover: keep GitHub Pages DNS records unchanged.

After DNS cutover:

1. Re-run the workflow on a known-good commit, or revert and push a fix.
2. If Timeweb is unhealthy and GitHub Pages is still configured, temporarily
   point DNS back to GitHub Pages records.

## Safety notes

- Do not commit FTP passwords or Timeweb panel tokens.
- Keep the deploy FTP user scoped to `/public_html`.
- The SSH archive deploy preserves `.htaccess`, `.well-known/`, and `cgi-bin`
  while replacing generated site files.
- The FTP/PHP archive unpacker preserves `.htaccess`, `.well-known/`, and
  `cgi-bin` while replacing generated site files.
- The archive name, unpacker name, staging directory, and token are random per
  deployment. The unpacker deletes itself and the archive after a successful
  run; the workflow verifies they are no longer publicly reachable.
- DNS changes are not automated by this workflow.
