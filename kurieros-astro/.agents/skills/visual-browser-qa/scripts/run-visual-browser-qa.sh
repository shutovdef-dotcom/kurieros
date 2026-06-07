#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
cd "${PROJECT_ROOT}"

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"

if [[ ! -x "${PWCLI}" ]]; then
  echo "Missing Playwright CLI wrapper: ${PWCLI}" >&2
  exit 1
fi

BASE_URL="${QA_BASE_URL:-http://127.0.0.1:4323}"
AUTO_INSTALL="${QA_AUTO_INSTALL:-1}"
HEADED="${QA_HEADED:-0}"

if [[ "$#" -gt 0 ]]; then
  ROUTES=("$@")
else
  # shellcheck disable=SC2206
  ROUTES=(${QA_ROUTES:-/})
fi

# shellcheck disable=SC2206
BROWSERS=(${QA_BROWSERS:-chrome webkit})

if [[ -n "${QA_VIEWPORTS:-}" ]]; then
  # shellcheck disable=SC2206
  VIEWPORTS=(${QA_VIEWPORTS})
else
  VIEWPORTS=(
    "mobile-360:360:740"
    "mobile-se:375:667"
    "mobile-390:390:844"
    "mobile-plus:414:896"
    "mobile-large:430:932"
    "tablet-768:768:1024"
    "desktop-1366:1366:768"
    "desktop-1440:1440:900"
    "desktop-1920:1920:1080"
  )
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${QA_OUT_DIR:-output/visual-browser-qa/${RUN_ID}}"
SCREENSHOT_DIR="${OUT_DIR}/screenshots"
METRICS_DIR="${OUT_DIR}/metrics"
CONSOLE_DIR="${OUT_DIR}/console"
REPORT="${OUT_DIR}/report.md"

mkdir -p "${SCREENSHOT_DIR}" "${METRICS_DIR}" "${CONSOLE_DIR}"

cat > "${REPORT}" <<EOF
# Visual Browser QA

- Base URL: ${BASE_URL}
- Routes: ${ROUTES[*]}
- Browsers: ${BROWSERS[*]}
- Viewports: ${VIEWPORTS[*]}

| Status | Browser | Viewport | Route | Notes |
|---|---|---|---|---|
EOF

slugify() {
  local value="$1"
  value="${value#/}"
  value="${value%/}"
  if [[ -z "${value}" ]]; then
    value="home"
  fi
  printf '%s' "${value}" | tr '/:_?&=' '-------' | tr -cd '[:alnum:]._-'
}

