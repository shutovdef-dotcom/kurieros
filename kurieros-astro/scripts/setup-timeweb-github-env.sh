#!/usr/bin/env bash
set -euo pipefail

repo="shutovdef-dotcom/kurieros"
environment_name="${TIMEWEB_GITHUB_ENVIRONMENT:-timeweb-production}"

usage() {
  cat <<'USAGE'
Configure the GitHub Actions environment used by Deploy Astro to Timeweb.

This script mutates GitHub repository settings. It never writes secrets to disk;
provide the FTP credentials through environment variables for this shell only.

Required environment variables:
  TIMEWEB_FTP_USER
  TIMEWEB_FTP_PASSWORD

Optional environment variables:
  TIMEWEB_FTP_HOST                  default: vh440.timeweb.ru
  TIMEWEB_REMOTE_DIR                default: /
  TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT  default: true
  TIMEWEB_FTP_PORT                  default: 21
  TIMEWEB_FTP_TLS                   default: false
  TIMEWEB_VERIFY_URL                default: unset/deleted
  TIMEWEB_AUTO_DEPLOY               default: false
  TIMEWEB_GITHUB_ENVIRONMENT        default: timeweb-production

Usage:
  TIMEWEB_FTP_USER='cw556341_deploy' \
  TIMEWEB_FTP_PASSWORD='...' \
  ./scripts/setup-timeweb-github-env.sh

Flags:
  --repo OWNER/REPO
  --help
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      repo="${2:?--repo requires OWNER/REPO}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_env TIMEWEB_FTP_USER
require_env TIMEWEB_FTP_PASSWORD

timeweb_ftp_host="${TIMEWEB_FTP_HOST:-vh440.timeweb.ru}"
timeweb_remote_dir="${TIMEWEB_REMOTE_DIR:-/}"
timeweb_remote_root_is_site_root="${TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT:-true}"
timeweb_ftp_port="${TIMEWEB_FTP_PORT:-21}"
timeweb_ftp_tls="${TIMEWEB_FTP_TLS:-false}"
timeweb_auto_deploy="${TIMEWEB_AUTO_DEPLOY:-false}"

if [ "$timeweb_remote_dir" = "/" ] && [ "$timeweb_remote_root_is_site_root" != "true" ]; then
  echo "TIMEWEB_REMOTE_DIR=/ requires TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT=true." >&2
  echo "Use a Timeweb FTP user scoped to the site's public_html directory, or set TIMEWEB_REMOTE_DIR to the absolute public_html path." >&2
  exit 1
fi

command -v gh >/dev/null 2>&1 || {
  echo "GitHub CLI is required: https://cli.github.com/" >&2
  exit 1
}

gh auth status --hostname github.com >/dev/null

echo "Creating/updating GitHub environment: $environment_name"
gh api --method PUT "repos/${repo}/environments/${environment_name}" --silent

echo "Setting repository variable TIMEWEB_AUTO_DEPLOY=$timeweb_auto_deploy"
gh variable set TIMEWEB_AUTO_DEPLOY --repo "$repo" --body "$timeweb_auto_deploy" >/dev/null

echo "Setting Timeweb environment variables"
gh variable set TIMEWEB_REMOTE_DIR --repo "$repo" --env "$environment_name" --body "$timeweb_remote_dir" >/dev/null
gh variable set TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT --repo "$repo" --env "$environment_name" --body "$timeweb_remote_root_is_site_root" >/dev/null
gh variable set TIMEWEB_FTP_PORT --repo "$repo" --env "$environment_name" --body "$timeweb_ftp_port" >/dev/null
gh variable set TIMEWEB_FTP_TLS --repo "$repo" --env "$environment_name" --body "$timeweb_ftp_tls" >/dev/null

if [ -n "${TIMEWEB_VERIFY_URL:-}" ]; then
  gh variable set TIMEWEB_VERIFY_URL --repo "$repo" --env "$environment_name" --body "$TIMEWEB_VERIFY_URL" >/dev/null
else
  gh api --method DELETE "repos/${repo}/environments/${environment_name}/variables/TIMEWEB_VERIFY_URL" --silent >/dev/null 2>&1 || true
fi

echo "Setting Timeweb environment secrets"
gh secret set TIMEWEB_FTP_HOST --repo "$repo" --env "$environment_name" --body "$timeweb_ftp_host" >/dev/null
gh secret set TIMEWEB_FTP_USER --repo "$repo" --env "$environment_name" --body "$TIMEWEB_FTP_USER" >/dev/null
gh secret set TIMEWEB_FTP_PASSWORD --repo "$repo" --env "$environment_name" --body "$TIMEWEB_FTP_PASSWORD" >/dev/null

echo "Done. Run the workflow manually first:"
echo "  gh workflow run deploy-timeweb.yml --repo $repo --ref main"
