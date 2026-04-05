---
name: run-quality-gates
description: Use before declaring a task done, after meaningful code changes, or when the user asks for a readiness review.
---

Run the relevant checks and summarize them honestly.

Rules:
- start with the smallest relevant set
- broaden only when it adds confidence
- if a command is missing or too expensive, say so clearly
- never imply a check passed if it was not run

Typical categories:
- backend tests
- frontend tests and build
- service-specific unit tests
- infra config validation
- targeted smoke checks
