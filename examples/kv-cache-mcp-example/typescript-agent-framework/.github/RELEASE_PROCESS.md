# Release Process

This repository uses a fully automated release process based on semantic versioning and GitHub Actions.

## How It Works

### 1. Pull Request Testing

When you create a pull request that changes files in the `packages/` directory:

- The `pullrequest.yml` workflow automatically runs
- It builds and tests all packages
- It performs a dry-run of semantic-release to verify version changes
- A summary shows what packages would be published when merged

This ensures that releases will work correctly once merged to main.

### 2. Automatic Release on Merge

When a pull request is merged to the `main` branch:

- The `release.yml` workflow automatically runs
- It builds and tests all packages
- It identifies which packages have changes
- For each changed package:
  - Determines the next version based on conventional commits
  - Publishes to npm if there's a version bump
  - Creates a GitHub release with changelog

## Conventional Commits

This repo follows the [Conventional Commits](https://www.conventionalcommits.org/) standard to determine version bumps:

- `feat:` - Creates a minor version bump (0.1.0 → 0.2.0)
- `fix:` - Creates a patch version bump (0.1.0 → 0.1.1)
- `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:` - Creates a patch bump
- `chore(deps):` - Updates to dependencies create a patch bump
- `BREAKING CHANGE:` in commit body - Creates a major version bump (0.1.0 → 1.0.0)

## Troubleshooting

If a release fails:

1. Check the GitHub Actions logs for errors
2. Fix any issues in a new PR
3. When merged to main, the release will run again automatically

## Testing Release Process

To test the release process without publishing packages:

1. Create a PR with your changes
2. The PR workflow will run semantic-release in dry-run mode
3. Review the workflow logs to see what would be released
4. Only when merged to main will actual publishing occur 