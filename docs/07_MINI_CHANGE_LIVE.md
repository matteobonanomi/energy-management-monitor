# Mini change live suggerite

## Obiettivo

Mostrare che il repository regge change piccole ma cross-stack senza perdere controllo.

## Mini change 1 — Data Analyst view

### Richiesta

Specializzare davvero la vista `Data Analyst` mantenendo invariata quella `Portfolio Manager`.

### Impatto atteso

- frontend
- eventuali endpoint o breakdown aggiuntivi
- test componenti e servizi

### Perché funziona in demo

- è immediatamente visibile
- non richiede stravolgimenti architetturali
- evidenzia reuse dei layer già presenti

## Mini change 2 — Restore ultimo forecast

### Richiesta

Alla riapertura della pagina, ricaricare l'ultimo forecast coerente con modello base e granularità selezionata.

### Impatto atteso

- backend query su latest run
- frontend bootstrap stato
- test end-to-end dei pannelli

## Checklist live

Prima:

1. piano sintetico
2. layer impattati
3. rischi e ipotesi

Dopo:

1. test rilevanti
2. file toccati
3. rischi residui
4. prossima mossa consigliata
