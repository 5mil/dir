# Contributing to dir

Thank you for your interest in contributing to **dir** — the next-generation informational web structure.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branch Strategy](#branch-strategy)
- [Development Setup](#development-setup)
- [Submitting Changes](#submitting-changes)
- [Commit Convention](#commit-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Reporting Issues](#reporting-issues)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Getting Started

1. Fork `github.com/5mil/dir`
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/dir.git`
3. Add upstream: `git remote add upstream https://github.com/5mil/dir.git`
4. Create a feature branch from `dev`: `git checkout -b feat/your-feature dev`

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable releases only — never commit directly |
| `dev` | Integration branch — all PRs target here |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation only |
| `chore/*` | Tooling, deps, CI |

---

## Development Setup

```bash
# Self-hosted (Docker)
cd deploy/self-hosted
cp .env.example .env   # fill in secrets
docker compose up -d

# Or use the one-liner installer
sudo ./install.sh --domain localhost
```

---

## Submitting Changes

1. Ensure your branch is up-to-date with `dev`:
   ```bash
   git fetch upstream
   git rebase upstream/dev
   ```
2. Run tests (if applicable): `npm test`
3. Push and open a PR against `dev`
4. Fill in the PR template completely
5. Request a review

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, deps, CI |
| `refactor` | Refactor (no behavior change) |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

Examples:
```
feat(mining): add Ethereum payout mode
fix(usb-asic): handle missing /dev/ttyUSB on macOS
docs(self-hosted): add SSL troubleshooting section
```

---

## Pull Request Guidelines

- Target branch: `dev` (never `main`)
- Title: follows Conventional Commit format
- Description: fill in template (What / Why / Testing / Screenshots)
- One logical change per PR
- All CI checks must pass before merge

---

## Reporting Issues

Use GitHub Issues with the appropriate template:
- **Bug Report** — something broken
- **Feature Request** — new capability
- **Mining Hardware** — ASIC/GPU support request

---

## Security Vulnerabilities

Do **not** open a public issue. See [SECURITY.md](SECURITY.md).
