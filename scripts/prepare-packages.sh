#!/bin/bash

# Script to prepare all packages in the monorepo for semantic-release
# Usage: ./scripts/prepare-packages.sh

set -e

# Check if the template file exists
if [ ! -f ".github/release-template.json" ]; then
  echo "Error: Template file .github/release-template.json not found!"
  exit 1
fi

# Find all package directories
PACKAGES=$(find packages -type f -name "package.json" -not -path "*/node_modules/*" | grep -o 'packages/[^/]*' | sort | uniq)

# Process each package
for PKG in $PACKAGES; do
  echo "Processing $PKG..."
  cd "$PKG" || exit 1
  
  # Check if private is set to true and if so, skip
  if grep -q '"private": true' package.json; then
    echo "  Skipping private package"
    cd - > /dev/null || exit 1
    continue
  fi
  
  # Add semantic-release dev dependencies if not present
  if ! grep -q '"semantic-release"' package.json; then
    echo "  Adding semantic-release dependencies"
    yarn add --dev semantic-release @semantic-release/git
  fi
  
  # Add semantic-release script if not present
  if ! grep -q '"semantic-release":' package.json; then
    echo "  Adding semantic-release script"
    # Use temporary file to avoid issues with in-place sed on macOS
    jq '.scripts["semantic-release"] = "semantic-release"' package.json > package.json.tmp
    mv package.json.tmp package.json
  fi
  
  # Check for main, types, and files fields
  if ! grep -q '"main":' package.json || ! grep -q '"types":' package.json; then
    echo "  Updating main and types fields"
    jq '.main = "dist/index.js" | .types = "dist/index.d.ts"' package.json > package.json.tmp
    mv package.json.tmp package.json
  fi
  
  if ! grep -q '"files":' package.json; then
    echo "  Adding files field"
    jq '.files = ["dist", "README.md", "LICENSE"]' package.json > package.json.tmp
    mv package.json.tmp package.json
  fi
  
  # Add publishConfig for public access if not present
  if ! grep -q '"publishConfig":' package.json; then
    echo "  Adding publishConfig for public access"
    jq '.publishConfig = {"access": "public"}' package.json > package.json.tmp
    mv package.json.tmp package.json
  fi
  
  # Check for build script
  if ! grep -q '"build":' package.json; then
    echo "  Adding build script"
    jq '.scripts.build = "tsc"' package.json > package.json.tmp
    mv package.json.tmp package.json
  fi
  
  # Create .releaserc.json if not exists
  if [ ! -f .releaserc.json ]; then
    echo "  Creating .releaserc.json from template"
    cp ../../.github/release-template.json .releaserc.json
  fi
  
  # Ensure license file exists
  if [ ! -f LICENSE ]; then
    echo "  Copying LICENSE file"
    cp ../../LICENSE ./LICENSE 2>/dev/null || echo "  WARNING: Could not find root LICENSE file"
  fi
  
  # Check if tsconfig.json has right output settings
  if [ -f tsconfig.json ]; then
    if ! grep -q '"declaration": true' tsconfig.json || ! grep -q '"outDir": "./dist"' tsconfig.json; then
      echo "  WARNING: Please update tsconfig.json for proper build output"
      echo "  Example: set declaration: true, outDir: ./dist, noEmit: false"
    fi
  else
    echo "  WARNING: No tsconfig.json found, must be created for proper builds"
  fi
  
  cd - > /dev/null || exit 1
done

echo "All packages processed! Review the changes before committing." 