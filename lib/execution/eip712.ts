/**
 * DeltaGuard AI — EIP-712 Typed Order Signing
 * Defines the HedgeOrder typed data structure for MetaMask/Rabby signing.
 * Verification uses viem's verifyTypedData — fully deterministic, no LLM involved.
 * 
 * Domain separation: testnet uses chainId 11155111, mainnet uses 1.
 */

import { verifyTypedData, type Hex } from 'viem';
import { sepolia, mainnet } from 'viem/chains';

// ─── Domain ──────────────────────────────────────────────────────────────────

// Zero address used as placeholder — no on-chain contract custody of funds
const VERIFYING_CONTRACT = '0x0000000000000000000000000000000000000001' as const;
const APP_NAME = 'DeltaGuard AI';
const APP_VERSION = '1';

export function buildEIP712Domain(isTestnet: boolean) {
  return {
    name: APP_NAME,
    version: APP_VERSION,
    chainId: isTestnet ? sepolia.id : mainnet.id,
    verifyingContract: VERIFYING_CONTRACT,
  } as const;
}

// ─── HedgeOrder Typed Data ────────────────────────────────────────────────────

export const HEDGE_ORDER_TYPES = {
  HedgeOrder: [
    { name: 'pair',           type: 'string' },
    { name: 'direction',      type: 'string' },
    { name: 'leverage',       type: 'uint256' },
    { name: 'notionalUsd',    type: 'uint256' },
    { name: 'maxSlippageBps', type: 'uint256' },   // e.g. 50 = 0.5%
    { name: 'expiry',         type: 'uint256' },   // Unix timestamp
    { name: 'nonce',          type: 'uint256' },   // Unique per order
  ],
} as const;

export interface HedgeOrderMessage {
  pair: string;
  direction: string;
  leverage: bigint;
  notionalUsd: bigint;
  maxSlippageBps: bigint;
  expiry: bigint;
  nonce: bigint;
}

export interface HedgeOrderTypedData {
  domain: ReturnType<typeof buildEIP712Domain>;
  types: typeof HEDGE_ORDER_TYPES;
  primaryType: 'HedgeOrder';
  message: HedgeOrderMessage;
}

export function buildOrderTypedData(
  order: {
    pair: string;
    direction: 'long' | 'short';
    leverage: number;
    notionalUsd: number;
    slippageBps?: number;
  },
  isTestnet: boolean
): HedgeOrderTypedData {
  const expiryTs = BigInt(Math.floor(Date.now() / 1000) + 300); // 5-minute expiry
  const nonce = BigInt(Date.now()); // unique per signing request

  return {
    domain: buildEIP712Domain(isTestnet),
    types: HEDGE_ORDER_TYPES,
    primaryType: 'HedgeOrder',
    message: {
      pair:           order.pair,
      direction:      order.direction,
      leverage:       BigInt(Math.round(order.leverage)),
      notionalUsd:    BigInt(Math.round(order.notionalUsd)),
      maxSlippageBps: BigInt(order.slippageBps ?? 50),
      expiry:         expiryTs,
      nonce,
    },
  };
}

// ─── Server-Side Verification ─────────────────────────────────────────────────

export interface SignatureVerificationResult {
  valid: boolean;
  recoveredAddress: string | null;
  error?: string;
}

export async function verifyOrderSignature(
  typedData: HedgeOrderTypedData,
  signature: Hex,
  expectedSigner: string
): Promise<SignatureVerificationResult> {
  try {
    const isValid = await verifyTypedData({
      address: expectedSigner as `0x${string}`,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature,
    });

    return {
      valid: isValid,
      recoveredAddress: isValid ? expectedSigner : null,
    };
  } catch (err) {
    return {
      valid: false,
      recoveredAddress: null,
      error: err instanceof Error ? err.message : 'Unknown signature verification error',
    };
  }
}
