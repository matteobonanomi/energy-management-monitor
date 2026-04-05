import type {
  DashboardFiltersState,
  FiltersResponse,
  UserRole,
} from "../types/api";

interface FilterBarProps {
  filtersData: FiltersResponse | null;
  value: DashboardFiltersState;
  role: UserRole;
  onChange: (nextValue: DashboardFiltersState) => void;
  onReset: () => void;
}

function toggleItem(items: string[], item: string): string[] {
  return items.includes(item)
    ? items.filter((currentItem) => currentItem !== item)
    : [...items, item];
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "filter-chip is-active" : "filter-chip"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  filtersData,
  value,
  role,
  onChange,
  onReset,
}: FilterBarProps) {
  const filteredPlants =
    filtersData?.plants.filter((plant) => {
      const technologyMatch =
        value.technology.length === 0 || value.technology.includes(plant.technology);
      const zoneMatch =
        value.marketZone.length === 0 || value.marketZone.includes(plant.market_zone);
      return technologyMatch && zoneMatch;
    }) ?? [];

  return (
    <section className="card filters-shell">
      <div className="filters-header">
        <div>
          <p className="eyebrow">Filters</p>
          <h2>Contesto operativo</h2>
          <p className="muted">
            {role === "portfolioManager"
              ? "Filtri essenziali per lettura di portafoglio e pricing."
              : "Filtri estesi per drill-down e verifica dei pattern di serie."}
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>
          Reset filtri
        </button>
      </div>

      <div className="filters-layout">
        <div className="filter-group">
          <span className="filter-label">Tecnologie</span>
          <div className="chip-row">
            {filtersData?.technologies.map((technology) => (
              <FilterChip
                key={technology.code}
                active={value.technology.includes(technology.code)}
                label={technology.label}
                onClick={() =>
                  onChange({
                    ...value,
                    technology: toggleItem(value.technology, technology.code),
                    plantCode: "",
                  })
                }
              />
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Zone</span>
          <div className="chip-row">
            {filtersData?.market_zones.map((zone) => (
              <FilterChip
                key={zone}
                active={value.marketZone.includes(zone)}
                label={zone}
                onClick={() =>
                  onChange({
                    ...value,
                    marketZone: toggleItem(value.marketZone, zone),
                    plantCode: "",
                  })
                }
              />
            ))}
          </div>
        </div>

        <label className="field">
          <span className="filter-label">Sessione di mercato</span>
          <select
            value={value.marketSession}
            onChange={(event) =>
              onChange({ ...value, marketSession: event.target.value })
            }
          >
            {filtersData?.market_sessions.map((session) => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="filter-label">Impianto focus</span>
          <select
            value={value.plantCode}
            onChange={(event) =>
              onChange({ ...value, plantCode: event.target.value })
            }
          >
            <option value="">Portfolio / aggregato</option>
            {filteredPlants.map((plant) => (
              <option key={plant.code} value={plant.code}>
                {plant.code} · {plant.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="filter-label">Data da</span>
          <input
            type="datetime-local"
            value={value.dateFrom}
            onChange={(event) =>
              onChange({ ...value, dateFrom: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span className="filter-label">Data a</span>
          <input
            type="datetime-local"
            value={value.dateTo}
            onChange={(event) =>
              onChange({ ...value, dateTo: event.target.value })
            }
          />
        </label>
      </div>
    </section>
  );
}
