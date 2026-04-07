# Frontend state management

## Obiettivo

Il frontend attuale non usa uno store globale dedicato. La strategia scelta è `state colocato + hook custom + utility pure`. È una scelta intenzionale: per questa demo la parte difficile non è sincronizzare molti screen indipendenti, ma mantenere leggibile una shell unica con pochi stati globali ad alto impatto.

## Livelli di stato

## 1. Stato shell in `App`

File:

- [App.tsx](/home/matteo/Documents/energy-monitor/frontend/src/app/App.tsx)

Qui vivono gli stati che cambiano il significato di più pannelli:

- `role`
- `theme`
- `granularity`
- finestre temporali dei monitor
- selezione analyst view
- plant selection e modal state

Questo stato resta in alto perché influenza dati caricati, copy mostrato, controlli disponibili e forecast scope.

## 2. Stato di fetch nei custom hook

Hook principali:

- [useFiltersData.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/useFiltersData.ts)
- [useMonitorSeries.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/useMonitorSeries.ts)
- [usePortfolioSummary.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/usePortfolioSummary.ts)
- [useDashboardData.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/useDashboardData.ts)
- [useForecastExecution.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/useForecastExecution.ts)

Ogni hook incapsula:

- chiamata API
- stato `loading`
- stato `error`
- cancellazione con `AbortController` dove serve
- `refresh` locale quando il dato deve essere ricaricato

Perché è utile:

- evita `fetch` sparsi nei componenti
- mantiene il JSX focalizzato su rendering e interazione
- permette di cambiare la policy di loading/error una volta sola

## 3. Stato locale di componente

Esempi:

- query di ricerca nei modal
- slot selezionato in `AnalystKpiGrid`
- bozza hyperparameter in `ForecastEnginePanel`

Questo stato resta locale perché non ha impatto cross-panel e sarebbe rumore se promosso nella shell.

## Forma dei dati

### Contratti API

I payload condivisi col backend sono tipizzati in:

- [types/api.ts](/home/matteo/Documents/energy-monitor/frontend/src/types/api.ts)

Perché conta:

- l’app tratta il backend come fonte autorevole dei contratti
- componenti e hook lavorano su tipi stabili invece che su oggetti anonimi

### Trasformazioni leggere

Le trasformazioni di presentazione stanno in:

- [lib/charts.ts](/home/matteo/Documents/energy-monitor/frontend/src/lib/charts.ts)
- [lib/format.ts](/home/matteo/Documents/energy-monitor/frontend/src/lib/format.ts)
- [lib/dates.ts](/home/matteo/Documents/energy-monitor/frontend/src/lib/dates.ts)
- [lib/analystKpis.ts](/home/matteo/Documents/energy-monitor/frontend/src/lib/analystKpis.ts)

La regola implicita del repo è:

- i componenti non aggregano dati complessi
- i chart ricevono dataset già normalizzati
- le conversioni di data e i formatter non si duplicano nel JSX

## Forecast flow

Lo stato forecast è il caso più “ricco” del frontend e vive in:

- [useForecastExecution.ts](/home/matteo/Documents/energy-monitor/frontend/src/hooks/useForecastExecution.ts)

Questo hook mantiene:

- form state
- advanced settings per modello
- response dell’ultimo run
- error e processing time in caso di fallimento
- mappa `runsBySignal` utile alla shell per decidere gli overlay corretti

La shell non conosce i dettagli della chiamata HTTP; conosce solo lo stato già risolto dell’interazione forecast.

## Tracking state

Il tracking utente non introduce stato React dedicato. Usa:

- [userActionTracking.ts](/home/matteo/Documents/energy-monitor/frontend/src/lib/userActionTracking.ts)

Scelta intenzionale:

- il tracking è best-effort
- non deve bloccare o orchestrare il rendering
- il suo unico dato persistente lato browser è il `session_id`

## Perché non c’è uno store globale

Oggi uno store tipo Redux/Zustand sarebbe più costoso che utile perché:

- la UI è una singola shell, non un’app multi-route complessa
- i dati condivisi ad alto impatto sono pochi e leggibili in `App`
- molta logica è già naturalmente separata in hook custom
- introdurre un ulteriore layer aumenterebbe il costo di onboarding senza risolvere un problema pressante

## Segnali che giustificherebbero un’evoluzione

Valutare uno store dedicato se diventano veri contemporaneamente alcuni segnali:

- più schermate con stato condiviso cross-route
- restore persistente di forecast e filtri
- sincronizzazione tra più pannelli indipendenti non più gestibile in `App`
- branching più profondo per persona e workspace

Fino ad allora, il modello attuale resta “noioso ma leggibile”, che per questa demo è il trade-off giusto.
