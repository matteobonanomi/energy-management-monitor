import { energyApi } from "../api/client";
import type {
  Granularity,
  ThemeMode,
  UserActionEventCreate,
  UserRole,
} from "../types/api";

const SESSION_STORAGE_KEY = "energy-monitor/session-id";

interface TrackUserActionInput {
  eventName: string;
  surface: string;
  outcome?: UserActionEventCreate["outcome"];
  role?: UserRole;
  theme?: ThemeMode;
  granularity?: Granularity;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

export function getTrackingSessionId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return generateSessionId();
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = generateSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

export async function trackUserAction({
  eventName,
  surface,
  outcome = "changed",
  role,
  theme,
  granularity,
  context,
  payload,
}: TrackUserActionInput): Promise<void> {
  try {
    await energyApi.trackUserActions({
      events: [
        {
          event_name: eventName,
          surface,
          outcome,
          occurred_at: new Date().toISOString(),
          session_id: getTrackingSessionId(),
          user_role: role ?? null,
          theme: theme ?? null,
          granularity: granularity ?? null,
          context: context ?? null,
          payload: payload ?? null,
        },
      ],
    });
  } catch {
    // The dashboard should keep working even if action tracking is temporarily unavailable.
  }
}
