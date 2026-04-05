#!/usr/bin/env bash

set -euo pipefail

echo "Checking docker compose config..."
docker compose config >/dev/null
echo "Compose config is valid."
