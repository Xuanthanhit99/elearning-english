#!/bin/sh
set -e

STORAGE_DIR="${STATIC_ROOT_DIR:-/app/storage}"
LISTENING_AUDIO_SUBDIR="${LISTENING_AUDIO_SUBDIR:-listening-audio}"

echo "Preparing persistent storage: ${STORAGE_DIR}"

mkdir -p "${STORAGE_DIR}"
mkdir -p "${STORAGE_DIR}/${LISTENING_AUDIO_SUBDIR}"

chown -R node:node "${STORAGE_DIR}"
chmod -R u+rwX,g+rwX "${STORAGE_DIR}"

echo "Storage permissions prepared successfully"

exec su-exec node "$@"