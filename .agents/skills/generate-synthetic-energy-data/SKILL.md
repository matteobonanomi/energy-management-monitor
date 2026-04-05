---
name: generate-synthetic-energy-data
description: Use when creating or modifying synthetic time-series data, master data generation, plausibility checks, or demo datasets. In this repo the target domain is energy.
---

Implement synthetic demo data conservatively.

General rules:
- choose a source granularity and keep it explicit
- separate master data from measurements
- encode plausibility rules in code, not only in docs
- include validation commands
- prefer repeatable generation with seed support

For this repository:
- 60 days of history
- source granularity `15m`
- 50 PV, 10 wind, 5 hydro, 10 gas
- prices stored separately from production actuals
- complete plant master data and zone attribution

Always validate:
- record counts
- coverage completeness
- no impossible negative values
- unit conversion consistency
- domain-specific plausibility
