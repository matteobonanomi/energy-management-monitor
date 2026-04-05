# Copione demo per CIO / Head of Engineering

## Messaggio chiave

La demo mostra che un coding agent accelera il delivery perché comprime pianificazione, implementazione, verifica e remediation, senza eliminare controllo tecnico, test o responsabilità umana.

## Sequenza consigliata

### 1. Apertura

- mostra `AGENTS.md`
- mostra `README.md`
- spiega che il repo contiene guard rail, non solo codice

### 2. Architettura

Mostra:

- frontend React
- backend FastAPI
- forecast-service separato
- PostgreSQL per dati di dominio
- MongoDB per user action tracking

### 3. UI live

Mostra:

- header compatto
- `Portfolio Manager / Data Analyst`
- `Dark / Light`
- `15m / 1h`
- i due monitor superiori
- la griglia KPI

### 4. Forecast live

- scegli `ARIMA` o `Prophet`
- lancia `prezzo e volume`
- fai notare l'overlay forecast tratteggiato
- mostra i run persistiti via API

### 5. Tracciabilità

- cambia tema o granularità
- invia qualche azione utente
- fai vedere che gli eventi sono in MongoDB

### 6. Dietro le quinte

Mostra rapidamente:

- `.codex/`
- `.agents/skills/`
- test e quality gates

## Cose da dire esplicitamente

- l'agente non sostituisce ownership e giudizio tecnico
- la velocità dipende da contesto, regole e verifiche
- il repo è costruito per change piccole e leggibili

## Cose da evitare

- claim di production-readiness
- claim di compliance normativa
- demo di change troppo grandi e non verificabili in tempo reale
