# EnergyMonitor

Demo locale per il monitoraggio di prezzi di mercato e produzione portfolio, con forecast on-demand, logging strutturato ed event tracking utente persistito su MongoDB.

## Stato attuale

L'app espone una singola vista React in griglia `2x2`:

- alto sinistra: `Price monitor`
- alto destra: `Energy monitor`
- basso sinistra: KPI portfolio `3x2`
- basso destra: `Forecast Engine`

L'header globale include:

- `Portfolio Manager / Data Analyst`
- `Dark / Light`
- `15m / 1h`

La vista `Data Analyst` oggi condivide volutamente la stessa composizione del `Portfolio Manager`. I forecast vengono lanciati dalla UI, eseguiti nel microservizio dedicato e mostrati nei due monitor superiori con linea tratteggiata rispetto al dato actual.

## Architettura

```text
┌──────────────────────┐
│      Frontend        │
│ React + TypeScript   │
│ http://localhost:5173│
└──────────┬───────────┘
           │ REST
           ▼
┌──────────────────────┐
│        API           │
│ FastAPI + SQLAlchemy │
│ http://localhost:8000│
└───────┬───────┬──────┘
        │       │
        │       │ REST forecast orchestration
        │       ▼
        │  ┌──────────────────────┐
        │  │   Forecast Service   │
        │  │ FastAPI + ARIMA/     │
        │  │ Prophet + fallback   │
        │  │ http://localhost:8001│
        │  └──────────────────────┘
        │
        │ SQL queries / persistence
        ▼
┌──────────────────────┐
│      PostgreSQL      │
│ master data, prezzi, │
│ consuntivi, forecast │
└──────────────────────┘

        API event tracking
               │
               ▼
┌──────────────────────┐
│       MongoDB        │
│ user action events   │
│ session traceability │
└──────────────────────┘
```

### Flusso principale

1. Il frontend legge filtri, KPI e serie dal backend.
2. Il backend aggrega dati da PostgreSQL in granularità `15m` o `1h`.
3. L'utente lancia un forecast dal `Forecast Engine`.
4. Il backend costruisce la serie storica aggregata, chiama il `forecast-service`, persiste i run SQL e restituisce il risultato.
5. Il frontend innesta il forecast sui grafici esistenti.
6. Le azioni principali dell'utente vengono inviate a `POST /events/actions` e salvate su MongoDB.

## Servizi docker compose

- `frontend`: UI Vite su `http://localhost:5173`
- `api`: backend FastAPI su `http://localhost:8000`
- `forecast-service`: microservizio forecast su `http://localhost:8001`
- `postgres`: database relazionale su `localhost:5432`
- `mongo`: event store non relazionale su `localhost:27017`

## Avvio rapido

```bash
cp .env.example .env
docker compose up --build
```

L'API esegue automaticamente:

- `alembic upgrade head`
- bootstrap del dataset sintetico se il database è vuoto

Se vuoi rilanciare i passaggi manualmente:

```bash
docker compose run --rm api alembic upgrade head
docker compose run --rm api python scripts/seed_demo_data.py --write-db --truncate
docker compose run --rm api python scripts/validate_seed.py --days 60
```

## Dataset sintetico

Caratteristiche correnti:

- 60 giorni di storico
- frequenza sorgente `15m`
- 50 `pv`, 10 `wind`, 5 `hydro`, 10 `gas`
- anagrafica impianti completa
- prezzi e consuntivi in tabelle separate
- aggregazione oraria derivata lato query
- validazione copertura e plausibilità inclusa

## Forecast engine

Modelli supportati:

- `ARIMA` come baseline statistica veloce
- `Prophet` come baseline avanzata
- `naive seasonal` come fallback del microservizio quando il modello richiesto fallisce o lo storico è insufficiente

Orizzonti supportati:

- `intraday` = prossime 24h
- `day-ahead` = prossime 48h

Target supportati dalla UI:

- `prezzo`
- `volume`
- `prezzo e volume`

## Event tracking utente

Il backend espone `POST /events/actions` per registrare azioni funzionali dell'utente. Gli eventi oggi includono:

- cambio persona
- cambio tema
- cambio granularità
- cambio finestra temporale nei monitor
- richiesta forecast
- completamento forecast

Ogni evento salva, quando disponibile:

- `session_id`
- `event_name`
- `surface`
- `outcome`
- `user_role`
- `theme`
- `granularity`
- `context` e `payload`
- metadati request (`request_id`, `path`, `client_host`, `user_agent`)

## Endpoint principali

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
- `GET http://localhost:8001/health`
- `POST http://localhost:8001/forecast/v1/predict`

## Quality gates

### Backend

```bash
docker compose run --rm api pytest tests
docker compose run --rm api python scripts/validate_seed.py --days 60
```

### Forecast service

```bash
docker compose build forecast-service
docker compose run --rm forecast-service python -m pytest tests
```

### Frontend

```bash
docker run --rm -v /home/matteo/Documents/energy-monitor/frontend:/app -w /app node:20-alpine npm run test
docker run --rm -v /home/matteo/Documents/energy-monitor/frontend:/app -w /app node:20-alpine npm run build
```

### Infra

```bash
docker compose config
docker compose ps
```

## Smoke test suggeriti

```bash
curl -s http://localhost:8000/health
curl -s "http://localhost:8000/dashboard/summary?granularity=1h"
curl -s "http://localhost:8000/dashboard/price-series?granularity=1h&breakdown_by=none"
curl -s "http://localhost:8000/dashboard/production-series?granularity=1h&breakdown_by=none"
curl -s -X POST http://localhost:8000/forecasts/runs \
  -H "content-type: application/json" \
  -d '{"model_type":"arima","target_kind":"both","horizon":"next_24h","granularity":"1h"}'
curl -s -X POST http://localhost:8000/events/actions \
  -H "content-type: application/json" \
  -d '{"events":[{"event_name":"smoke_test","surface":"manual","outcome":"attempted"}]}'
```

Per verificare che Mongo stia ricevendo eventi:

```bash
docker compose exec mongo mongosh --quiet --eval 'db.getSiblingDB("energy_monitor").user_action_events.find({}, { event_name: 1, surface: 1, outcome: 1 }).limit(5).toArray()'
```

## Variabili ambiente

`.env.example` copre:

- runtime base: `APP_ENV`, `LOG_LEVEL`, `TZ`
- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- backend: `FORECAST_SERVICE_URL`, `CORS_ORIGINS`
- MongoDB: `MONGO_ENABLED`, `MONGO_URL`, `MONGO_DATABASE`, `MONGO_ACTION_COLLECTION`
- frontend: `VITE_API_BASE_URL`, `VITE_FORECAST_API_BASE_URL`

## Limiti noti

- La vista `Data Analyst` non è ancora differenziata.
- Il forecast mostrato in pagina è quello appena richiesto dall'utente; il reload pagina non ricarica ancora automaticamente l'ultimo run persistito.
- Il bundle frontend è ancora migliorabile con code splitting.
- `ARIMA` può produrre warning di convergenza non bloccanti in alcuni test.
