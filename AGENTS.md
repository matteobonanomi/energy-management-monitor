# AGENTS.md

## Missione del repository

Costruire una demo locale per il monitoraggio di mercati energetici e consuntivi di produzione di impianti in portafoglio, con forecasting on-demand, mostrando disciplina da senior engineer.

Questa repository serve anche come **demo del processo**: il coding agent deve dimostrare pianificazione, implementazione incrementale, validazione, review e comunicazione dei rischi.

## Ordine di lettura obbligatorio

Prima di fare modifiche, leggi in quest'ordine:

1. `docs/01_SPECIFICA_TECNICA_COMPLETA.md`
2. `docs/02_REPOSITORY_BLUEPRINT.md`
3. `docs/03_BACKLOG_E_ACCETTAZIONE.md`
4. `docs/06_DATASET_E_FORECAST_SPEC.md`
5. `docs/07_MINI_CHANGE_LIVE.md`
6. codice già presente nella zona toccata

Non partire a implementare se non hai capito:
- architettura;
- criteri di accettazione;
- quality gates;
- confini della change.

## Scope prodotto

La web app deve mostrare:

- dati reali sintetici di produzione per impianto;
- prezzi di mercato demo-oriented;
- forecast on-demand;
- differenza chiara tra dato reale e dato previsto;
- doppia modalità utente:
  - `Portfolio Manager`
  - `Data Analyst`

## Vincoli di dominio

Usa questi default salvo override esplicito dell'utente:

- tecnologie: `pv`, `wind`, `hydro`, `gas`
- zone demo: `NORD`, `SUD`, `EST`, `OVEST`
- sessioni mercato demo: `MGP`, `MI1`, `MI2`, `MI3`
- granularità sorgente: `15m`
- granularità UI: `15m` e `1h`
- orizzonte forecast: `next_24h` e `day_ahead`

## Vincoli architetturali

### Runtime
- tutto deve girare in locale tramite `docker compose`
- target host: Ubuntu Linux normale
- niente dipendenze applicative obbligatorie fuori dai container

### Backend API
- Python
- FastAPI
- SQLAlchemy 2.0 style
- Pydantic v2
- Alembic
- structured logging

### Forecast service
- microservizio Python separato
- baseline Prophet
- fallback naive seasonal
- codice leggibile per team vicino alla data science
- nessuna architettura ML enterprise complessa

### Frontend
- React + TypeScript
- UX moderna stile mercati / trader
- dark mode e light mode
- vista Portfolio Manager e vista Data Analyst
- componenti piccoli, riusabili, tipizzati

## Regole di engineering non negoziabili

1. Prima delle modifiche medie o grandi, proponi un piano.
2. Mantieni le change piccole, reversibili e spiegabili.
3. Non introdurre dipendenze nuove senza motivazione.
4. Preferisci soluzioni noiose e manutenibili.
5. Nessuna logica di business importante dentro router FastAPI.
6. Nessuna logica analitica pesante direttamente nei componenti React.
7. Ogni change non banale deve aggiornare o aggiungere test.
8. Prima di chiudere una task, esegui o dichiara i quality gates rilevanti.
9. Esplicita sempre ipotesi, limiti e rischi residui.
10. Non dichiarare mai “production-ready” o “normativamente compliant” se non lo è davvero.

## Regole UI/UX

- look & feel sobrio, professionale, finanziario
- densità informativa alta ma leggibile
- gestione accurata di loading, empty, error
- actual e forecast chiaramente distinguibili
- granularity switch `15m / 1h`
- role switch `Portfolio Manager / Data Analyst`
- theme switch `Dark / Light`

## Regole dati

- i consuntivi reali e i prezzi di mercato stanno in tabelle separate
- i dati sorgente sono quarto-orari
- l'aggregazione oraria è derivata, non sorgente
- deve esistere una tabella anagrafica impianti con join tramite `codice_impianto`
- il dataset sintetico deve essere plausibile per tecnologia e capacità installata

## Regole forecast

- forecast singolo impianto
- forecast aggregato per portfolio / tecnologia / zona
- per gli aggregati, preferisci forecast sulla serie aggregata salvo motivazione diversa
- output con metadata e fallback chiaro
- se Prophet fallisce o i dati sono insufficienti, usa fallback semplice e dichiaralo

## Sicurezza locale

- non leggere `.env` se non richiesto
- non committare segreti
- non usare comandi distruttivi sull'host
- limita CORS agli origin locali previsti
- usa query ORM, mai string interpolation SQL
- evita accessi fuori workspace salvo esplicita approvazione

## Workflow atteso

Per task medi o grandi usa questo ciclo:

1. comprensione contesto
2. piano sintetico
3. implementazione incrementale
4. test / lint / typecheck
5. review del diff
6. summary finale

## Formato di risposta finale preferito

Quando concludi una task, usa questa struttura:

1. cosa hai cambiato
2. file toccati
3. check eseguiti
4. rischi residui
5. prossima mossa consigliata

## Definition of done

Una task non è conclusa se non sono veri tutti i punti applicabili:

- implementazione coerente con le specifiche
- test aggiornati dove necessario
- codice leggibile e modulare
- nessun degrado architetturale evidente
- output finale trasparente su qualità e limiti
