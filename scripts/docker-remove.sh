#!/usr/bin/env bash
set -euo pipefail

export DOCKER_CONFIG="${DOCKER_CONFIG:-/tmp/wacrm-docker-config}"
mkdir -p "${DOCKER_CONFIG}"

docker stack rm roiwise
