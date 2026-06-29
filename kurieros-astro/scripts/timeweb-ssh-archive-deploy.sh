#!/usr/bin/env bash
set -euo pipefail

source_dir=""
host=""
port="22"
user=""
identity_file=""
known_hosts_file=""
remote_root=""
dry_run="false"

usage() {
  cat <<'USAGE'
Deploy a static build to Timeweb over SSH as one tar.gz archive.

The script uploads one compressed archive with scp, then unpacks it on the
server and replaces generated site files while preserving:
  - .htaccess
  - .well-known
  - cgi-bin

Usage:
  ./scripts/timeweb-ssh-archive-deploy.sh \
    --source-dir dist \
    --host vh440.timeweb.ru \
    --user cw556341 \
    --identity-file /path/to/key \
    --known-hosts /path/to/known_hosts \
    --remote-root /home/c/cw556341/public_html

Flags:
  --source-dir DIR
  --host HOST
  --port PORT                 default: 22
  --user USER
  --identity-file FILE
  --known-hosts FILE
  --remote-root PATH
  --dry-run
  --help
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --source-dir)
      source_dir="${2:?--source-dir requires DIR}"
      shift 2
      ;;
    --host)
      host="${2:?--host requires HOST}"
      shift 2
      ;;
    --port)
      port="${2:?--port requires PORT}"
      shift 2
      ;;
    --user)
      user="${2:?--user requires USER}"
      shift 2
      ;;
    --identity-file)
      identity_file="${2:?--identity-file requires FILE}"
      shift 2
      ;;
    --known-hosts)
      known_hosts_file="${2:?--known-hosts requires FILE}"
      shift 2
      ;;
    --remote-root)
      remote_root="${2:?--remote-root requires PATH}"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
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

require_value() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "Missing required argument: $name" >&2
    exit 2
  fi
}

require_value "--source-dir" "$source_dir"
require_value "--host" "$host"
require_value "--user" "$user"
require_value "--identity-file" "$identity_file"
require_value "--known-hosts" "$known_hosts_file"
require_value "--remote-root" "$remote_root"

if [ ! -d "$source_dir" ]; then
  echo "Source directory does not exist: $source_dir" >&2
  exit 1
fi

if [ "$dry_run" != "true" ]; then
  if [ ! -f "$identity_file" ]; then
    echo "Identity file does not exist: $identity_file" >&2
    exit 1
  fi

  if [ ! -f "$known_hosts_file" ]; then
    echo "Known hosts file does not exist: $known_hosts_file" >&2
    exit 1
  fi
fi

deploy_id="$(date -u +%Y%m%dT%H%M%SZ)-${GITHUB_SHA:-local}"
deploy_id="${deploy_id:0:64}"
archive_name="kurerok-${deploy_id}.tar.gz"
tmp_dir="$(mktemp -d)"
archive_path="$tmp_dir/$archive_name"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

tar -czf "$archive_path" \
  --exclude=".env" \
  --exclude=".env.*" \
  --exclude=".DS_Store" \
  -C "$source_dir" .

archive_bytes="$(wc -c < "$archive_path" | tr -d ' ')"
archive_files="$(find "$source_dir" -type f | wc -l | tr -d ' ')"
echo "Created $archive_name: $archive_files files, $archive_bytes bytes"

if [ "$dry_run" = "true" ]; then
  echo "Dry run completed; no files uploaded."
  exit 0
fi

ssh_target="${user}@${host}"
remote_archive="${remote_root%/}/$archive_name"
remote_staging="${remote_root%/}/.kurerok-${deploy_id}"
ssh_opts=(
  -i "$identity_file"
  -p "$port"
  -o "BatchMode=yes"
  -o "IdentitiesOnly=yes"
  -o "UserKnownHostsFile=$known_hosts_file"
  -o "StrictHostKeyChecking=yes"
)
scp_opts=(
  -i "$identity_file"
  -P "$port"
  -o "BatchMode=yes"
  -o "IdentitiesOnly=yes"
  -o "UserKnownHostsFile=$known_hosts_file"
  -o "StrictHostKeyChecking=yes"
)

scp "${scp_opts[@]}" "$archive_path" "$ssh_target:$remote_archive"
echo "Uploaded archive to Timeweb."

ssh "${ssh_opts[@]}" "$ssh_target" \
  "REMOTE_ROOT='$remote_root' REMOTE_ARCHIVE='$remote_archive' REMOTE_STAGING='$remote_staging' sh -s" <<'REMOTE_SCRIPT'
set -eu

cd "$REMOTE_ROOT"

rm -rf "$REMOTE_STAGING"
mkdir -p "$REMOTE_STAGING"
tar -xzf "$REMOTE_ARCHIVE" -C "$REMOTE_STAGING"

find "$REMOTE_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.htaccess' \
  ! -name '.well-known' \
  ! -name 'cgi-bin' \
  ! -name "$(basename "$REMOTE_ARCHIVE")" \
  ! -name "$(basename "$REMOTE_STAGING")" \
  -exec rm -rf -- {} +

find "$REMOTE_STAGING" -mindepth 1 -maxdepth 1 -exec mv -- {} "$REMOTE_ROOT/" \;
rm -rf "$REMOTE_STAGING" "$REMOTE_ARCHIVE"

test -f "$REMOTE_ROOT/index.html"
REMOTE_SCRIPT

echo "OK deployed"
