// DeltaGuard AI - SoDEX Execution Server Client (Live mode only)

import { Wallet, keccak256, toUtf8Bytes } from 'ethers';
import type { SoDEXOrderResponse } from './types';

const BASE_URL = process.env.SODEX_BASE_URL ?? '';
const API_KEY_NAME = process.env.SODEX_API_KEY ?? 'api-key-01';
const PRIVATE_KEY = process.env.SODEX_API_PRIVATE_KEY ?? '';

/**
 * Resolves the correct perps API base path.
 * If SODEX_BASE_URL is the gateway root (e.g. https://testnet-gw.sodex.dev),
 * the perps REST API lives at /api/v1/perps under it.
 * If the URL already contains /api/v1/perps or similar, it is used as-is.
 */
function resolvePerpsBase(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  try {
    const parsed = new URL(trimmed);
    // If pathname is just root or doesn't contain the API path, append it
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return `${trimmed}/api/v1/perps`;
    }
    // Already has a path (e.g. /api/v1/perpetuals or /v1/perpetuals) — use as-is
    return trimmed;
  } catch {
    return trimmed;
  }
}

const PERPS_BASE = resolvePerpsBase(BASE_URL);

interface SoDEXOrderItem {
  clOrdID: string;
  modifier: number;
  side: number;
  type: number;
  timeInForce: number;
  quantity: string;
  reduceOnly: boolean;
  positionSide: number;
}

interface SoDEXParams {
  accountID: number;
  symbolID: number;
  orders: SoDEXOrderItem[];
}

interface SoDEXPayload {
  type: string;
  params: SoDEXParams;
}

export async function placeOrder(
  order: {
    id: string;
    pair: string;
    direction: 'long' | 'short';
    notionalUsd: number;
    estimatedPrice: number;
  },
  accountId: number,
  customCredentials?: { apiKey?: string; apiPrivateKey?: string }
): Promise<{ orderId: string; status: string; filledPrice?: number; filledAt?: string }> {
  const activePrivateKey = customCredentials?.apiPrivateKey || PRIVATE_KEY;
  const activeApiKey = customCredentials?.apiKey || API_KEY_NAME;

  if (!BASE_URL || !activePrivateKey) {
    throw new Error('SoDEX credentials not configured for signing.');
  }

  // 1. Resolve domain configuration based on symbol and environment
  const chainId = BASE_URL.includes('testnet') ? 138565 : 286623;
  const isPerp = order.pair.toLowerCase().includes('perp') || order.pair.toLowerCase().includes('futures');
  const domainName = isPerp ? 'futures' : 'spot';

  // 2. Resolve symbol ID
  const symbolID = order.pair.toUpperCase().startsWith('ETH') ? 2 : 1;

  // 3. Build order item matching Go struct field order and DecimalString formatting
  const qty = (order.notionalUsd / order.estimatedPrice).toFixed(4);

  const orderItem: SoDEXOrderItem = {
    clOrdID: order.id,
    modifier: 1,
    side: order.direction === 'short' ? 2 : 1,
    type: 2, // Market order
    timeInForce: 3,
    quantity: qty,
    reduceOnly: false,
    positionSide: 1
  };

  // 4. Build params and signing payload with exact field ordering
  const params: SoDEXParams = {
    accountID: accountId,
    symbolID: symbolID,
    orders: [orderItem]
  };

  const payload: SoDEXPayload = {
    type: 'newOrder',
    params: params
  };

  // 5. Generate signature nonce and calculate payload hash
  const nonce = Date.now();
  const compactJson = JSON.stringify(payload);
  const payloadHash = keccak256(toUtf8Bytes(compactJson));

  // 6. Sign typed structured data
  const domain = {
    name: domainName,
    version: '1',
    chainId: chainId,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  };

  const types = {
    ExchangeAction: [
      { name: 'payloadHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint64' }
    ]
  };

  const message = {
    payloadHash,
    nonce: BigInt(nonce)
  };

  const wallet = new Wallet(activePrivateKey);
  const rawSignature = await wallet.signTypedData(domain, types, message);
  const typedSignature = '0x01' + rawSignature.substring(2);

  // 7. Post the request to SoDEX
  const endpoint = PERPS_BASE.endsWith('/') ? `${PERPS_BASE}trade/orders` : `${PERPS_BASE}/trade/orders`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': activeApiKey,
      'X-API-Sign': typedSignature,
      'X-API-Nonce': nonce.toString()
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    throw new Error(`SoDEX API error: ${res.status} - ${await res.text()}`);
  }

  const data = (await res.json()) as SoDEXOrderResponse;

  return {
    orderId: data.orderId || `live-${Date.now()}`,
    status: data.status || 'filled',
    filledPrice: data.filledPrice,
    filledAt: data.filledAt
  };
}

