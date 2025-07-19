#!/bin/bash

# Build signed CRX for Chrome Web Store submission
# Usage: ./build-crx.sh [version]

set -e

PATH_KEY="path-to-private-key"

# Get version from manifest.json if not provided
if [ -z "$1" ]; then
  VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
else
  VERSION=$1
fi

echo "Building CRX for version $VERSION"

# Check if key exists
if [ ! -f "$PATH_KEY" ]; then
  echo "Error: Private key not found at $PATH_KEY"
  echo "Generate one with: openssl genrsa -out your-path/key.pem 2048"
  exit 1
fi

# Check if crx3 is installed
if ! command -v crx3 &> /dev/null; then
  echo "Installing crx3..."
  npm install -g crx3
fi

# Create CRX
echo "Creating signed CRX..."
crx3 --keyPath=$PATH_KEY --crxPath=./gmaps-link.crx .

echo "✅ Created gmaps-link.crx"
echo "📦 Ready for Chrome Web Store upload!"
