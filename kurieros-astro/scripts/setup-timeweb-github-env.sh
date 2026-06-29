#!/usr/bin/env bash
set -euo pipefail

repo="shutovdef-dotcom/kurieros"
environment_name="${TIMEWEB_GITHUB_ENVIRONMENT:-timeweb-production}"

usage() {
  cat <<'USAGE'
Configure the GitHub Actions environment used by Deploy Astro to Timeweb.

This script mutates GitHub repository settings. It never writes secrets to disk;
provide deploy credentials through environment variables for this shell only.

Required environment variables for TIMEWEB_DEPLOY_METHOD=archive or ftp-mirror:
  TIMEWEB_FTP_USER
  TIMEWEB_FTP_PASSWORD

Required environment variables for TIMEWEB_DEPLOY_METHOD=ssh-archive:
  TIMEWEB_SSH_HOST
  TIMEWEB_SSH_USER
  TIMEWEB_SSH_PRIVATE_KEY
  TIMEWEB_SSH_REMOTE_ROOT

Optional environment variables:
  TIMEWEB_FTP_HOST                  default: vh440.timeweb.ru
  TIMEWEB_REMOTE_DIR                default: /
  TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT  default: true
  TIMEWEB_FTP_PORT                  default: 21
  TIMEWEB_FTP_TLS                   default: false
  TIMEWEB_DEPLOY_METHOD             default: archive
  TIMEWEB_UNPACK_URL                default: unset/deleted
  TIMEWEB_UNPACK_INSECURE_HTTPS     default: false
  TIMEWEB_SSH_PORT                  default: 22
  TIMEWEB_VERIFY_URL                default: unset/deleted
  TIMEWEB_AUTO_DEPLOY               default: false
  TIMEWEB_GITHUB_ENVIRONMENT        default: timeweb-production

Usage:
  TIMEWEB_FTP_USER='cw556341_deploy' \
  TIMEWEB_FTP_PASSWORD='...' \
  TIMEWEB_UNPACK_URL='https://technical-domain.tw1.ru' \
  ./scripts/setup-timeweb-github-env.sh

  TIMEWEB_DEPLOY_METHOD='ssh-archive' \
  TIMEWEB_SSH_HOST='vh440.timeweb.ru' \
  TIMEWEB_SSH_USER='cw556341' \
  TIMEWEB_SSH_PRIVATE_KEY="$(cat ~/.ssh/timeweb_kurerok)" \
  TIMEWEB_SSH_REMOTE_ROOT='/home/c/cw556341/public_html' \
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

timeweb_ftp_host="${TIMEWEB_FTP_HOST:-vh440.timeweb.ru}"
timeweb_remote_dir="${TIMEWEB_REMOTE_DIR:-/}"
timeweb_remote_root_is_site_root="${TIMEWEB_REMOTE_ROOT_IS_SITE_ROOT:-true}"
timeweb_ftp_port="${TIMEWEB_FTP_PORT:-21}"
timeweb_ftp_tls="${TIMEWEB_FTP_TLS:-false}"
timeweb_deploy_method="${TIMEWEB_DEPLOY_METHOD:-archive}"
timeweb_unpack_insecure_https="${TIMEWEB_UNPACK_INSECURE_HTTPS:-false}"
timeweb_ssh_port="${TIMEWEB_SSH_PORT:-22}"
timeweb_auto_deploy="${TIMEWEB_AUTO_DEPLOY:-false}"

case "$timeweb_deploy_method" in
  archive|ssh-archive|ftp-mirror) ;;
  *)
    echo "TIMEWEB_DEPLOY_METHOD must be archive, ssh-archive, or ftp-mirror." >&2
    exit 1
    ;;
esac

if [ "$timeweb_deploy_method" = "archive" ] || [ "$timeweb_deploy_method" = "ftp-mirror" ]; then
  require_env TIMEWEB_FTP_USER
  require_env TIMEWEB_FTP_PASSWORD
fi

if [ "$timeweb_deploy_method" = "ssh-archive" ]; then
  require_env TIMEWEB_SSH_HOST
  require_env TIMEWEB_SSH_USER
  require_env TIMEWEB_SSH_PRIVATE_KEY
  require_env TIMEWEB_SSH_REMOTE_ROOT
fi

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
gh variable set TIMEWEB_DEPLOY_METHOD --repo "$repo" --env "$environment_name" --body "$timeweb_deploy_method" >/dev/null
gh variable set TIMEWEB_UNPACK_INSECURE_HTTPS --repo "$repo" --env "$environment_name" --body "$timeweb_unpack_insecure_https" >/dev/null
gh variable set TIMEWEB_SSH_PORT --repo "$repo" --env "$environment_name" --body "$timeweb_ssh_port" >/dev/null

if [ -n "${TIMEWEB_UNPACK_URL:-}" ]; then
  gh variable set TIMEWEB_UNPACK_URL --repo "$repo" --env "$environment_name" --body "$TIMEWEB_UNPACK_URL" >/dev/null
else
  gh api --method DELETE "repos/${repo}/environments/${environment_name}/variables/TIMEWEB_UNPACK_URL" --silent >/dev/null 2>&1 || true
fi

if [ -n "${TIMEWEB_VERIFY_URL:-}" ]; then
  gh variable set TIMEWEB_VERIFY_URL --repo "$repo" --env "$environment_name" --body "$TIMEWEB_VERIFY_URL" >/dev/null
else
  gh api --method DELETE "repos/${repo}/environments/${environment_name}/variables/TIMEWEB_VERIFY_URL" --silent >/dev/null 2>&1 || true
fi

echo "Setting Timeweb environment secrets"
if [ "$timeweb_deploy_method" = "archive" ] || [ "$timeweb_deploy_method" = "ftp-mirror" ]; then
  gh secret set TIMEWEB_FTP_HOST --repo "$repo" --env "$environment_name" --body "$timeweb_ftp_host" >/dev/null
  gh secret set TIMEWEB_FTP_USER --repo "$repo" --env "$environment_name" --body "$TIMEWEB_FTP_USER" >/dev/null
  gh secret set TIMEWEB_FTP_PASSWORD --repo "$repo" --env "$environment_name" --body "$TIMEWEB_FTP_PASSWORD" >/dev/null
fi

if [ "$timeweb_deploy_method" = "ssh-archive" ]; then
  gh secret set TIMEWEB_SSH_HOST --repo "$repo" --env "$environment_name" --body "$TIMEWEB_SSH_HOST" >/dev/null
  gh secret set TIMEWEB_SSH_USER --repo "$repo" --env "$environment_name" --body "$TIMEWEB_SSH_USER" >/dev/null
  gh secret set TIMEWEB_SSH_PRIVATE_KEY --repo "$repo" --env "$environment_name" --body "$TIMEWEB_SSH_PRIVATE_KEY" >/dev/null
  gh variable set TIMEWEB_SSH_REMOTE_ROOT --repo "$repo" --env "$environment_name" --body "$TIMEWEB_SSH_REMOTE_ROOT" >/dev/null
fi

echo "Done. Run the workflow manually first:"
echo "  gh workflow run deploy-timeweb.yml --repo $repo --ref main"
