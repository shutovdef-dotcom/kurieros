# Timeweb deployment

The reviewed archive deploy is the recommended transport for the static Astro
site. It packages the reviewed `dist/` locally, uploads one archive over FTP,
and uses a temporary token-protected PHP helper to stage and atomically overlay
only files in the package. The live document root is the FTP-scoped `/` for
`cw556341_krcitwl7` on `vh472.timeweb.ru`; that FTP user is scoped to the site's
`public_html`.

Do not treat a command exit alone as release evidence. A deploy is complete
only after the helper reports successful public-file SHA-256 readback, the
rollback archive and manifest have been exported and verified locally, and the
required public HTTP/SHA smoke checks pass. The smoke checks must cover the
canonical homepage and representative routes, and confirm their served bytes
match the reviewed build. Keep the rollback artifact for seven days. Do not
claim a control deployment succeeded until its final HTTP/SHA evidence has been
reviewed.

## Local dry-run

The `deploy:timeweb:archive:dry-run` script is local-only. It reads `dist/`,
builds and validates a temporary archive and SHA-256 manifest, and sends no
network requests or server writes. It requires no dummy credentials:

```bash
npm run deploy:timeweb:archive:dry-run
```

## Reviewed archive deploy

Build and review `dist/` before deploying. Set the existing FTP username and
password in the current shell; never put credentials in source files or logs.
The backup directory must be empty so a new, verified rollback artifact cannot
overwrite earlier evidence:

```bash
mkdir -p output/timeweb-backup
export TIMEWEB_FTP_PASSWORD='…'
python3 scripts/deploy-reviewed-site.py \
  --source-dir dist \
  --ftp-host vh472.timeweb.ru \
  --ftp-user cw556341_krcitwl7 \
  --no-ftp-tls \
  --remote-root / \
  --managed-private-root \
  --backup-dir output/timeweb-backup \
  --apply
unset TIMEWEB_FTP_PASSWORD
```

`--managed-private-root` creates nonce-scoped mode-0700 temporary storage under
PHP's system temporary directory, outside the public web root. The helper
removes that private storage only after the remote backup has been exported and
its archive, manifest, and receipt have been verified locally. If export or
verification fails, it does not clean up the remote private copy. Retain the
verified local rollback artifact for seven days, then clean it up only after
the release is accepted and the retention period has elapsed.

The helper overlays the files in the reviewed package and preserves unrelated
web-root files. It does not delete or replace the whole `public_html` tree.
Before HTML is promoted, staged package contents and available disk space are
validated; afterward every public file is checked against the package SHA-256
manifest. Stop and investigate any incomplete or ambiguous result; do not
replay the apply operation blindly. The HTTP/SHA smoke must then verify
representative live URLs and their expected content hashes.

## Hosting and credentials

- Host: `vh472.timeweb.ru`.
- FTP user: `cw556341_krcitwl7`, scoped to the site's `public_html` so FTP `/` is
  the site root.
- This hosting configuration uses `TIMEWEB_FTP_TLS=false`, so the command must
  pass `--no-ftp-tls`. The helper's default remains explicit FTPS. The
  authenticated PHP requests use the canonical HTTPS URL `https://kurerok.ru/`.
- Never use the main Timeweb account password, commit credentials, or print
  secrets in logs.

The GitHub environment setup helper remains available for the existing
automation settings. It defaults to `vh472.timeweb.ru`; verify the current
server value before using it. It leaves automatic deployment disabled unless
`TIMEWEB_AUTO_DEPLOY=true` is explicitly provided.

```bash
export TIMEWEB_FTP_USER='cw556341_krcitwl7'
export TIMEWEB_FTP_PASSWORD='…'
npm run deploy:timeweb:setup
unset TIMEWEB_FTP_USER TIMEWEB_FTP_PASSWORD
```

The existing blog scheduling flags and workflow behavior remain unchanged.
Deployment smoke checks must not submit IndexNow or Google indexing requests.

## Legacy transports

The SSH archive and direct FTP mirror scripts are retained as manual legacy
options. They are not the recommended routine deployment path. Do not change
their implementation as part of routine deployment setup.

## Rollback

Keep `output/timeweb-backup` and its receipt/manifest for seven days. If a
release fails its smoke checks, stop further deployment and use the verified
rollback artifact for recovery. Do not clean the retained artifact until the
rollback window is closed.
