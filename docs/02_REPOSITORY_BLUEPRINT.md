# Repository blueprint

## Struttura corrente di riferimento

```text
energy-monitor/
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── .env.example
├── .codex/
│   ├── config.toml
│   ├── config.user.example.toml
│   ├── hooks.json
│   ├── hooks/
│   ├── rules/
│   └── agents/
├── .agents/
│   └── skills/
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
├── forecast-service/
│   ├── pyproject.toml
│   ├── app/
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
├── scripts/
├── data/
└── docs/
```

## Convenzioni

### Backend

- router sottili
- servizi espliciti
- repository/query layer separato
- schemi Pydantic separati dai modelli ORM
- logging strutturato

### Forecast service

- contratto semplice
- servizio forecasting concentrato in pochi moduli leggibili
- fallback esplicito

### Frontend

- una sola app shell
- componenti presentazionali leggeri
- hook dedicati per fetch e composizione dati
- tipi API condivisi in `src/types`

### Tracking eventi

- endpoint dedicato in backend
- arricchimento server-side con request metadata
- persistenza Mongo opzionale ma prevista nello stack locale

## Decisioni progettuali rilevanti

- PostgreSQL e MongoDB hanno responsabilità diverse e complementari
- i forecast run persistono in SQL perché fanno parte del dominio applicativo
- gli eventi utente persistono in MongoDB perché hanno struttura più flessibile e saranno base per sessioni future
- la UI beta è single-page per privilegiare leggibilità demo e velocità di modifica

## Anti-pattern da evitare

- business logic importante nei router
- forecasting direttamente nel backend API
- trasformazioni analitiche pesanti nei componenti React
- analytics utente sparsi nel codice senza un endpoint/server contract unico
