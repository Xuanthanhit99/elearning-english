#!/bin/sh
set -e

STORAGE_DIR="${STATIC_ROOT_DIR:-/app/storage}"
LISTENING_AUDIO_SUBDIR="${LISTENING_AUDIO_SUBDIR:-listening-audio}"
# Legacy local-disk upload dirs (community post attachments, placement
# TTS/speaking audio) — main.ts mounts /app/uploads as static, and
# multer's diskStorage for community uploads mkdir's its destination
# EAGERLY at module-load time (not per-request), so without this the
# app crashes on boot with EACCES the moment community-social's module
# is required, since /app itself is root-owned and the process runs as
# non-root `node` via su-exec below.
UPLOADS_DIR="/app/uploads"
# Document Library's LocalDocumentStorageService (DOCUMENT_STORAGE_PROVIDER=local
# — the dev/staging fallback; production uses R2 and never touches this)
# also mkdir's its root eagerly on first write, hitting the same
# root-owned-/app problem. Harmless to always create even when R2 is the
# active provider.
DOCUMENT_LOCAL_STORAGE_DIR="/app/${DOCUMENT_LOCAL_STORAGE_DIR:-private-storage/documents}"

echo "Preparing persistent storage: ${STORAGE_DIR}"

mkdir -p "${STORAGE_DIR}"
mkdir -p "${STORAGE_DIR}/${LISTENING_AUDIO_SUBDIR}"

chown -R node:node "${STORAGE_DIR}"
chmod -R u+rwX,g+rwX "${STORAGE_DIR}"

echo "Preparing legacy upload directories: ${UPLOADS_DIR}"

mkdir -p "${UPLOADS_DIR}/community"
mkdir -p "${UPLOADS_DIR}/placement-audio"
mkdir -p "${UPLOADS_DIR}/placement/speaking"

chown -R node:node "${UPLOADS_DIR}"
chmod -R u+rwX,g+rwX "${UPLOADS_DIR}"

echo "Preparing local document storage fallback: ${DOCUMENT_LOCAL_STORAGE_DIR}"

mkdir -p "${DOCUMENT_LOCAL_STORAGE_DIR}"
chown -R node:node "${DOCUMENT_LOCAL_STORAGE_DIR}"
chmod -R u+rwX,g+rwX "${DOCUMENT_LOCAL_STORAGE_DIR}"

echo "Storage permissions prepared successfully"

exec su-exec node "$@"