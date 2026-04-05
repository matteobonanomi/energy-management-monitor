# Prompt operativi per Codex

I prompt sotto sono scritti in modo riutilizzabile. Gli esempi fanno riferimento a questo repository, ma il formato è pensato per applicarsi anche ad altri progetti multi-servizio.

## 1. Allineamento iniziale

```text
Leggi AGENTS.md e la documentazione principale del repository.
Poi:
1. riassumi obiettivo prodotto, architettura e quality gates;
2. elenca i documenti e i file da cui dipenderai;
3. identifica i principali rischi;
4. proponi un piano sintetico senza ancora modificare file.
```

## 2. Bootstrap o riallineamento repo

```text
Usa lo skill bootstrap-energy-demo.
Scaffolda o riallinea il repository mantenendo una struttura semplice, leggibile e testabile.
Vincoli:
- docker compose locale
- backend API separato
- frontend separato
- eventuali microservizi separati
- niente over-engineering
Alla fine mostrami:
- file creati o toccati
- struttura risultante
- prossimi step
```

## 3. Backend API

```text
Usa lo skill implement-python-api.
Implementa o modifica il backend rispettando:
- router sottili
- servizi e query layer separati
- SQLAlchemy 2.0
- Pydantic v2
- log strutturati
- test endpoint e servizi
```

## 4. Forecasting o analytics service

```text
Usa lo skill implement-forecast-service.
Implementa o modifica un microservizio di forecast/analytics con:
- contratto request/response chiaro
- baseline statistica leggibile
- eventuale modello avanzato opzionale
- fallback esplicito
- test minimi
```

## 5. Dashboard React

```text
Usa lo skill implement-react-dashboard.
Implementa o modifica il frontend con:
- layout chiaro
- switch globali
- grafici essenziali
- actual vs forecast ben distinguibili
- loading, empty, error state
- test componenti core
```

## 6. Dataset sintetico

```text
Usa lo skill generate-synthetic-energy-data.
Genera o aggiorna un dataset demo plausibile con:
- frequenza sorgente coerente col dominio
- master data completa
- regole di plausibilità chiare
- validazioni automatiche
```

## 7. Change request visibile end-to-end

```text
Usa lo skill demo-change-request.
Implementa una modifica piccola ma completa che tocchi i layer necessari.
Requisiti:
- change visibile in demo
- backend/frontend/docs/test allineati
- niente patch sparse o incoerenti
```

## 8. Quality gate o review finale

```text
Usa lo skill run-quality-gates.
Esegui i check rilevanti rispetto alla change fatta.
Riporta:
- check eseguiti
- pass/fail
- gap residui
```

## 9. Executive summary

```text
Usa lo skill executive-summary.
Prepara un summary breve per stakeholder non tecnici con:
- obiettivo
- cambi principali
- controlli di qualità
- rischi residui
- valore del coding agent nel processo
```
