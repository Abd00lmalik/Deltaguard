// Future SoSoValue API response types.
// These will be filled in when real API documentation is available.

export interface SoSoValueSignalResponse {
  signals: unknown[];
  generatedAt: string;
}

export interface SoSoValueMarketContext {
  regime: string;
  etfFlowSummary: unknown;
}
