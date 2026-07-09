#!/usr/bin/env bash
set -euo pipefail

URL="${1:-https://khangcatdesigndemo.com/api/health?deep=1}"
curl --fail --show-error --silent --max-time 15 "$URL"
echo
