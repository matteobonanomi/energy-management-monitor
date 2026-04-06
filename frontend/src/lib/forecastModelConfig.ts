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
    helpText: "Conta quanta memoria immediata usa il modello autoregressivo.",
    inputType: "number",
    defaultValue: 2,
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "order_d",
    label: "order_d",
    helpText: "Indica quante differenze applicare per rendere piu' stabile la serie.",
    inputType: "number",
    defaultValue: 1,
    min: 0,
    max: 3,
    step: 1,
  },
  {
    key: "order_q",
    label: "order_q",
    helpText: "Definisce quanta memoria assegnare agli errori recenti del modello.",
    inputType: "number",
    defaultValue: 2,
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "trend",
    label: "trend",
    helpText: "Sceglie se il modello deve forzare un livello o una tendenza deterministica.",
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
    helpText: "Se attivo, impedisce soluzioni che rendono la dinamica instabile.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "enforce_invertibility",
    label: "enforce_invertibility",
    helpText: "Se attivo, evita combinazioni che rendono il filtro MA poco interpretabile.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "maxiter",
    label: "maxiter",
    helpText: "Numero massimo di iterazioni usate per stimare il modello.",
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
    helpText: "Regola quanto facilmente Prophet accetta cambi di trend.",
    inputType: "number",
    defaultValue: 0.05,
    min: 0.001,
    max: 1,
    step: 0.01,
  },
  {
    key: "seasonality_prior_scale",
    label: "seasonality_prior_scale",
    helpText: "Controlla quanta importanza assegnare alle stagionalita' ricorrenti.",
    inputType: "number",
    defaultValue: 10,
    min: 0.1,
    max: 30,
    step: 0.1,
  },
  {
    key: "holidays_prior_scale",
    label: "holidays_prior_scale",
    helpText: "Pesa eventuali effetti speciali assimilati a eventi o anomalie di calendario.",
    inputType: "number",
    defaultValue: 10,
    min: 0.1,
    max: 30,
    step: 0.1,
  },
  {
    key: "seasonality_mode",
    label: "seasonality_mode",
    helpText: "Decide se la stagionalita' si somma al livello o cresce con esso.",
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
    helpText: "Numero massimo di punti in cui Prophet puo' piegare il trend.",
    inputType: "number",
    defaultValue: 25,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "interval_width",
    label: "interval_width",
    helpText: "Ampiezza dell'intervallo di confidenza calcolato dal modello.",
    inputType: "number",
    defaultValue: 0.8,
    min: 0.05,
    max: 0.99,
    step: 0.01,
  },
  {
    key: "weekly_seasonality",
    label: "weekly_seasonality",
    helpText: "Se attivo, Prophet cerca pattern specifici tra i diversi giorni della settimana.",
    inputType: "boolean",
    defaultValue: true,
  },
];

const randomForestHyperparameters: ForecastHyperparameterDefinition[] = [
  {
    key: "n_estimators",
    label: "n_estimators",
    helpText: "Numero di alberi usati in parallelo per rendere la previsione piu' stabile.",
    inputType: "number",
    defaultValue: 100,
    min: 10,
    max: 500,
    step: 10,
  },
  {
    key: "max_depth",
    label: "max_depth",
    helpText: "Limita la profondita' massima di ogni albero. Vuoto significa nessun limite.",
    inputType: "nullable-number",
    defaultValue: null,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_split",
    label: "min_samples_split",
    helpText: "Numero minimo di esempi necessari per dividere un nodo.",
    inputType: "number",
    defaultValue: 2,
    min: 2,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_leaf",
    label: "min_samples_leaf",
    helpText: "Numero minimo di esempi che devono restare in ogni foglia finale.",
    inputType: "number",
    defaultValue: 1,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "max_features",
    label: "max_features",
    helpText: "Quota di feature considerate in ogni split dell'albero.",
    inputType: "number",
    defaultValue: 1,
    min: 0.1,
    max: 1,
    step: 0.1,
  },
  {
    key: "bootstrap",
    label: "bootstrap",
    helpText: "Se attivo, ogni albero vede un campione casuale del training set.",
    inputType: "boolean",
    defaultValue: true,
  },
  {
    key: "random_state",
    label: "random_state",
    helpText: "Fissa il seme casuale per rendere la demo piu' ripetibile.",
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
    helpText: "Numero di stadi sequenziali che correggono progressivamente gli errori.",
    inputType: "number",
    defaultValue: 100,
    min: 10,
    max: 500,
    step: 10,
  },
  {
    key: "learning_rate",
    label: "learning_rate",
    helpText: "Quanto forte incide ogni nuovo stadio sulla previsione finale.",
    inputType: "number",
    defaultValue: 0.1,
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  {
    key: "max_depth",
    label: "max_depth",
    helpText: "Profondita' massima degli alberi base usati dal boosting.",
    inputType: "number",
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: "min_samples_split",
    label: "min_samples_split",
    helpText: "Numero minimo di esempi necessari per creare una nuova divisione.",
    inputType: "number",
    defaultValue: 2,
    min: 2,
    max: 50,
    step: 1,
  },
  {
    key: "min_samples_leaf",
    label: "min_samples_leaf",
    helpText: "Numero minimo di esempi richiesti in una foglia finale.",
    inputType: "number",
    defaultValue: 1,
    min: 1,
    max: 50,
    step: 1,
  },
  {
    key: "subsample",
    label: "subsample",
    helpText: "Quota del dataset usata a ogni stadio del boosting.",
    inputType: "number",
    defaultValue: 1,
    min: 0.1,
    max: 1,
    step: 0.1,
  },
  {
    key: "random_state",
    label: "random_state",
    helpText: "Fissa il seme casuale per rendere le esecuzioni confrontabili.",
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
      label: "statistico (ARIMA)",
      helpText: "ARIMA e' rapido e leggibile. Funziona bene su pattern lineari e regolari.",
    },
    {
      value: "prophet",
      label: "avanzato (Prophet)",
      helpText: "Prophet gestisce meglio trend e stagionalita' complesse.",
    },
  ],
  dataAnalyst: [
    {
      value: "arima",
      label: "ARIMA",
      helpText: "Baseline statistica classica per serie temporali.",
    },
    {
      value: "prophet",
      label: "Prophet",
      helpText: "Modello additivo robusto a trend e stagionalita'.",
    },
    {
      value: "random_forest",
      label: "RandomForest",
      helpText: "Ensemble ad alberi con feature di rolling e calendario.",
    },
    {
      value: "gradient_boosting",
      label: "GradientBoosting",
      helpText: "Boosting sequenziale su feature di rolling e calendario.",
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
