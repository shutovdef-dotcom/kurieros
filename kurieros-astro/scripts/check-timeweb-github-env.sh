#!/usr/bin/env bash
set -euo pipefail

repo="shutovdef-dotcom/kurieros"
environment_name="${TIMEWEB_GITHUB_ENVIRONMENT:-timeweb-production}"
workflow_path=".github/workflows/deploy-timeweb.yml"

usage() {
  cat <<'USAGE'
Read-only preflight for the GitHub side of the Timeweb deployment.

Checks:
  - GitHub CLI authentication
  - remote workflow availability
  - timeweb-production environment existence
  - required environment secrets are present by name
  - required environment variables are present by name
  - deploy-method-specific readiness
  - repository variable TIMEWEB_AUTO_DEPLOY status

The script never prints secret values and does not mutate GitHub settings.

Usage:
  ./scripts/check-timeweb-github-env.sh
  ./scripts/check-timeweb-github-env.sh --repo OWNER/REPO

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

command -v gh >/dev/null 2>&1 || {
  echo "FAIL gh CLI is not installed." >&2
  exit 1
}

failures=0

pass() {
  echo "PASS $1"
}

warn() {
  echo "WARN $1"
}

fail() {
  echo "FAIL $1"
  failures=$((failures + 1))
}

contains_line() {
  local needle="$1"
  local haystack="$2"
  grep -Fxq "$needle" <<<"$haystack"
}

if gh auth status --hostname github.com >/dev/null 2>&1; then
  pass "GitHub CLI is authenticated."
else
  fail "GitHub CLI is not authenticated. Run: gh auth login"
fi

if [ -f "../$workflow_path" ] || [ -f "$workflow_path" ]; then
  pass "Local workflow file exists."
else
  fail "Local workflow file is missing: $workflow_path"
fi

workflow_names="$(gh workflow list --repo "$repo" --all --json path,state --jq '.[] | select(.path == "'"$workflow_path"'") | "\(.path)\t\(.state)"' 2>/dev/null || true)"
if [ -n "$workflow_names" ]; then
  workflow_state="$(cut -f2 <<<"$workflow_names" | head -n1)"
  if [ "$workflow_state" = "active" ]; then
    pass "Remote workflow is active on GitHub."
  else
    fail "Remote workflow exists but is not active: $workflow_state"
  fi
else
  fail "Remote workflow is not visible on GitHub. Push the commit containing $workflow_path first."
fi

environment_names="$(gh api "repos/${repo}/environments" --jq '.environments[].name' 2>/dev/null || true)"
if contains_line "$environment_name" "$environment_names"; then
  pass "GitHub environment exists: $environment_name"
else
  fail "GitHub environment is missing: $environment_name"
fi

secret_names="$(gh secret list --repo "$repo" --env "$environment_name" --json name --jq '.[].name' 2>/dev/null || true)"

required_variables=$'TIMEWEB_REMOTE_DIR\nTIMEWEB_REMOTE_ROOT_IS_SITE_ROOT\nTIMEWEB_FTP_PORT\nTIMEWEB_FTP_TLS\nTIMEWEB_DEPLOY_METHOD'
variable_json="$(gh variable list --repo "$repo" --env "$environment_name" --json name,value 2>/dev/null || true)"
variable_names="$(jq -r '.[].name' <<<"${variable_json:-[]}" 2>/dev/null || true)"
while IFS= read -r variable_name; do
  if contains_line "$variable_name" "$variable_names"; then
    pass "Environment variable exists: $variable_name"
  else
    fail "Environment variable is missing: $variable_name"
  fi
done <<<"$required_variables"

deploy_method="$(jq -r '.[] | select(.name == "TIMEWEB_DEPLOY_METHOD") | .value' <<<"${variable_json:-[]}" 2>/dev/null || true)"
deploy_method="${deploy_method:-archive}"

check_secret() {
  local secret_name="$1"
  if contains_line "$secret_name" "$secret_names"; then
    pass "Environment secret exists: $secret_name"
  else
    fail "Environment secret is missing: $secret_name"
  fi
}

check_variable() {
  local variable_name="$1"
  if contains_line "$variable_name" "$variable_names"; then
    pass "Environment variable exists: $variable_name"
  else
    fail "Environment variable is missing: $variable_name"
  fi
}

case "$deploy_method" in
  archive)
    check_secret "TIMEWEB_FTP_HOST"
    check_secret "TIMEWEB_FTP_USER"
    check_secret "TIMEWEB_FTP_PASSWORD"
    if contains_line "TIMEWEB_UNPACK_URL" "$variable_names"; then
      pass "TIMEWEB_UNPACK_URL is set for archive deploy."
    else
      fail "TIMEWEB_UNPACK_URL is missing. Archive deploy needs a Timeweb technical domain before DNS cutover, then https://kurerok.ru after cutover."
    fi
    ;;
  ssh-archive)
    check_secret "TIMEWEB_SSH_HOST"
    check_secret "TIMEWEB_SSH_USER"
    check_secret "TIMEWEB_SSH_PRIVATE_KEY"
    check_variable "TIMEWEB_SSH_REMOTE_ROOT"
    if contains_line "TIMEWEB_SSH_PORT" "$variable_names"; then
      pass "Environment variable exists: TIMEWEB_SSH_PORT"
    else
      warn "TIMEWEB_SSH_PORT is unset; workflow defaults to 22."
    fi
    ;;
  ftp-mirror)
    check_secret "TIMEWEB_FTP_HOST"
    check_secret "TIMEWEB_FTP_USER"
    check_secret "TIMEWEB_FTP_PASSWORD"
    warn "TIMEWEB_DEPLOY_METHOD=ftp-mirror. This is a slow fallback for large builds; archive is recommended."
    ;;
  "")
    warn "TIMEWEB_DEPLOY_METHOD is unset; workflow defaults to archive and will need TIMEWEB_UNPACK_URL."
    ;;
  *)
    fail "Unsupported TIMEWEB_DEPLOY_METHOD: $deploy_method"
    ;;
esac

if contains_line "TIMEWEB_VERIFY_URL" "$variable_names"; then
  warn "TIMEWEB_VERIFY_URL is set. Before DNS cutover, make sure it points to a real Timeweb preview, not the current GitHub Pages domain."
else
  pass "TIMEWEB_VERIFY_URL is unset; this is expected before DNS cutover."
fi

repo_variable_names="$(gh variable list --repo "$repo" --json name --jq '.[].name' 2>/dev/null || true)"
if contains_line "TIMEWEB_AUTO_DEPLOY" "$repo_variable_names"; then
  pass "Repository variable exists: TIMEWEB_AUTO_DEPLOY"
else
  warn "Repository variable TIMEWEB_AUTO_DEPLOY is unset. Manual workflow_dispatch will still work; pushes to main will not deploy."
fi

if [ "$failures" -gt 0 ]; then
  echo
  echo "$failures preflight check(s) failed."
  exit 1
fi

echo
echo "Timeweb GitHub deployment preflight passed."
