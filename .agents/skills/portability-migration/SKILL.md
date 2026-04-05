---
name: portability-migration
description: Use for controlled portability or dependency migrations where contracts should remain as stable as possible.
---

Treat migrations as risk-managed changes.

Checklist:
- identify compatibility differences before editing
- keep behavior stable where possible
- isolate adapter or persistence-specific code
- update docs, config, and tests together
- provide rollback notes

Good uses:
- database portability
- dependency replacement
- runtime configuration changes
