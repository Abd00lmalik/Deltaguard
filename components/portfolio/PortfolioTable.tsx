'use client';

import { useMemo, useState } from 'react';
import { MOCK_PORTFOLIO_ASSETS } from '@/lib/mock/portfolio';
import type { PortfolioAsset } from '@/types/portfolio';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

type SortKey = keyof Pick<
  PortfolioAsset,
  'symbol' | 'class' | 'amount' | 'priceUsd' | 'valueUsd' | 'delta' | 'volatility30d' | 'riskContribution' | 'allocation'
>;

const columns: { key: SortKey; label: string }[] = [
  { key: 'symbol', label: 'Asset' },
  { key: 'class', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'priceUsd', label: 'Price' },
  { key: 'valueUsd', label: 'Value' },
  { key: 'delta', label: 'Delta' },
  { key: 'volatility30d', label: 'Vol 30D' },
  { key: 'riskContribution', label: 'Risk Contrib' },
  { key: 'allocation', label: 'Allocation' }
];

function deltaClass(delta: number) {
  if (delta < 0.3) return 'text-accent-lime';
  if (delta <= 0.7) return 'text-warning';
  return 'text-danger';
}

export function PortfolioTable() {
  const [sortKey, setSortKey] = useState<SortKey>('valueUsd');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const assets = useMemo(() => {
    return [...MOCK_PORTFOLIO_ASSETS].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const result = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
      return direction === 'asc' ? result : -result;
    });
  }, [direction, sortKey]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection('desc');
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-4 text-left">
                  <button
                    onClick={() => handleSort(column.key)}
                    className="font-manrope text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted hover:text-text-secondary"
                  >
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const stable = asset.class === 'stablecoin';
              return (
                <tr key={asset.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div className={cn(stable && 'opacity-65')}>
                      <p className="font-sora text-sm font-bold text-white">{asset.symbol}</p>
                      <p className="mt-1 font-manrope text-xs text-text-muted">{asset.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs uppercase text-text-secondary">{asset.class}</td>
                  <td className="px-4 py-4 font-mono text-sm text-text-secondary">{formatNumber(asset.amount, asset.amount < 1 ? 2 : 1)}</td>
                  <td className="px-4 py-4 font-mono text-sm text-text-secondary">{formatCurrency(asset.priceUsd, asset.priceUsd < 10 ? 2 : 0)}</td>
                  <td className="px-4 py-4 font-mono text-sm font-semibold text-white">{formatCurrency(asset.valueUsd)}</td>
                  <td className={cn('px-4 py-4 font-mono text-sm font-bold', deltaClass(asset.delta))}>{asset.delta.toFixed(2)}</td>
                  <td className={cn('px-4 py-4 font-mono text-sm', asset.volatility30d > 80 ? 'text-danger' : 'text-text-secondary')}>
                    {formatPercent(asset.volatility30d)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-danger" style={{ width: `${asset.riskContribution}%` }} />
                      </div>
                      <span className="font-mono text-xs text-text-secondary">{formatPercent(asset.riskContribution)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-text-secondary">{formatPercent(asset.allocation)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PortfolioTable;