join_url() {
  local base="${BASE_URL%/}"
  local route="$1"
  if [[ "${route}" == http://* || "${route}" == https://* ]]; then
    printf '%s' "${route}"
  elif [[ "${route}" == /* ]]; then
    printf '%s%s' "${base}" "${route}"
  else
    printf '%s/%s' "${base}" "${route}"
  fi
}

run_pw() {
  local session="$1"
  shift
  PLAYWRIGHT_CLI_SESSION="${session}" "${PWCLI}" "$@"
}

capture_screenshot() {
  local session="$1"
  local dest="$2"
  rm -f .playwright-cli/page-*.png 2>/dev/null || true
  run_pw "${session}" screenshot >/dev/null
  local latest
  latest="$(ls -t .playwright-cli/page-*.png 2>/dev/null | head -n 1 || true)"
  if [[ -z "${latest}" ]]; then
    echo "screenshot-missing" >&2
    return 1
  fi
  cp "${latest}" "${dest}"
}

METRICS_JS="(() => { const doc = document.documentElement; const body = document.body; const vw = doc.clientWidth; const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'; }; const outliers = Array.from(document.querySelectorAll('body *')).filter(visible).map((el) => { const r = el.getBoundingClientRect(); const className = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''; return { tag: el.tagName.toLowerCase(), id: el.id || '', className, text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 70), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }; }).filter((item) => item.right > vw + 2 || item.left < -2).slice(0, 10); const textLength = (body.textContent || '').trim().length; return { url: location.href, title: document.title, viewport: { width: innerWidth, height: innerHeight }, scroll: { width: doc.scrollWidth, clientWidth: doc.clientWidth, height: doc.scrollHeight }, overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth), bodyTextLength: textLength, blank: textLength < 80, cards: document.querySelectorAll('#jobs-grid .job-card').length, revealText: document.querySelector('#jobs-grid-reveal-more-text, .jobs-grid-more-text')?.textContent?.replace(/\\s+/g, ' ').trim() || '', dialogOpen: !!document.querySelector('dialog[open]'), outliers }; })()"

check_metrics() {
  local metrics_file="$1"
  node - "${metrics_file}" <<'NODE'
const fs = require('node:fs');
const metricsPath = process.argv[2];
const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
const issues = [];
if (metrics.blank) issues.push('blank page');
if (metrics.overflowX > 2) issues.push(`horizontal overflow ${metrics.overflowX}px`);
if (Array.isArray(metrics.outliers) && metrics.outliers.length > 0) {
  issues.push(`${metrics.outliers.length} overflow element(s)`);
}
if (metrics.url.includes('podrabotka') && metrics.cards < 1) {
  issues.push('listing cards missing');
}
process.stdout.write(issues.join('; '));
process.exit(issues.length > 0 ? 2 : 0);
NODE
}

append_report() {
  local status="$1"
  local browser="$2"
  local viewport="$3"
  local route="$4"
  local notes="$5"
  printf '| %s | %s | %s | %s | %s |\n' "${status}" "${browser}" "${viewport}" "${route}" "${notes}" >> "${REPORT}"
}

echo "Visual browser QA artifacts: ${OUT_DIR}"

failures=0
case_index=0

for browser in "${BROWSERS[@]}"; do
  for viewport_def in "${VIEWPORTS[@]}"; do
    IFS=':' read -r viewport_name width height <<< "${viewport_def}"
    for route in "${ROUTES[@]}"; do
      case_index=$((case_index + 1))
      url="$(join_url "${route}")"
      route_slug="$(slugify "${route}")"
      session="q${case_index}"

      open_args=(open "${url}" --browser "${browser}")
      if [[ "${HEADED}" == "1" ]]; then
        open_args+=(--headed)
      fi

      open_output="$(run_pw "${session}" "${open_args[@]}" 2>&1 || true)"
      if [[ "${open_output}" == *"is not installed"* && "${browser}" == "webkit" && "${AUTO_INSTALL}" == "1" ]]; then
        echo "Installing Playwright WebKit for Safari-engine QA..."
        "${PWCLI}" install-browser webkit
        open_output="$(run_pw "${session}" "${open_args[@]}" 2>&1 || true)"
      fi

      if [[ "${open_output}" == *"Error:"* || "${open_output}" == *"is not installed"* ]]; then
        append_report "FAIL" "${browser}" "${viewport_name}" "${route}" "Open failed. See console output."
        printf '%s\n' "${open_output}" > "${CONSOLE_DIR}/${browser}_${viewport_name}_${route_slug}_open.txt"
        failures=$((failures + 1))
        run_pw "${session}" close >/dev/null 2>&1 || true
        continue
      fi

      run_pw "${session}" resize "${width}" "${height}" >/dev/null
      run_pw "${session}" --raw eval "new Promise((resolve) => setTimeout(resolve, 500))" >/dev/null

      metric_file="${METRICS_DIR}/${browser}_${viewport_name}_${route_slug}.json"
      run_pw "${session}" --raw eval "${METRICS_JS}" > "${metric_file}"

      top_shot="${SCREENSHOT_DIR}/${browser}_${viewport_name}_${route_slug}_top.png"
      bottom_shot="${SCREENSHOT_DIR}/${browser}_${viewport_name}_${route_slug}_bottom.png"
      capture_screenshot "${session}" "${top_shot}" || true
      run_pw "${session}" --raw eval "window.scrollTo(0, document.documentElement.scrollHeight), ({ y: window.scrollY, h: document.documentElement.scrollHeight })" >/dev/null
      run_pw "${session}" --raw eval "new Promise((resolve) => setTimeout(resolve, 300))" >/dev/null
      capture_screenshot "${session}" "${bottom_shot}" || true

      console_file="${CONSOLE_DIR}/${browser}_${viewport_name}_${route_slug}.txt"
      run_pw "${session}" console warning > "${console_file}" || true

      notes=()
      if metric_issues="$(check_metrics "${metric_file}" 2>/dev/null)"; then
        :
      else
        if [[ -n "${metric_issues}" ]]; then
          notes+=("${metric_issues}")
        else
          notes+=("metrics check failed")
        fi
      fi
      if grep -Eq 'Errors: [1-9]|Warnings: [1-9]' "${console_file}"; then
        notes+=("console warnings/errors")
      fi

      if [[ "${#notes[@]}" -eq 0 ]]; then
        append_report "OK" "${browser}" "${viewport_name}" "${route}" "Screenshots: $(basename "${top_shot}"), $(basename "${bottom_shot}")"
      else
        append_report "FAIL" "${browser}" "${viewport_name}" "${route}" "${notes[*]}"
        failures=$((failures + 1))
      fi

      run_pw "${session}" close >/dev/null 2>&1 || true
    done
  done
done

echo "Report: ${REPORT}"
if [[ "${failures}" -gt 0 ]]; then
  echo "Visual browser QA completed with ${failures} failure(s)." >&2
  exit 1
fi

echo "Visual browser QA completed without automated failures."
