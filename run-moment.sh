#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

if [[ ! -d "node_modules" ]]; then
  echo "Root dependencies missing. Installing..."
  npm install
fi

if [[ ! -d "backend/node_modules" ]]; then
  echo "Backend dependencies missing. Installing..."
  npm install --workspace backend
fi

if [[ ! -d "frontend/node_modules" ]]; then
  echo "Frontend dependencies missing. Installing..."
  npm install --workspace frontend
fi

if [[ ! -f "backend/.env" ]]; then
  echo "Missing backend/.env. Create it from backend/.env.example first."
  exit 1
fi

if ! grep -q '^MONGODB_URI=.' backend/.env; then
  echo "MONGODB_URI is missing in backend/.env. Add it before starting services."
  exit 1
fi

echo "Starting MOMENT frontend + backend..."
exec npm run dev
