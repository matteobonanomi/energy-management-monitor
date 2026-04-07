# Frontend screen inventory

## Scopo

Questo inventario descrive le superfici UI reali del frontend attuale. Serve a capire dove vive il valore demo oggi e quali viste sono primarie, secondarie o legacy.

## 1. App shell principale

Entry point:

- [App.tsx](/home/matteo/Documents/energy-monitor/frontend/src/app/App.tsx)

Responsabilità:

- monta il tema
- mantiene persona, granularità e finestre temporali
- orchestral i principali hook di fetch
- coordina forecast execution e overlay
- apre i modal contestuali

Questa è la schermata di prodotto principale. Tutto il resto ruota intorno a lei.

## 2. Header globale

Componente:

- [AppHeader.tsx](/home/matteo/Documents/energy-monitor/frontend/src/components/AppHeader.tsx)

Contiene:

- `Profile`
- `Theme`
- `Granularity`

Perché esiste:

- questi switch cambiano più pannelli insieme, quindi devono stare sopra la griglia e non dentro un singolo panel

## 3. Portfolio Manager view

Condizione:

- `role === "portfolioManager"`

Superfici visibili:

- `Price monitor`
- `Energy monitor`
- `Portfolio KPIs`
- `Forecast Engine`

Dettagli:

- i due monitor sono pannelli indipendenti con time window locale
- la produzione è mostrata stacked per tecnologia
- il forecast appare come overlay sulle serie monitorate
- i KPI sono fissi e pensati per sintesi rapida

Questa è la vista più vicina alla narrativa “operativa” della demo.

## 4. Data Analyst view

Condizione:

- `role === "dataAnalyst"`

Superfici visibili:

- `Price-Plant chart` a larghezza doppia
- `Custom KPIs`
- `Forecast Engine`

Dettagli:

- il pannello principale usa doppio asse: produzione a sinistra, prezzo a destra
- la produzione può essere filtrata per portfolio, zona o singolo impianto
- i KPI sono configurabili a slot
- il forecast engine abilita advanced settings e modelli aggiuntivi

Questa vista è già distinta dalla Portfolio Manager view sul piano del task, anche se condivide buona parte della shell.

## 5. Modali contestuali

### Advanced settings

Componente:

- [AdvancedSettingsModal.tsx](/home/matteo/Documents/energy-monitor/frontend/src/components/AdvancedSettingsModal.tsx)

Uso:

- configurazione iperparametri forecast per `Data Analyst`

### Plant selector

Componente:

- [PlantSelectorModal.tsx](/home/matteo/Documents/energy-monitor/frontend/src/components/PlantSelectorModal.tsx)

Uso:

- selezione rapida del singolo impianto per il chart analitico

### KPI picker

Componente:

- [AnalystKpiPickerModal.tsx](/home/matteo/Documents/energy-monitor/frontend/src/components/AnalystKpiPickerModal.tsx)

Uso:

- popolamento degli slot KPI custom

Questi modal esistono per togliere complessità dalla superficie principale finché l’utente non la richiede.

## 6. Vista legacy Forecast Lab

Componente:

- [ForecastLabView.tsx](/home/matteo/Documents/energy-monitor/frontend/src/features/forecast-lab/ForecastLabView.tsx)

Stato:

- compatibilità/legacy

Perché esiste ancora:

- conserva un entrypoint storico per forecast composition senza reintrodurre quella complessità nella home principale

Non è la schermata principale della demo e non dovrebbe guidare nuove feature salvo motivazione esplicita.

## 7. Viste composte backend-driven non montate nella shell attuale

Componente:

- [DashboardView.tsx](/home/matteo/Documents/energy-monitor/frontend/src/features/dashboard/DashboardView.tsx)

Stato:

- export disponibile ma non usato nella shell principale corrente

Valore:

- incapsula una lettura dashboard interamente guidata da payload backend
- utile come superficie di composizione separata o per evoluzioni future

## Inventario sintetico

- primaria: `App` con varianti `Portfolio Manager` e `Data Analyst`
- secondarie: modali contestuali per KPI, plant focus e hyperparameters
- legacy: `ForecastLabView`
- dormant/reusable: `DashboardView`, `FilterBar`, `KpiRibbon`, `PlaceholderPanel`

## Nota per change future

Quando aggiungi una nuova schermata, chiarisci subito se è:

- una variante della shell principale
- una vista secondaria raggiungibile da un pannello
- una superficie legacy da mantenere ma non estendere

Questo evita che il repo accumuli viste esportate ma senza ruolo chiaro nel prodotto.
