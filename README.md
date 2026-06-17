# dir

> The next-generation informational web structure. A self-hosted, open-source knowledge base and mining-integrated platform built on [NocoBase](https://nocobase.com).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/5mil/dir/actions/workflows/ci.yml/badge.svg)](https://github.com/5mil/dir/actions/workflows/ci.yml)

---

## Quick Start

### Self-Hosted (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/5mil/dir/main/deploy/self-hosted/install.sh \
  | sudo bash -s -- --domain your-domain.com
```

### Render.com (Blueprint)

1. Go to [render.com/dashboard](https://render.com/dashboard) → **New** → **Blueprint**
2. Connect `github.com/5mil/dir`, branch `main`
3. Render provisions NocoBase + PostgreSQL + Redis automatically

### Google Cloud (Always Free e2-micro)

```bash
cd deploy/cloud/gcloud
./gcloud-deploy.sh --project my-project --domain my-dir.com
```

---

## What is dir?

dir is a structured information ecosystem designed to replace the wiki format with a richer, queryable, self-sovereign knowledge layer.

**Core capabilities:**
- Structured data collections (NocoBase)
- Student OS plugin (learning management)
- Integrated DigiByte mining with Fennac pool
- Mining Tab: integrated DGB wallet, Solana payout, USB ASIC plug-and-play
- Self-hosted or cloud-deployed (Render, GCloud)

---

## Repository Structure

```
dir/
├── deploy/
│   ├── self-hosted/        # Docker Compose stack + scripts + systemd
│   └── cloud/
│       ├── render/           # Render.com Blueprint
│       └── gcloud/           # GCloud e2-micro deploy
├── packages/
│   ├── nocobase-plugins/   # dir NocoBase plugin (phases 1–5)
│   ├── student-os/         # Student OS plugin
│   └── mining-wallet/      # DGB wallet, Solana payout, USB ASIC, Mining Tab UI
├── .github/
│   ├── workflows/          # CI + Release
│   └── ISSUE_TEMPLATE/     # Bug / Feature / Hardware templates
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE                 # MIT
```

---

## Mining Tab

The built-in mining interface gives you:

| Feature | Details |
|---|---|
| DGB Wallet | BIP39/BIP44 HD wallet, AES-256-GCM encrypted, PIN-protected |
| Payout Modes | DGB integrated, DGB external, Solana (SOL), custom coin |
| USB ASICs | Plug-and-play: lsusb + serial + cgminer API auto-detect |
| Live Stats | Fennac + DGB Skein hashrate, accepted/rejected shares, uptime |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs target the `dev` branch.

## Security

See [SECURITY.md](SECURITY.md). Do not open public issues for vulnerabilities.

## License

[MIT](LICENSE) © 2026 5mil
