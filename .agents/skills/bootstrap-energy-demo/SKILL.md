---
name: bootstrap-energy-demo
description: Use when starting or re-aligning a local multi-service product repository. The current repo is an energy demo, but the workflow is intentionally reusable.
---

Build or re-align the repository skeleton deliberately.

Recommended sequence:
1. read `AGENTS.md` plus the main product and blueprint docs
2. identify the minimum runnable topology
3. propose the top-level structure before creating files
4. create only the smallest coherent scaffold for each runtime area
5. wire docs and quality commands early

Priorities:
- runnable local stack
- readable boundaries between services
- predictable developer workflow
- no speculative architecture

Useful first files in most repos:
- `docker-compose.yml` or equivalent local orchestrator
- root `README.md`
- backend app entrypoint/settings
- frontend app shell
- test command wiring
