import type {
  ForecastAdvancedSettings,
  ForecastModelType,
  UserRole,
} from "../types/api";

export interface ForecastModelOption {
  value: ForecastModelType;
  label: string;
  helpText: string;
}

export interface ForecastHyperparameterDefinition {
  key: string;
  label: string;
  helpText: string;
  inputType: "number" | "boolean" | "select" | "nullable-number";
  defaultValue: string | number | boolean | null;
  step?: number;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
}

const arimaHyperparameters: ForecastHyperparameterDefinition[] = [
  {
    key: "order_p",
    label: "order_p",
    helpText: "Controls how much immediate autoregressive memory the model uses.",
    inputType: "number",
    defaultValue: 2,
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "order_d",
    label: "order_d",
    helpText: "Sets how many differences to apply to stabilize the series.",
    inputType: "number",
    defaultValue: 1,
    min: 0,
    max: 3,
    step: 1,
  },
  {
    key: "order_q",
    label: "order_q",
    helpText: "Defines how much memory is assigned to recent model errors.",
    inputType: "number",
    defaultValue: 2,
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "trend",
    label: "trend",
    helpText: "Chooses whether the model should enforce a level or a deterministic trend.",
    inputType: "select",
    defaultValue: "n",
    options: [
      { label: "n", value: "n" },
      { label: "c", value: "c" },
      { label: "t", value: "t" },
      { label: "ct", value: "ct" },
    ],
  },
  {
    key: "enforce_stationarity",
    label: "enforce_stationarity",
    helpText: "When enabled, it blocks solutions that would make the dynamics unstable.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "enforce_invertibility",
    label: "enforce_invertibility",
    helpText: "When enabled, it avoids MA-filter combinations that are harder to interpret.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "maxiter",
    label: "maxiter",
    helpText: "Maximum number of iterations used to estimate the model.",
    inputType: "number",
    defaultValue: 50,
    min: 10,
    max: 300,
    step: 1,
  },
];

const prophetHyperparameters: ForecastHyperparameterDefinition[] = [
  {
    key: "changepoint_prior_scale",
    label: "changepoint_prior_scale",
    helpText: "Controls how easily Prophet accepts trend changes.",
    inputType: "number",
    defaultValue: 0.05,
    min: 0.001,
    max: 1,
    step: 0.01,
  },
  {
    key: "seasonality_prior_scale",
    label: "seasonality_prior_scale",
    helpText: "Controls how much weight to assign to recurring seasonal patterns.",
    inputType: "number",
    defaultValue: 10,
    min: 0.1,
    max: 30,
    step: 0.1,
  },
  {
    key: "holidays_prior_scale",
    label: "holidays_prior_scale",
    helpText: "Weights special effects that behave like events or calendar anomalies.",
    inputType: "number",
    defaultValue: 10,
    min: 0.1,
    max: 30,
    step: 0.1,
  },
  {
    key: "seasonality_mode",
    label: "seasonality_mode",
    helpText: "Defines whether seasonality is additive or grows with the level.",
    inputType: "select",
    defaultValue: "additive",
    options: [
      { label: "additive", value: "additive" },
      { label: "multiplicative", value: "multiplicative" },
    ],
  },
  {
    key: "n_changepoints",
    label: "n_changepoints",
    helpText: "Maximum number of points where Prophet can bend the trend.",
    inputType: "number",
    defaultValue: 25,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "interval_width",
    label: "interval_width",
    helpText: "Width of the confidence interval produced by the model.",
    inputType: "number",
    defaultValue: 0.8,
    min: 0.05,
    max: 0.99,
    step: 0.01,
  },
  {
    key: "weekly_seasonality",
    label: "weekly_seasonality",
    helpText: "When enabled, Prophet looks for day-of-week patterns.",
    inputType: "boolean",
    defaultValue: true,
  },
];

