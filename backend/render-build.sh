#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Installing Dependencies with a Clean Slate ---"
# Use npm ci for a clean, reliable install from the lockfile.
# This is generally better for CI/CD environments.
npm ci

echo "--- Rebuilding Native Addons (like bcrypt) ---"
# This command specifically targets and rebuilds native modules for the current OS/architecture.
npm rebuild bcrypt --build-from-source

echo "--- Running Prisma Migrations ---"
npx prisma db push --accept-data-loss

echo "--- Running Prisma Seed ---"
npx prisma db seed

echo "--- Building Application ---"
npm run build