'use client';

import type { StressScenario } from '@/lib/mock/scenarios';
import { cn } from '@/lib/utils/cn';

interface ScenarioSelectorProps {
  scenarios: StressScenario[];
  selectedId: string;
  onSelect: (scenario: StressScenario) => void;
}

export function ScenarioSelector({ scenarios, selectedId, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {scenarios.map((scenario) => {
        const active = scenario.id === selectedId;
        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            className={cn(
              'rounded-full border px-4 py-2 font-manrope text-xs font-bold transition-all',
              active
                ? 'border-accent-lime bg-accent-lime text-black'
                : 'border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active hover:text-white'
            )}
          >
            {scenario.label}
          </button>
        );
      })}
      <button className="rounded-full border border-border-subtle bg-surface-2 px-4 py-2 font-manrope text-xs font-bold text-text-muted">
        Custom
      </button>
    </div>
  );
}

export default ScenarioSelector;
