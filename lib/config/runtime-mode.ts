// Runtime mode resolver
// Used only in server-side code and API routes
// Never imported directly in client components

export type AppMode = 'demo' | 'live';

export interface ModeConfig {
  mode: AppMode;
  useMockSignals: boolean;
  useMockPortfolio: boolean;
  useMockExecution: boolean;
  requireLiveConnections: boolean;
}

export function getDemoModeConfig(): ModeConfig {
  return {
    mode: 'demo',
    useMockSignals: true,
    useMockPortfolio: true,
    useMockExecution: true,
    requireLiveConnections: false,
  };
}

export function getLiveModeConfig(): ModeConfig {
  return {
    mode: 'live',
    useMockSignals: false,
    useMockPortfolio: false,
    useMockExecution: false,
    requireLiveConnections: true,
  };
}
