// Future SoDEX API response types.

export interface SoDEXQuoteResponse {
  pair: string;
  side: 'buy' | 'sell';
  estimatedPrice: number;
  depthUsd: number;
  slippageEstimate: number;
}

export interface SoDEXOrderResponse {
  orderId: string;
  status: string;
  filledPrice?: number;
  filledAt?: string;
}
