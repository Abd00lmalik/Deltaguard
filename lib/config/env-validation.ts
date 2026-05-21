// Called at the top of server-side API routes to validate environment
// Logs warnings, never throws for optional vars
// Used in both demo and live routes

export function warnIfMissingLiveVars(): void {
  const required = [
    'SOSOVALUE_API_KEY',
    'SOSOVALUE_BASE_URL',
    'SODEX_BASE_URL',
    'SODEX_SPOT_BASE_URL',
  ];
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`[DeltaGuard] Missing env var: ${key}. Live mode will degrade.`);
    }
  }
}