interface SodexOrderRaw {
  status?: string;
  orderStatus?: string;
  filledQty?: number;
  executedQty?: number;
  remainingQty?: number;
  leavesQty?: number;
  avgFillPrice?: number;
  avgPrice?: number;
  updatedAt?: string;
  timestamp?: string | number;
}

export async function getOrderStatus(orderId: string): Promise<{
  orderId: string;
  status: 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired' | 'unknown';
  filledQty?: number;
  remainingQty?: number;
  avgFillPrice?: number;
  updatedAt?: string;
} | null> {
  const baseUrl = process.env.SODEX_BASE_URL;
  if (!baseUrl) {
    console.error('[SoDEX] SODEX_BASE_URL not configured. Cannot poll order status.');
    return null;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/trade/order?id=${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: buildSodexHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      console.warn(`[SoDEX] Order ${orderId} not found.`);
      return { orderId, status: 'unknown' };
    }
    if (!res.ok) {
      console.error(`[SoDEX] Order status fetch failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as SodexOrderRaw;
    return {
      orderId,
      status: normalizeSodexStatus(data.status ?? data.orderStatus ?? 'unknown'),
      filledQty: data.filledQty ?? data.executedQty,
      remainingQty: data.remainingQty ?? data.leavesQty,
      avgFillPrice: data.avgFillPrice ?? data.avgPrice,
      updatedAt: data.updatedAt ?? (data.timestamp !== undefined ? String(data.timestamp) : undefined),
    };
  } catch (err) {
    console.error('[SoDEX] getOrderStatus error:', (err as Error).message);
    return null;
  }
}

function normalizeSodexStatus(raw: string): 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired' | 'unknown' {
  const map: Record<string, 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired'> = {
    open: 'open',
    new: 'open',
    active: 'open',
    filled: 'filled',
    fully_filled: 'filled',
    partially_filled: 'partially_filled',
    partial: 'partially_filled',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    rejected: 'rejected',
    expired: 'expired',
  };
  return map[raw.toLowerCase()] ?? 'unknown';
}

export async function cancelOrder(orderId: string): Promise<{
  orderId: string;
  status: 'cancelled' | 'failed';
  message?: string;
} | null> {
  const baseUrl = process.env.SODEX_BASE_URL;
  const accountId = process.env.SODEX_ACCOUNT_ID;

  if (!baseUrl) {
    console.error('[SoDEX] SODEX_BASE_URL not configured. Cannot cancel order.');
    return null;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/trade/cancel`, {
      method: 'POST',
      headers: {
        ...buildSodexHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, accountId }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[SoDEX] Cancel failed (${res.status}): ${errBody}`);
      return { orderId, status: 'failed', message: `HTTP ${res.status}` };
    }

    return { orderId, status: 'cancelled' };
  } catch (err) {
    console.error('[SoDEX] cancelOrder error:', (err as Error).message);
    return { orderId, status: 'failed', message: (err as Error).message };
  }
}

function buildSodexHeaders(): Record<string, string> {
  const apiKey = process.env.SODEX_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

export async function getSodexAccountState(
  address: string,
  customCredentials?: { apiKey?: string }
): Promise<{
  address: string;
  accountId: number;
  balanceUsd: number;
  marginRatio: number;
  leverage: number;
  positionsCount: number;
  collateralUsd: number;
}> {
  if (!BASE_URL) {
    throw new Error('SoDEX API base URL not configured.');
  }

  const activeApiKey = customCredentials?.apiKey || API_KEY_NAME;

  const endpoint = PERPS_BASE.endsWith('/')
    ? `${PERPS_BASE}trade/account?address=${encodeURIComponent(address)}`
    : `${PERPS_BASE}/trade/account?address=${encodeURIComponent(address)}`;
    
  const res = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': activeApiKey
    }
  });
  
  if (!res.ok) {
    throw new Error(`SoDEX account lookup failed: HTTP ${res.status} - ${await res.text()}`);
  }
  
  const data = await res.json();
  const accountIdVal = data.accountId || data.accountID;
  if (!accountIdVal) {
    throw new Error(`No active SoDEX margin account linked to address: ${address}`);
  }

  return {
    address: address,
    accountId: Number(accountIdVal),
    balanceUsd: Number(data.balanceUsd || data.balance || 0),
    marginRatio: Number(data.marginRatio || 0),
    leverage: Number(data.leverage || 0),
    positionsCount: Number(data.positionsCount || 0),
    collateralUsd: Number(data.collateralUsd || 0)
  };
}
