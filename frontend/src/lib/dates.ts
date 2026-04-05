export function isoToLocalInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function localInputToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

export function shiftIsoHours(value: string | null, hours: number): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return isoToLocalInputValue(date.toISOString());
}

export function buildRangeIsoBounds(
  window: "1w" | "2w" | "1m" | "max",
  minTimestamp: string | null,
  maxTimestamp: string | null,
): { startIso: string; endIso: string } | null {
  if (!maxTimestamp) {
    return null;
  }

  const end = new Date(maxTimestamp);
  const start = new Date(maxTimestamp);

  if (window === "1w") {
    start.setDate(start.getDate() - 7);
  } else if (window === "2w") {
    start.setDate(start.getDate() - 14);
  } else if (window === "1m") {
    start.setMonth(start.getMonth() - 1);
  } else if (minTimestamp) {
    start.setTime(new Date(minTimestamp).getTime());
  }

  if (minTimestamp) {
    const minimum = new Date(minTimestamp).getTime();
    if (start.getTime() < minimum) {
      start.setTime(minimum);
    }
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