const randomForestHyperparameters: ForecastHyperparameterDefinition[] = [
  {
    key: "n_estimators",
    label: "n_estimators",
    helpText: "Number of trees used in parallel to make the forecast more stable.",
    inputType: "number",
    defaultValue: 100,
    min: 10,
    max: 500,
    step: 10,
  },
  {
    key: "max_depth",
    label: "max_depth",
    helpText: "Limits the maximum depth of each tree. Empty means no hard limit.",
    inputType: "nullable-number",
    defaultValue: null,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_split",
    label: "min_samples_split",
    helpText: "Minimum number of samples required to split a node.",
    inputType: "number",
    defaultValue: 2,
    min: 2,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_leaf",
    label: "min_samples_leaf",
    helpText: "Minimum number of samples that must remain in each terminal leaf.",
    inputType: "number",
    defaultValue: 1,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "max_features",
    label: "max_features",
    helpText: "Share of features considered at each tree split.",
    inputType: "number",
    defaultValue: 1,
    min: 0.1,
    max: 1,
    step: 0.1,
  },
  {
    key: "bootstrap",
    label: "bootstrap",
    helpText: "When enabled, each tree sees a random sample of the training set.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "random_state",
    label: "random_state",
    helpText: "Locks the random seed to make the demo more repeatable.",
    inputType: "nullable-number",
    defaultValue: 42,
    min: 0,
    max: 9999,
    step: 1,
  },
];

const gradientBoostingHyperparameters: ForecastHyperparameterDefinition[] = [
  {
    key: "n_estimators",
    label: "n_estimators",
    helpText: "Number of sequential stages that progressively correct errors.",
    inputType: "number",
    defaultValue: 100,
    min: 10,
    max: 500,
    step: 10,
  },
  {
    key: "learning_rate",
    label: "learning_rate",
    helpText: "How strongly each new stage affects the final prediction.",
    inputType: "number",
    defaultValue: 0.1,
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  {
    key: "max_depth",
    label: "max_depth",
    helpText: "Maximum depth of the base trees used by boosting.",
    inputType: "number",
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: "min_samples_split",
    label: "min_samples_split",
    helpText: "Minimum number of samples required to create a new split.",
    inputType: "number",
    defaultValue: 2,
    min: 2,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_leaf",
    label: "min_samples_leaf",
    helpText: "Minimum number of samples required in a terminal leaf.",
    inputType: "number",
    defaultValue: 1,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "subsample",
    label: "subsample",
    helpText: "Share of the dataset used at each boosting stage.",
    inputType: "number",
    defaultValue: 1,
    min: 0.1,
    max: 1,
    step: 0.1,
  },
  {
    key: "random_state",
    label: "random_state",
    helpText: "Locks the random seed to keep runs comparable.",
    inputType: "nullable-number",
    defaultValue: 42,
    min: 0,
    max: 9999,
    step: 1,
  },
];

export const forecastModelOptionsByRole: Record<UserRole, ForecastModelOption[]> = {
  portfolioManager: [
    {
      value: "arima",
      label: "Statistical (ARIMA)",
      helpText: "ARIMA is fast and readable. It works well on linear and regular patterns.",
    },
    {
      value: "prophet",
      label: "Advanced (Prophet)",
      helpText: "Prophet handles complex trend and seasonality more effectively.",
    },
  ],
  dataAnalyst: [
    {
      value: "arima",
      label: "ARIMA",
      helpText: "Classic statistical baseline for time series.",
    },
    {
      value: "prophet",
      label: "Prophet",
      helpText: "Additive model that is robust to trend and seasonality.",
    },
    {
      value: "random_forest",
      label: "RandomForest",
      helpText: "Tree ensemble with rolling and calendar-based features.",
    },
    {
      value: "gradient_boosting",
      label: "GradientBoosting",
      helpText: "Sequential boosting over rolling and calendar-based features.",
    },
  ],
};

export const hyperparametersByModel: Record<
  ForecastModelType,
  ForecastHyperparameterDefinition[]
> = {
  arima: arimaHyperparameters,
  prophet: prophetHyperparameters,
  random_forest: randomForestHyperparameters,
  gradient_boosting: gradientBoostingHyperparameters,
};

export function buildDefaultAdvancedSettings(
  modelType: ForecastModelType,
): ForecastAdvancedSettings {
  return Object.fromEntries(
    hyperparametersByModel[modelType].map((definition) => [
      definition.key,
      definition.defaultValue,
    ]),
  );
}

export function buildAllDefaultAdvancedSettings(): Record<
  ForecastModelType,
  ForecastAdvancedSettings
> {
  return {
    arima: buildDefaultAdvancedSettings("arima"),
    prophet: buildDefaultAdvancedSettings("prophet"),
    random_forest: buildDefaultAdvancedSettings("random_forest"),
    gradient_boosting: buildDefaultAdvancedSettings("gradient_boosting"),
  };
}
