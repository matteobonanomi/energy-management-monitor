# Frontend design system

## Obiettivo

Il frontend non usa un design system formale con token package dedicato, ma esiste già un linguaggio UI coerente. Documentarlo serve a mantenere la demo sobria, leggibile e facile da estendere senza derive casuali tra pannelli.

## Fondazioni

### Tema e token

I token principali vivono in [styles.css](/home/matteo/Documents/energy-monitor/frontend/src/styles.css) sotto `:root`, `[data-theme="dark"]` e `[data-theme="light"]`.

Le categorie più importanti sono:

- background pagina e superfici
- bordi e shadow
- testo e muted copy
- accenti
- colori tooltip e modal
- colore griglia dei chart

Il tema non cambia struttura o componenti, cambia il tono visivo mantenendo la stessa semantica.

### Tipografia

La UI usa una famiglia orientata a leggibilità business:

- `"Aptos", "Aptos Display", "Manrope", "Segoe UI Variable", "Segoe UI", sans-serif`

La gerarchia è semplice:

- `eyebrow` per contesto e tassonomia
- `h1`/`h2` per pannelli e shell
- `lead` e `muted` per testo di supporto
- valori KPI in `strong` o classi dedicate

Questo aiuta una dashboard densa a restare leggibile senza moltiplicare varianti tipografiche.

## Primitive principali

### Shell e card

- `page-shell` definisce il contenitore massimo e la cornice della pagina.
- `card` è la superficie base.
- `SectionCard` è la primitive di pannello riusata da monitor, forecast, narrative panel e stati.

La scelta qui è intenzionale: una sola primitive forte riduce il rischio di pannelli “speciali” che rompono il ritmo della griglia.

### Controlli globali

`AppHeader` usa `segment-card` e `segment-button` per gli switch globali. Questa grammatica va riservata a controlli che cambiano davvero il contesto della pagina.

### Controlli locali

- `window-button` per cambiare profondità storica
- `ghost-button` per azioni secondarie o recupero
- `primary-button` per trigger principali come `RUN`
- `secondary-button` per azioni avanzate ma non primarie

### Stati

Gli stati visivi standard sono:

- `LoadingBattery` per attese con significato operativo
- `LoadingPanel` per pannelli ancora in bootstrap
- `ErrorPanel` per errori recuperabili
- `EmptyPanel` per assenza valida di contenuto

Questo evita ambiguità tra “sto caricando”, “ho fallito” e “non ho dati”.

## Pattern chart

I chart usano `Recharts`, ma il contratto visivo è deciso localmente:

- griglia sottile sempre presente
- label temporali compatte
- palette tecnologia coerente
- forecast sempre separato con linea tratteggiata
- dati già trasformati in `ChartDatum` prima di entrare nel componente chart

Palette tecnologia corrente:

- `pv` = amber
- `wind` = cyan
- `hydro` = teal
- `gas` = orange

Il forecast usa uno stile dedicato, non un colore di tecnologia, perché semanticamente rappresenta una natura diversa del dato.

## Modali e tooltip

- `AdvancedSettingsModal`, `PlantSelectorModal` e `AnalystKpiPickerModal` riusano la stessa struttura modal
- `HelpTooltip` è la primitive per spiegazioni compatte dove il layout non può permettersi testo lungo

Le tooltip servono a spiegare il perché di una scelta o di un parametro, non a ripetere l'etichetta del campo.

## Regole pratiche per estensioni future

- se serve una nuova superficie, partire da `SectionCard` e giustificare la deviazione
- se un controllo cambia il contesto di tutta la pagina, appartiene all'header o ne deve imitare la grammatica
- non introdurre logica dati nei chart; trasformare prima in `lib/` o hook
- non usare la stessa codifica visiva per `actual` e `forecast`
- loading, error ed empty devono restare espliciti

## Limiti attuali

- non esiste ancora una libreria separata di token o component package
- alcune viste legacy, come `ForecastLabView`, riusano solo parte della grammatica attuale
- il sistema è documentato ma non ancora enforced da tooling o visual regression
