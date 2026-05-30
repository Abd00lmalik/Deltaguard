// Checks whether required live credentials exist at runtime
// Server-side only — never import in client components
// Does NOT check values — only checks that keys are non-empty strings

export interface ReadinessReport {
  sosovalue: boolean;
  ssi: boolean;
  sodexPublic: boolean;
  sodexSigned: boolean;
  database: boolean;
  llmEnabled: boolean;
  allRequiredForPublicReads: boolean;
  allRequiredForSignedExecution: boolean;
}

export function checkLiveReadiness(): ReadinessReport {
  const sosovalue =
    !!process.env.SOSOVALUE_API_KEY &&
    !!process.env.SOSOVALUE_BASE_URL;

  const ssi = !!process.env.SSI_API_BASE_URL;

  const sodexPublic =
    !!process.env.SODEX_BASE_URL &&
    !!process.env.SODEX_SPOT_BASE_URL;

  const sodexSigned =
    sodexPublic &&
    !!process.env.SODEX_API_KEY &&
    !!process.env.SODEX_API_PRIVATE_KEY;

  const database = !!process.env.DATABASE_URL;

  const llmEnabled = !!process.env.GEMINI_API_KEY;

  return {
    sosovalue,
    ssi,
    sodexPublic,
    sodexSigned,
    database,
    llmEnabled,
    allRequiredForPublicReads: sosovalue && sodexPublic,
    allRequiredForSignedExecution: sosovalue && sodexSigned,
  };
}
