#!/usr/bin/env bash
# Render build script for backend

set -o errexit

# Upgrade pip to latest version
pip install --upgrade pip

# Install dependencies using only binary wheels (no compilation)
pip install --only-binary=:all: -r requirements.txt || pip install -r requirements.txt
