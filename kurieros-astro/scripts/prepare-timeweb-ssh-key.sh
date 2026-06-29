#!/usr/bin/env bash
set -euo pipefail

key_path="${TIMEWEB_SSH_KEY_PATH:-$HOME/.ssh/kurerok_timeweb_deploy}"
comment="${TIMEWEB_SSH_KEY_COMMENT:-kurerok-timeweb-github-actions}"
force="false"

usage() {
  cat <<'USAGE'
Create or show the SSH deploy key used by GitHub Actions for Timeweb.

The private key is never printed. Add the printed public key to Timeweb SSH
access, then run setup-timeweb-github-env.sh with TIMEWEB_SSH_PRIVATE_KEY_FILE.

Usage:
  ./scripts/prepare-timeweb-ssh-key.sh

Optional environment variables:
  TIMEWEB_SSH_KEY_PATH      default: ~/.ssh/kurerok_timeweb_deploy
  TIMEWEB_SSH_KEY_COMMENT   default: kurerok-timeweb-github-actions

Flags:
  --force     replace an existing key pair
  --help
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      force="true"
      shift
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

public_key_path="${key_path}.pub"

if [ -e "$key_path" ] || [ -e "$public_key_path" ]; then
  if [ "$force" != "true" ]; then
    echo "SSH key already exists: $key_path"
    echo "Use --force to replace it."
  else
    rm -f "$key_path" "$public_key_path"
  fi
fi

if [ ! -e "$key_path" ]; then
  install -m 700 -d "$(dirname "$key_path")"
  ssh-keygen -t ed25519 -N "" -C "$comment" -f "$key_path" >/dev/null
  chmod 600 "$key_path"
  chmod 644 "$public_key_path"
  echo "Created SSH deploy key: $key_path"
fi

echo
echo "Public key to add in Timeweb:"
cat "$public_key_path"
echo
echo "After Timeweb SSH access is enabled and the public key is added, run:"
echo "  export TIMEWEB_DEPLOY_METHOD='ssh-archive'"
echo "  export TIMEWEB_SSH_HOST='vh440.timeweb.ru'"
echo "  export TIMEWEB_SSH_USER='cw556341'"
echo "  export TIMEWEB_SSH_PRIVATE_KEY_FILE='$key_path'"
echo "  export TIMEWEB_SSH_REMOTE_ROOT='<absolute public_html path over SSH>'"
echo "  npm run deploy:timeweb:setup"
