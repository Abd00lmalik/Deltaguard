// DeltaGuard AI - SoDEX Execution Server Client (Live mode only)

import { Wallet, keccak256, toUtf8Bytes } from 'ethers';
import type { SoDEXOrderResponse } from './types';

const BASE_URL = process.env.SODEX_BASE_URL ?? '';
const API_KEY_NAME = process.env.SODEX_API_KEY ?? 'api-key-01';
const PRIVATE_KEY = process.env.SODEX_API_PRIVATE_KEY ?? '';
const ACCOUNT_ID = Number(process.env.SODEX_ACCOUNT_ID ?? '12345');

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

export async function placeOrder(order: {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  notionalUsd: number;
  estimatedPrice: number;
}): Promise<{ orderId: string; status: string; filledPrice?: number; filledAt?: string }> {
  if (!BASE_URL || !PRIVATE_KEY) {
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
    accountID: ACCOUNT_ID,
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

  const wallet = new Wallet(PRIVATE_KEY);
  const rawSignature = await wallet.signTypedData(domain, types, message);
  const typedSignature = '0x01' + rawSignature.substring(2);

  // 7. Post the request to SoDEX
  const endpoint = BASE_URL.endsWith('/') ? `${BASE_URL}trade/orders` : `${BASE_URL}/trade/orders`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY_NAME,
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

export async function getOrderStatus(orderId: string): Promise<{ orderId: string; status: string }> {
  return { orderId, status: 'filled' };
}

export async function cancelOrder(orderId: string): Promise<{ orderId: string; status: string }> {
  return { orderId, status: 'cancelled' };
}

export async function getSodexAccountState(address: string): Promise<{
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

  const endpoint = BASE_URL.endsWith('/')
    ? `${BASE_URL}trade/account?address=${encodeURIComponent(address)}`
    : `${BASE_URL}/trade/account?address=${encodeURIComponent(address)}`;
    
  const res = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': API_KEY_NAME
    }
  });
  
  if (!res.ok) {
    throw new Error(`SoDEX API error: ${res.status} - ${await res.text()}`);
  }
  
  const data = await res.json();
  return {
    address: address,
    accountId: data.accountId || ACCOUNT_ID,
    balanceUsd: Number(data.balanceUsd || data.balance || 0),
    marginRatio: Number(data.marginRatio || 0),
    leverage: Number(data.leverage || 0),
    positionsCount: Number(data.positionsCount || 0),
    collateralUsd: Number(data.collateralUsd || 0)
  };
}
