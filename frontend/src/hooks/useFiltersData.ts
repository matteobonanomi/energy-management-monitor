import { useEffect, useReducer, useState } from "react";

import { energyApi } from "../api/client";
import type { FiltersResponse } from "../types/api";

/**
 * Loads filter metadata once and exposes refresh semantics so the app shell
 * can bootstrap around backend-supported values instead of hardcoded guesses.
 */
export function useFiltersData() {
  const [data, setData] = useState<FiltersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    energyApi
      .getFilters(controller.signal)
      .then((response) => {
        setData(response);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load the available filters.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [version]);

  return { data, error, loading, refresh };
}
