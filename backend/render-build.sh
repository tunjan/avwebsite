#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Installing Dependencies ---"
npm install

echo "--- Running Prisma Migrations ---"
npx prisma db push --accept-data-loss

echo "--- Running Prisma Seed ---"
npx prisma db seed

echo "--- Building Application ---"
npm run build