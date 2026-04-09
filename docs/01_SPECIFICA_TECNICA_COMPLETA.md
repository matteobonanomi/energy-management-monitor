# Specifica tecnica completa

## Executive summary

Il repository implementa una demo locale multi-servizio per monitorare prezzi di mercato e produzione di un portfolio di impianti energetici, con forecast on-demand e tracciamento delle principali azioni utente.

La demo ha due obiettivi:

- mostrare una web app concreta, non toy
- mostrare un processo di sviluppo governato da standard, test, logging e documentazione

## Scope prodotto attuale

La web app offre oggi:

- header sticky con KPI rapidi e popup impostazioni per `Persona`, `Theme`, `Granularity`
- layout singolo in griglia `2x2`
- monitor prezzi
- monitor produzione portfolio
- area KPI `3x2`
- `Forecast Engine` con selezione modello, orizzonte e target
- box `RESULTS` compatto con `status`, `durata`, `modelli` e popup `MORE DETAILS` per metriche estese
- distinzione visiva actual vs forecast con linee tratteggiate
- tracking azioni utente verso MongoDB

## Personas

### Portfolio Manager

Vista oggi ottimizzata per sintesi:

- KPI portfolio
- andamento prezzi
- andamento produzione
- trigger forecast immediato

### Data Analyst

La beta usa temporaneamente la stessa composizione del Portfolio Manager.
Il ruolo resta utile a livello architetturale perché i payload UI e il tracking eventi sono già predisposti per future personalizzazioni.
Quando il target include la produzione aggregata, la simulazione può lanciare un run totale più run per tecnologia, in linea con la vista Portfolio Manager.

## Architettura target

### Frontend

- React + TypeScript
- Vite
- componenti piccoli e tipizzati
- hook per data loading e trasformazioni leggere
- grafici lineari essenziali

### Backend API

- FastAPI
- SQLAlchemy 2.0 style
- Pydantic v2
- Alembic
- structlog

### Forecast service

- microservizio FastAPI separato
- modelli `ARIMA` e `Prophet`
- fallback `naive seasonal`

### Persistenza

- PostgreSQL per master data, prezzi, consuntivi e run forecast
- MongoDB per eventi utente e futura tracciabilità sessione

## Flussi principali

### Lettura dashboard

1. il frontend chiama `/filters`, `/dashboard/summary`, `/dashboard/price-series`, `/dashboard/production-series`
2. il backend aggrega dati SQL in `15m` o `1h`
3. la UI visualizza serie e KPI coerenti con la finestra selezionata

### Esecuzione forecast

1. l'utente seleziona modello, orizzonte e target
2. il frontend invia `POST /forecasts/runs`
3. il backend recupera storico aggregato da PostgreSQL
4. per richieste produzione aggregate (Portfolio Manager e Data Analyst), il backend può creare sia il forecast aggregato sia run separati per tecnologia
5. il backend chiama `forecast-service`
6. il backend persiste i run SQL
7. il frontend mostra il forecast nei grafici superiori, includendo overlay portfolio e per-tecnologia dove richiesto
8. il forecast-service restituisce punti e metadata, con metriche dettagliate consultabili dalla popup `MORE DETAILS`

### Tracking eventi utente

1. il frontend invia `POST /events/actions`
2. il backend arricchisce gli eventi con metadata request
3. gli eventi vengono salvati su MongoDB se abilitato
4. in caso di indisponibilità del tracking, la UI continua a funzionare

## Vincoli tecnici

- tutto eseguibile via `docker compose`
- nessuna dipendenza applicativa obbligatoria fuori dai container
- router FastAPI sottili
- logica business nei servizi
- query esplicite e testabili
- trasformazioni UI non pesanti nei componenti leaf
- forecast e actual chiaramente distinguibili

## Dataset sintetico

- 60 giorni
- sorgente `15m`
- 50 `pv`, 10 `wind`, 5 `hydro`, 10 `gas`
- prezzi separati dai consuntivi
- anagrafica impianti completa
- aggregazione `1h` derivata

## Logging e osservabilità

- log JSON strutturati
- `request_id` su ogni request
- log di start/stop applicazione
- log per tracking eventi utente
- log di esecuzione forecast

## Quality gates attesi

- `docker compose config`
- backend `pytest`
- validazione dataset
- test forecast-service
- test e build frontend

## Limiti consapevoli

- vista `Data Analyst` ancora parzialmente sovrapposta al `Portfolio Manager` nel layout
- auto-restore dell'ultimo forecast non ancora implementato al refresh
- la demo non è da considerarsi production-ready o normativamente compliant
