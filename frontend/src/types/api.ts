export type Granularity = "15m" | "1h";
export type ThemeMode = "dark" | "light";
export type UserRole = "portfolioManager" | "dataAnalyst";
export type SeriesBreakdown = "none" | "technology" | "market_zone" | "plant_code";
export type ForecastScope = "plant" | "portfolio" | "technology" | "zone";
export type ForecastHorizon = "next_24h" | "day_ahead";
export type ForecastModelType =
  | "arima"
  | "prophet"
  | "random_forest"
  | "gradient_boosting";
export type ForecastSignalType = "production" | "price";
export type ForecastTargetKind = "price" | "volume" | "both";
export type TimeWindow = "1w" | "2w" | "1m" | "max";
export type UserActionOutcome = "changed" | "attempted" | "succeeded" | "failed";
export type UserActionTrackingStatus = "stored" | "skipped" | "failed";
export type ForecastAdvancedSettings = Record<string, string | number | boolean | null>;

export interface TechnologyOption {
  code: string;
  label: string;
}

export interface FilterPlantOption {
  code: string;
  name: string;
  technology: string;
  market_zone: string;
  capacity_mw: number;
}

export interface DateRange {
  min_timestamp: string | null;
  max_timestamp: string | null;
}

export interface FiltersResponse {
  technologies: TechnologyOption[];
  market_zones: string[];
  market_sessions: string[];
  granularities: Granularity[];
  plants: FilterPlantOption[];
  date_range: DateRange;
}

export interface DashboardSummaryResponse {
  total_energy_mwh: number;
  average_price_eur_mwh: number | null;
  active_plants: number;
  capture_price_eur_mwh: number | null;
  market_session: string;
  daily_avg_price_eur_mwh: number | null;
  weekly_avg_price_eur_mwh: number | null;
  daily_avg_production_gwh: number;
  active_plants_24h: number;
  inactive_plants_24h: number;
  renewables_share_pct_24h: number | null;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface NamedSeries {
  key: string;
  label: string;
  points: TimeSeriesPoint[];
}

export interface TimeSeriesResponse {
  granularity: Granularity;
  breakdown_by: SeriesBreakdown;
  series: NamedSeries[];
}

export interface ForecastRunReference {
  id: number;
  scope: string;
  target_code: string | null;
  model_name: string;
  fallback_used: boolean;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface ComparisonPoint {
  timestamp: string;
  actual_mwh: number | null;
  forecast_mwh: number | null;
}

export interface ActualVsForecastResponse {
  granularity: Granularity;
  actual_points: TimeSeriesPoint[];
  forecast_points: TimeSeriesPoint[];
  comparison_points: ComparisonPoint[];
  selected_run: ForecastRunReference | null;
}

export interface ForecastRunSummary {
  id: number;
  scope: string;
  target_code: string | null;
  granularity: Granularity;
  horizon: ForecastHorizon;
  signal_type: ForecastSignalType;
  model_name: string;
  fallback_used: boolean;
  status: string;
  started_at: string;
  completed_at: string | null;
  point_count: number;
}

export interface ForecastRunsResponse {
  items: ForecastRunSummary[];
}

export interface ForecastRunDetailResponse {
  id: number;
  scope: string;
  target_code: string | null;
  granularity: Granularity;
  horizon: ForecastHorizon;
  signal_type: ForecastSignalType;
  model_name: string;
  fallback_used: boolean;
  status: string;
  started_at: string;
  completed_at: string | null;
  metadata_json: Record<string, unknown> | null;
  values: TimeSeriesPoint[];
}

export interface ForecastPoint {
  timestamp: string;
  value: number;
}

export interface ForecastPredictRequest {
  scope: ForecastScope;
  target_code: string | null;
  granularity: Granularity;
  horizon: ForecastHorizon;
  history_points: number;
}

export interface ForecastPredictResponse {
  status: string;
  model_name: string;
  fallback_used: boolean;
  generated_at: string;
  processing_ms: number;
  points: ForecastPoint[];
  metadata_json?: Record<string, unknown> | null;
}

export interface ForecastExecutionRequest {
  model_type: ForecastModelType;
  target_kind: ForecastTargetKind;
  horizon: ForecastHorizon;
  granularity: Granularity;
  market_session?: string;
  advanced_settings?: ForecastAdvancedSettings | null;
}

export interface ForecastExecutionResponse {
  requested_targets: ForecastSignalType[];
  granularity: Granularity;
  horizon: ForecastHorizon;
  model_type: ForecastModelType;
  processing_ms: number | null;
  runs: ForecastRunDetailResponse[];
}

export interface DashboardFiltersState {
  technology: string[];
  marketZone: string[];
  plantCode: string;
  marketSession: string;
  dateFrom: string;
  dateTo: string;
  forecastRunId: string;
}

export interface ForecastFormState {
  modelType: ForecastModelType;
  targetKind: ForecastTargetKind;
  horizon: ForecastHorizon;
}

export interface UserActionEventCreate {
  event_name: string;
  surface: string;
  outcome?: UserActionOutcome;
  occurred_at?: string;
  session_id?: string | null;
  user_role?: string | null;
  theme?: ThemeMode | null;
  granularity?: Granularity | null;
  context?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}

export interface UserActionEventsRequest {
  events: UserActionEventCreate[];
}

export interface UserActionTrackingResponse {
  accepted_count: number;
  stored_count: number;
  tracking_enabled: boolean;
  status: UserActionTrackingStatus;
}
