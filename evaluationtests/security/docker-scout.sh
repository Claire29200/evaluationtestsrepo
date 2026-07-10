#!/usr/bin/env bash
# Construit les images de l'application et lance Docker Scout dessus.
# Nécessite Docker Desktop (ou le plugin `docker scout`) et une session
# `docker login` valide.
set -euo pipefail

cd "$(dirname "$0")/.."

docker build -t cd-audio-backend -f server/Dockerfile ./server
docker build -t cd-audio-frontend -f client/Dockerfile ./client

echo "=== Résumé rapide (quickview) ==="
docker scout quickview cd-audio-backend
docker scout quickview cd-audio-frontend

echo "=== CVEs détaillées (backend) ==="
docker scout cves cd-audio-backend

echo "=== CVEs détaillées (frontend) ==="
docker scout cves cd-audio-frontend

echo "=== Recommandations de base image ==="
docker scout recommendations cd-audio-backend
docker scout recommendations cd-audio-frontend
