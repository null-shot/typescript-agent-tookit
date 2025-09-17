# NPM Packaging Guide for the Monorepo

This guide explains how to manage, prepare, and publish npm packages from this monorepo.

## Architecture

The repository uses a standardized approach for publishing packages:

- Each package in the `packages/` directory can be published independently
- Automated publishing occurs when changes are merged to the `main` branch
- Semantic versioning is determined by commit messages
- GitHub releases are created automatically

## Package Structure Requirements

For a package to be publishable, it needs:

1. **Package Configuration**:
   - `"private": false` (or omit the private field)
   - `"main": "dist/index.js"` 
   - `"types": "dist/index.d.ts"`
   - `"files": ["dist", "README.md", "LICENSE"]`
   - `"publishConfig": {"access": "public"}`

2. **Build Configuration**:
   - TypeScript output configured in `tsconfig.json`:
     - `"declaration": true`
     - `"outDir": "./dist"`
     - `"noEmit": false`
   - Build script in package.json: `"build": "tsc"`

3. **Release Configuration**:
   - `.releaserc.json` file (copied from central template)

## Automatic Publishing

When changes are pushed to the `main` branch, the GitHub workflow:

1. Detects which packages have changes
2. Builds each changed package
3. Determines version bump based on commit messages
4. Publishes to npm
5. Creates GitHub releases

## Conventional Commits

Use [conventional commits](https://www.conventionalcommits.org/) format to control versioning:

- `fix:` - Bug fixes (PATCH version bump)
- `feat:` - New features (MINOR version bump)
- `feat!:` or any commit with `BREAKING CHANGE:` in body - (MAJOR version bump)
- `docs:`, `style:`, `refactor:`, `test:`, `chore:` - No version bump

Examples:
```
feat: add new SSE transport method
fix: correct WebSocket connection handling
docs: improve README examples
feat!: redesign API with breaking changes
```

## Preparing a New Package

To prepare a new or existing package for publishing:

1. **Automatic Preparation**:
   Run the prepare script:
   ```bash
   chmod +x scripts/prepare-packages.sh
   ./scripts/prepare-packages.sh
   ```
   
   This script automatically:
   - Adds required fields to package.json
   - Adds semantic-release configuration
   - Adds LICENSE file if missing
   - Checks tsconfig.json settings

2. **Manual Preparation**:
   If you prefer to configure manually:
   - Update package.json with required fields
   - Copy `.github/release-template.json` to your package as `.releaserc.json`
   - Ensure tsconfig.json is properly configured
   - Add a LICENSE file

## Publishing Process

1. **Automatic Publishing**:
   - Simply merge changes to the `main` branch
   - The GitHub workflow handles the rest

2. **Manual Publishing** (if needed):
   ```bash
   cd packages/your-package
   yarn build
   yarn semantic-release
   ```

## Configuration Files

### Release Template

The central release configuration is in `.github/release-template.json`:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator", 
    "@semantic-release/npm",
    ["@semantic-release/github", {
      "assets": []
    }],
    ["@semantic-release/git", {
      "assets": ["package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }]
  ]
}
```

### GitHub Workflow

The workflow in `.github/workflows/npm-publish.yml`:
- Triggers on pushes to `main` branch
- Detects changed packages
- Uses the release template
- Publishes packages to npm

## Troubleshooting

- **Build Errors**: Check your tsconfig.json settings, especially outDir, declaration, and noEmit
- **Publish Errors**: Check npm permissions and ensure NODE_AUTH_TOKEN is set
- **Version Not Bumping**: Ensure your commit messages follow conventional commit format
- **Skipped Package**: Check if package.json has `"private": true`, which prevents publishing

## Maintenance

To update the release configuration for all packages:
1. Modify `.github/release-template.json`
2. Run `./scripts/prepare-packages.sh` to update all packages 