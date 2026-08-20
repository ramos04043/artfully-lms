#!/usr/bin/env bash
# Render build script for frontend

set -o errexit

npm install
npm run build
