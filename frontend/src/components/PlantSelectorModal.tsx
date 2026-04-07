import { useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import type { FilterPlantOption } from "../types/api";

interface PlantSelectorModalProps {
  plants: FilterPlantOption[];
  onClose: () => void;
  onSelect: (plant: FilterPlantOption) => void;
}

/**
 * Keeps plant lookup out of the main analyst control strip so single-asset
 * focus remains available without making the chart header noisy.
 */
export function PlantSelectorModal({
  plants,
  onClose,
  onSelect,
}: PlantSelectorModalProps) {
  const [query, setQuery] = useState("");

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return plants;
    }
    return plants.filter((plant) =>
      plant.name.toLowerCase().includes(normalizedQuery),
    );
  }, [plants, query]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const modalContent = (
    <div className="advanced-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="advanced-modal-card plant-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plant-selector-title"
      >
        <button
          type="button"
          className="advanced-modal-close"
          aria-label="Close plant selector"
          onClick={onClose}
        >
          X
        </button>

        <div className="advanced-modal-header">
          <p className="advanced-modal-eyebrow">Plant selector</p>
          <h3 id="plant-selector-title">Single plant</h3>
        </div>

        <div className="plant-selector-body">
          <input
            type="search"
            aria-label="Plant search"
            className="plant-selector-search"
            placeholder="Search by plant name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="plant-selector-grid">
            {filteredPlants.map((plant) => (
              <button
                key={plant.code}
                type="button"
                className="plant-selector-item"
                onClick={() => onSelect(plant)}
              >
                {plant.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
