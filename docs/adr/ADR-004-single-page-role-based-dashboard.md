# ADR-004: Single-Page Role-Based Dashboard

- Status: Accepted
- Date: 2026-04-07

## Context

The demo must communicate product value quickly:

- prices
- production
- KPI summary
- forecast execution
- distinction between `Portfolio Manager` and `Data Analyst`

The repository also wants high demo readability and fast iteration across frontend and backend.

## Decision

Use one React single-page shell with:

- global switches for persona, theme, and granularity
- a shared dashboard frame
- persona-specific panel composition and interaction depth inside the same application

Current implementation:

- `Portfolio Manager` emphasizes two monitors, fixed KPI summary, and essential forecast controls
- `Data Analyst` emphasizes a dual-axis chart, configurable KPI slots, plant/zone focus, and advanced forecast settings

## Rationale

- keeps the demo narrative concentrated in one place
- reduces navigation overhead during walkthroughs
- allows reuse of data hooks, chart primitives, and forecast orchestration
- makes persona differences visible without building a full multi-route information architecture

## Consequences

### Positive

- faster comprehension during demos
- lower frontend complexity than separate applications or route-heavy flows
- strong reuse of shared state, hooks, and typed payloads

### Negative

- app shell owns a relatively large amount of cross-panel state
- persona complexity can accumulate if the two views diverge further
- some feature exports exist outside the main shell and must be documented carefully to avoid confusion

## Demo Assumptions

- one-screen product story is more important than deep navigation
- a shared shell is sufficient for both personas
- local state plus custom hooks is enough without a dedicated global store

## Production-Grade Note

If the personas diverge more strongly, a production-grade evolution might require route separation, deeper workspace concepts, or a more explicit global state strategy. Today, the single-page choice remains the most maintainable fit for the implemented demo.
