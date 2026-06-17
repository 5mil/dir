# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest release) | ✅ |
| `dev` (pre-release) | ⚠️ best effort |
| older tags | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by:

1. Opening a [GitHub Security Advisory](https://github.com/5mil/dir/security/advisories/new) (private)
2. Or emailing the maintainer directly (see GitHub profile)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

| Stage | Target |
|---|---|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Patch release | Depends on severity |

## Scope

In scope:
- dir application code (`packages/`, `deploy/`)
- DGB wallet encryption (`packages/mining-wallet/dgb-wallet.js`)
- Payout config handling
- Authentication / session management

Out of scope:
- Third-party dependencies (report to their maintainers)
- Infrastructure you self-host (your own deployment)

## Disclosure Policy

We follow coordinated disclosure. We ask that you give us reasonable time to patch before public disclosure.
