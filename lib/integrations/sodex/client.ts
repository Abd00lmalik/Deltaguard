// DeltaGuard AI - SoDEX Execution Integration Client
// Wave 1: Simulates order submission. Wave 2: Replace with real SoDEX API calls.

import type { FilledHedgeOrder, HedgeOrder } from '@/types/execution';
import { submitMockHedgeOrder } from './mock-client';
import { Wallet, keccak256, toUtf8Bytes } from 'ethers';
import type { SoDEXOrderResponse } from './types';

const BASE_URL = process.env.SODEX_BASE_URL ?? '';
const API_KEY = process.env.SODEX_API_KEY ?? '';
const API_KEY_NAME = process.env.SODEX_API_KEY_NAME ?? 'api-key-01';
const ACCOUNT_ID = Number(process.env.SODEX_ACCOUNT_ID ?? '12345');
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function submitHedgeOrder(order: HedgeOrder): Promise<FilledHedgeOrder> {
  if (DEMO || !BASE_URL || !API_KEY) return submitMockHedgeOrder(order);

  // 1. Resolve domain configuration based on symbol and environment
  const chainId = BASE_URL.includes('testnet') ? 138565 : 286623;
  const isPerp = order.pair.toLowerCase().includes('perp') || order.pair.toLowerCase().includes('futures');
  const domainName = isPerp ? 'futures' : 'spot';

  // 2. Resolve symbol ID
  const symbolID = order.pair.toUpperCase().startsWith('ETH') ? 2 : 1;

  // 3. Build order item matching Go struct field order and DecimalString formatting
  const qty = (order.notionalUsd / order.estimatedPrice).toFixed(4);
  
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
  interface SoDEXParams {
    accountID: number;
    symbolID: number;
    orders: SoDEXOrderItem[];
  }

  const params: SoDEXParams = {
    accountID: ACCOUNT_ID,
    symbolID: symbolID,
    orders: [orderItem]
  };

  interface SoDEXPayload {
    type: string;
    params: SoDEXParams;
  }

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

  const wallet = new Wallet(API_KEY);
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
  const now = new Date().toISOString();

  return {
    ...order,
    status: (data.status as import('@/types/execution').OrderStatus) || 'filled',
    filledPrice: data.filledPrice ?? order.estimatedPrice,
    filledAt: data.filledAt ?? now,
    timeline: order.timeline.map((step) => ({
      ...step,
      status: 'complete',
      timestamp: step.timestamp ?? now
    }))
  };
}

