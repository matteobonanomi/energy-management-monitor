import { useEffect, useReducer, useState } from "react";

import { energyApi } from "../api/client";
import type { FiltersResponse } from "../types/api";

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
            : "Impossibile caricare i filtri disponibili.",
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
