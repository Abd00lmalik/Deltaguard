// Future ValueChain RPC types.

export interface ValueChainStatus {
  chainId: number;
  latestBlock: number;
  rpcHealthy: boolean;
}

export interface ValueChainPositionState {
  owner: string;
  hedgeNotionalUsd: number;
  updatedAtBlock: number;
}
