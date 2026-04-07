import { useEffect, useMemo, useState } from "react";

import {
  analystKpiCatalog,
  loadAnalystKpiValue,
  type AnalystKpiDefinition,
  type AnalystKpiValue,
} from "../lib/analystKpis";
import type { Granularity } from "../types/api";
import { HelpTooltip } from "./HelpTooltip";
import { LoadingBattery } from "./LoadingBattery";
import { AnalystKpiPickerModal } from "./AnalystKpiPickerModal";

interface AnalystKpiGridProps {
  maxTimestamp: string | null;
  granularity: Granularity;
}

type AnalystKpiSlotState =
  | {
      status: "loading";
    }
  | {
      status: "ready";
      value: AnalystKpiValue;
    }
  | {
      status: "error";
      error: string;
    };

const EMPTY_SLOTS = Array<string | null>(6).fill(null);

/**
 * Trades a fixed KPI layout for configurable slots so analyst workflows can
 * assemble a temporary metric board without changing dashboard structure.
 */
export function AnalystKpiGrid({
  maxTimestamp,
  granularity,
}: AnalystKpiGridProps) {
  const [slots, setSlots] = useState<Array<string | null>>(EMPTY_SLOTS);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [valuesById, setValuesById] = useState<Record<string, AnalystKpiSlotState>>({});

  const catalogById = useMemo(
    () =>
      new Map<string, AnalystKpiDefinition>(
        analystKpiCatalog.map((definition) => [definition.id, definition]),
      ),
    [],
  );
  const selectedIds = useMemo(
    () => Array.from(new Set(slots.filter((slotId): slotId is string => Boolean(slotId)))),
    [slots],
  );

  useEffect(() => {
    if (!maxTimestamp || selectedIds.length === 0) {
      return;
    }

    let cancelled = false;
    setValuesById((current) => {
      const next = { ...current };
      for (const kpiId of selectedIds) {
        next[kpiId] = { status: "loading" };
      }
      return next;
    });

    Promise.all(
      selectedIds.map(async (kpiId) => {
        try {
          const value = await loadAnalystKpiValue(kpiId, maxTimestamp, granularity);
          return [kpiId, { status: "ready", value } satisfies AnalystKpiSlotState] as const;
        } catch (reason) {
          return [
            kpiId,
            {
              status: "error",
              error:
                reason instanceof Error
                  ? reason.message
                  : "Unable to load the selected KPI.",
            } satisfies AnalystKpiSlotState,
          ] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setValuesById((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [granularity, maxTimestamp, selectedIds]);

  function handleKpiSelect(definition: AnalystKpiDefinition) {
    if (activeSlotIndex === null) {
      return;
    }
    setSlots((current) => {
      const next = [...current];
      next[activeSlotIndex] = definition.id;
      return next;
    });
    setActiveSlotIndex(null);
  }

  function handleKpiClear(slotIndex: number) {
    setSlots((current) => {
      const next = [...current];
      next[slotIndex] = null;
      return next;
    });
  }

  return (
    <>
      <div className="kpi-grid-3x2">
        {slots.map((slotId, index) => {
          if (!slotId) {
            return (
              <button
                key={`slot-${index + 1}`}
                type="button"
                className="kpi-tile analyst-kpi-slot analyst-kpi-slot-empty"
                aria-label={`Add KPI to slot ${index + 1}`}
                onClick={() => setActiveSlotIndex(index)}
              >
                <span className="analyst-kpi-plus">+</span>
                <span className="analyst-kpi-empty-copy">Add KPI</span>
              </button>
            );
          }

          const definition = catalogById.get(slotId);
          const state = valuesById[slotId];

          return (
            <article key={`slot-${index + 1}-${slotId}`} className="kpi-tile analyst-kpi-slot">
              <div className="kpi-heading analyst-kpi-heading">
                <span className="kpi-title">{definition?.title ?? "Custom KPI"}</span>
                <div className="analyst-kpi-actions">
                  {definition ? (
                    <HelpTooltip
                      label={`Help ${definition.title}`}
                      text={definition.helpText}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="analyst-kpi-clear"
                    aria-label={`Clear slot ${index + 1}`}
                    onClick={() => handleKpiClear(index)}
                  >
                    X
                  </button>
                </div>
              </div>

              {!maxTimestamp || state?.status === "loading" ? (
                <div className="analyst-kpi-body analyst-kpi-body-loading">
                  <LoadingBattery label="Loading KPI..." />
                </div>
              ) : state?.status === "error" ? (
                <div className="analyst-kpi-body analyst-kpi-body-error">
                  <p>{state.error}</p>
                </div>
              ) : state?.status === "ready" ? (
                <strong className="kpi-value">
                  <span>{state.value.value}</span>
                  {state.value.unit ? <span className="kpi-unit">{state.value.unit}</span> : null}
                </strong>
              ) : (
                <strong className="kpi-value">
                  <span>--</span>
                </strong>
              )}
            </article>
          );
        })}
      </div>

      {activeSlotIndex !== null ? (
        <AnalystKpiPickerModal
          onClose={() => setActiveSlotIndex(null)}
          onSelect={handleKpiSelect}
        />
      ) : null}
    </>
  );
}
