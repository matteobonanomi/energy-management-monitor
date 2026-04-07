# Frontend

Il frontend è una single-page React + TypeScript pensata per mostrare il prodotto in demo senza perdere leggibilità tecnica. Il suo compito non è fare analitica pesante: prende payload già aggregati dal backend, li trasforma in dataset chart-friendly e coordina persona, tema, granularità e forecast on-demand.

## Perché è organizzato così

- `src/app/` contiene l'app shell e lo stato globale della pagina, perché persona, theme e granularity devono influenzare più pannelli insieme.
- `src/components/` raccoglie componenti riusabili e panel primitives, così il layout resta denso ma composabile.
- `src/hooks/` centralizza fetch, loading, error e cancellation policy, evitando che i componenti presentazionali parlino direttamente con l'API.
- `src/lib/` contiene formatter, aggregatori e configurazioni UI, così le trasformazioni non si spargono nel JSX.
- `src/features/` ospita viste composte o flussi legacy che hanno senso come slice di prodotto e non come singolo componente.
- `src/types/api.ts` definisce i contratti condivisi con il backend per mantenere la UI typed e leggibile.

## Vista attuale

La shell principale è [App.tsx](./src/app/App.tsx) e oggi espone due modalità:

- `Portfolio Manager`
- `Data Analyst`

Entrambe condividono:

- header globale con `Profile`, `Theme`, `Granularity`
- griglia principale con monitor e pannelli KPI/forecast
- distinzione visiva netta tra actual e forecast
- tracking best-effort delle azioni utente verso il backend

La vista `Portfolio Manager` privilegia monitoraggio e sintesi. La vista `Data Analyst` riusa la shell ma sposta il focus su un chart dual-axis, KPI configurabili e impostazioni forecast avanzate.

## Flusso dati

1. `App` carica i filtri bootstrap con `useFiltersData`.
2. Le finestre temporali locali vengono convertite in bound ISO da `lib/dates.ts`.
3. I monitor usano `useMonitorSeries` o hook dedicati per leggere dati dal backend.
4. Le utility in `lib/charts.ts` trasformano le serie API in dataset pronti per Recharts.
5. `useForecastExecution` gestisce form, advanced settings, invocazione forecast e stato dell'ultimo run.
6. I chart ricevono già dati modellati e non conoscono dettagli del backend.

## Decisioni UI importanti

- La shell mantiene persona, tema e granularità in alto perché sono switch globali, non filtri locali.
- I monitor mostrano stati `loading`, `error` ed `empty` in modo esplicito per evitare pannelli “muti”.
- Le trasformazioni dati restano fuori dal JSX per non spostare logica analitica nei componenti leaf.
- Il forecast overlay usa sempre un canale visivo separato, così in demo actual e forecast non si confondono.

## Script locali

```bash
npm test
npm run build
```

## Documenti correlati

- [Design system](../docs/frontend/design_system.md)
- [Screen inventory](../docs/frontend/screen_inventory.md)
- [State management](../docs/frontend/state_management.md)
