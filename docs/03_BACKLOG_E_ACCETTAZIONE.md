# Backlog e criteri di accettazione

## Completato

### Bootstrap repository

Accettazione soddisfatta:

- stack locale via `docker compose`
- repo strutturato per backend, frontend, forecast-service e docs
- README operativo presente

### Data model e seed

Accettazione soddisfatta:

- schema SQL iniziale presente
- migrazioni Alembic presenti
- seed sintetico 60 giorni `15m`
- validazione dataset disponibile

### Backend MVP

Accettazione soddisfatta:

- `GET /health`
- `GET /ready`
- `GET /filters`
- `GET /dashboard/summary`
- `GET /dashboard/production-series`
- `GET /dashboard/price-series`
- `GET /dashboard/actual-vs-forecast`
- `GET /forecasts/runs`
- `GET /forecasts/runs/{id}`
- `POST /forecasts/runs`
- `POST /events/actions`

### Forecast service

Accettazione soddisfatta:

- contract `POST /forecast/v1/predict`
- supporto `ARIMA`
- supporto `Prophet`
- fallback `naive seasonal`
- test di base presenti

### Frontend beta

Accettazione soddisfatta:

- vista singola `2x2`
- switch `Persona / Theme / Granularity`
- monitor prezzi e produzione
- KPI portfolio `3x2`
- `Forecast Engine`
- forecast visualizzato con linea tratteggiata
- test componenti core presenti

### Logging e tracking

Accettazione soddisfatta:

- log JSON strutturati
- `request_id`
- log applicativi di startup/shutdown
- tracking azioni utente verso MongoDB con fallback non bloccante

## Backlog attivo

### Story A — Vista Data Analyst dedicata

Accettazione:

- layout differenziato rispetto al Portfolio Manager
- più dettaglio analitico
- nessuna regressione sui monitor già esistenti

### Story B — Restore ultimo forecast al refresh

Accettazione:

- all'apertura pagina la UI può recuperare l'ultimo run coerente con i filtri base
- overlay forecast consistente con il run selezionato

### Story C — Scope forecast estesi

Accettazione:

- forecast per tecnologia, zona o singolo impianto
- payload backend coerente
- test aggiornati

### Story D — Hardening frontend bundle

Accettazione:

- code splitting o lazy loading introdotti
- warning bundle ridotto

### Story E — Session analytics

Accettazione:

- definizione minima di sessione utente su MongoDB
- correlazione eventi più leggibile
- query di ispezione documentate
