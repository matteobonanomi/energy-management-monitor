---
name: implement-react-dashboard
description: Use when building or changing a React dashboard, including panels, global switches, charts, state flow, and component tests.
---

Implement dashboards with a dense but readable UX.

Rules:
- keep components small and composable
- keep API payloads typed
- move transformations into hooks or utils when they stop being trivial
- make loading, empty, and error states explicit
- keep actual vs forecast visually distinct when both exist
- add component tests for interactive behavior

In this repository the current UI is a single-page 2x2 monitoring layout, but the workflow applies equally to other dashboard shapes.
