# Release Process

This document outlines the release process for publishing packages from this monorepo to npm.

## Overview

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing. The process is automated through GitHub Actions.

## Published Packages

The following packages are published to npm:

- `@nullshot/agent` - Core agent framework for Cloudflare Workers
- `@nullshot/cli` - CLI tool for managing MCP servers and agents
- `@nullshot/mcp` - Model Context Protocol server implementation
- `@nullshot/test-utils` - Testing utilities for the framework

## Release Workflow

### Automated Process (Recommended)

1. **Create Changes**: Make your changes in feature branches and create pull requests
2. **Add Changeset**: Before merging, add a changeset describing your changes:
   ```bash
   pnpm changeset
   ```
3. **Merge to Main**: When the PR is merged to `main`, the CI will:
   - Create a "Version Packages" PR with updated versions and changelogs
   - When that PR is merged, automatically publish to npm

### Manual Process

If you need to publish manually:

```bash
# 1. Build all packages
pnpm build

# 2. Apply version bumps from changesets
pnpm changeset version

# 3. Publish to npm
pnpm changeset publish
```

## Creating Changesets

When creating a changeset:

1. Run `pnpm changeset`
2. Select which packages have changes
3. Choose the appropriate semantic version bump:
   - **Major**: Breaking changes
   - **Minor**: New features (backwards compatible)
   - **Patch**: Bug fixes
4. Write a clear summary of the changes

## Version Bumping Guidelines

Follow semantic versioning:

- **Major (1.0.0 → 2.0.0)**: Breaking changes
- **Minor (1.0.0 → 1.1.0)**: New features, backwards compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, backwards compatible

## GitHub Actions Setup

The release workflow requires these secrets:

- `NPM_TOKEN`: npm authentication token for publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub

## Troubleshooting

### Build Fails

- Check that all packages have proper `tsconfig.json` with `"declaration": true`
- Ensure all dependencies are properly specified

### Publishing Fails

- Verify `NPM_TOKEN` is set correctly in repository secrets
- Check package.json has correct `publishConfig.access: "public"`

### Version Not Updated

- Ensure changeset was created and committed
- Check that the changeset includes the correct packages

## Current Changeset

A changeset has been created for the initial publication of all packages with minor version bumps. This will publish:

- `@nullshot/agent@0.3.0`
- `@nullshot/cli@0.2.0`
- `@nullshot/mcp@0.4.0`
- `@nullshot/test-utils@0.3.0`

To apply these versions and publish, merge the "Version Packages" PR that will be created by the GitHub Action.
