// Mock ValueChain client - Wave 1 Demo Mode

export function getMockChainStatus(): string {
  return 'Mock ValueChain status: placeholder ready, no wallet connected, no RPC writes enabled.';
}

export function readMockContractState(contractAddress: string): string {
  return `Mock contract state for ${contractAddress}: no live chain call performed.`;
}
