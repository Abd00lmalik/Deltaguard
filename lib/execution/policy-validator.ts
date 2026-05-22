/**
 * DeltaGuard AI — Execution Policy Validator
 * Hard enforcement of risk limits that CANNOT be overridden by AI suggestions.
 * The AI recommends, the policy validates and sanitizes before execution.
 */

export interface HedgeOrderInput {
  pair: string;
  direction: 'long' | 'short';
  leverage: number;
  notionalUsd: number;
  slippageBps?: number;
}

export interface PolicyValidationResult {
  valid: boolean;
  sanitizedOrder: HedgeOrderInput;
  violations: string[];   // Policy rules that were violated and corrected
  blocked: boolean;       // If true, order must NOT proceed
  blockReason?: string;
}

// Hard policy limits — these cannot be changed from the UI (only reducible)
const HARD_LIMITS = {
  MAX_LEVERAGE:     3,        // Absolute maximum leverage — AI cannot exceed this
  MAX_SLIPPAGE_BPS: 150,      // 1.5% max slippage
  MIN_EXPIRY_SECS:  30,       // Order must be valid for at least 30s
  MIN_NOTIONAL:     10,       // $10 minimum order size
  MAX_NOTIONAL_PCT: 0.8,      // Cannot hedge more than 80% of portfolio value
} as const;

export function validateAndSanitizeOrder(
  order: HedgeOrderInput,
  portfolioValueUsd: number,
  userMaxLeverage?: number,   // From user settings — must be <= HARD_LIMITS.MAX_LEVERAGE
  userMaxHedgePct?: number,   // From user settings (0-100)
): PolicyValidationResult {
  const violations: string[] = [];
  const sanitized = { ...order };
  let blocked = false;
  let blockReason: string | undefined;

  // 1. Notional minimum check
  if (sanitized.notionalUsd < HARD_LIMITS.MIN_NOTIONAL) {
    blocked = true;
    blockReason = `Order notional ($${sanitized.notionalUsd.toFixed(2)}) is below minimum ($${HARD_LIMITS.MIN_NOTIONAL}). Order blocked.`;
    return { valid: false, sanitizedOrder: sanitized, violations, blocked, blockReason };
  }

  // 2. Max notional check (as % of portfolio)
  const effectiveMaxPct = userMaxHedgePct != null
    ? Math.min(userMaxHedgePct / 100, HARD_LIMITS.MAX_NOTIONAL_PCT)
    : HARD_LIMITS.MAX_NOTIONAL_PCT;

  const maxNotional = portfolioValueUsd * effectiveMaxPct;
  if (sanitized.notionalUsd > maxNotional && portfolioValueUsd > 0) {
    violations.push(
      `Notional $${sanitized.notionalUsd.toLocaleString()} exceeds ${(effectiveMaxPct * 100).toFixed(0)}% portfolio cap ` +
      `($${maxNotional.toLocaleString('en-US', { maximumFractionDigits: 0 })}). Clamped.`
    );
    sanitized.notionalUsd = Math.floor(maxNotional);
  }

  // 3. Leverage hard cap — Policy overrides LLM suggestion
  const effectiveMaxLev = userMaxLeverage != null
    ? Math.min(userMaxLeverage, HARD_LIMITS.MAX_LEVERAGE)
    : HARD_LIMITS.MAX_LEVERAGE;

  if (sanitized.leverage > effectiveMaxLev) {
    violations.push(
      `Leverage ${sanitized.leverage}x exceeds policy limit ${effectiveMaxLev}x. ` +
      `Forced down to ${effectiveMaxLev}x.`
    );
    sanitized.leverage = effectiveMaxLev;
  }

  if (sanitized.leverage < 1) {
    violations.push('Leverage below minimum of 1x. Set to 1x.');
    sanitized.leverage = 1;
  }

  // 4. Slippage cap
  const slipBps = sanitized.slippageBps ?? 50;
  if (slipBps > HARD_LIMITS.MAX_SLIPPAGE_BPS) {
    violations.push(
      `Slippage ${slipBps}bps exceeds max ${HARD_LIMITS.MAX_SLIPPAGE_BPS}bps. Capped.`
    );
    sanitized.slippageBps = HARD_LIMITS.MAX_SLIPPAGE_BPS;
  }

  // 5. Pair sanity check
  if (!sanitized.pair || sanitized.pair.trim().length === 0) {
    blocked = true;
    blockReason = 'Order pair is empty. Order blocked.';
    return { valid: false, sanitizedOrder: sanitized, violations, blocked, blockReason };
  }

  // 6. Direction sanity check
  if (sanitized.direction !== 'long' && sanitized.direction !== 'short') {
    blocked = true;
    blockReason = `Invalid direction "${sanitized.direction}". Must be "long" or "short". Order blocked.`;
    return { valid: false, sanitizedOrder: sanitized, violations, blocked, blockReason };
  }

  return {
    valid: true,
    sanitizedOrder: sanitized,
    violations,
    blocked: false,
  };
}
