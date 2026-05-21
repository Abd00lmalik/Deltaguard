// lib/types/signal-source.ts

export type SignalSource =
  | "live"          // Real SoSoValue API response received this request cycle
  | "derived"       // Computed from real SoSoValue data (e.g. normalized from market prices)
  | "partial"       // Some SoSoValue endpoints succeeded, others failed
  | "cached"        // Using a stored response from a previous successful call
  | "fallback"      // No real data available; using baseline constants or formula defaults
  | "unavailable";  // No data at all; signal should not be displayed as a value

export type ProviderHealth =
  | "connected"      // Real API call succeeded this cycle
  | "degraded"       // Some calls succeeded, some failed
  | "unavailable"    // All calls failed
  | "setup_required" // Env vars missing or no source configured
  | "checking";      // Health check in progress

export type SignalMetadata = {
  source: SignalSource;
  providerHealth: ProviderHealth;
  dataSourcesUsed: string[];        // e.g. ["SoSoValue /market/snapshot", "SoDEX /ticker"]
  lastUpdated: string;              // ISO timestamp of when this data was fetched
  errors: ProviderError[];
  cacheAgeSeconds?: number;         // if source is "cached"
};

export type ProviderError = {
  provider: string;
  endpoint: string;
  httpStatus: number | null;
  message: string;
};
