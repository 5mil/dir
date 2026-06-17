# Branch Guide

| Branch | Purpose | Status |
|---|---|---|
| `main` | Stable production-ready release | Active |
| `dev` | Integration branch — all features merge here first | Active |
| `self-hosted` | Self-hosting deployment configs and docs | Active |
| `cloud-hosting` | Render + GCloud deployment configs | Active |
| `content-nodes` | Entity model, knowledge graph schema, collections | Planned |
| `ui-designer` | Gestalt/OOUX/cognitive-load UI framework + plugins | Planned |
| `student-os` | Custom Linux student OS installer + management console | Planned |
| `mining-fennac` | Fennac pool mining integration across devices | Planned |
| `governance` | Three-node governance system logic | Planned |
| `open-source-release` | Public turnkey open-source release prep | Planned |

## Workflow

```
feature branches → dev → main
```

All features are developed in their named branch, reviewed via PR into `dev`, then promoted to `main` on stable milestone.
