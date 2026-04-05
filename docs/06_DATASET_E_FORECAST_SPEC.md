# Specifica dataset e forecast

## Dataset sintetico

### Orizzonte

- ultimi 60 giorni circa
- frequenza sorgente `15m`
- timestamp coerenti in UTC
- aggregazione `1h` derivata lato query

### Fleet impianti

- 50 `pv`
- 10 `wind`
- 5 `hydro`
- 10 `gas`

### Campi master data minimi

- `code`
- `name`
- `technology`
- `market_zone`
- `capacity_mw`
- `latitude`
- `longitude`
- `commissioned_at`
- `is_active`

### Regole di plausibilità

- PV: zero di notte, curva diurna
- wind: variabile e autocorrelato
- hydro: più stabile
- gas: dispatchable
- prezzi separati dai consuntivi
- coerenza `energy_mwh = power_mw * 0.25`

## Forecast

### Target oggi usati dalla UI

- `price`
- `production`

### Modelli disponibili

- `ARIMA`
- `Prophet`
- fallback `naive seasonal`

### Orizzonti

- `next_24h`
- `day_ahead`

### Flusso

1. il backend aggrega lo storico necessario
2. il backend chiama il microservizio forecast
3. il microservizio prova il modello richiesto
4. se necessario usa fallback esplicito
5. il backend persiste run e valori previsti
6. la UI mostra il forecast sopra lo storico

### Requisiti qualitativi

- contratto stabile e leggibile
- metadata modello restituiti
- fallback dichiarato
- test per casi nominali e storico corto
