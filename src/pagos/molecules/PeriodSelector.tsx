import React from 'react';

interface PeriodSelectorProps {
  availablePeriods: string[];
  selectedPeriods: string[];
  onChange: (periods: string[]) => void;
  label?: string;
}

const chipClass = (active: boolean): string =>
  active
    ? 'bg-[#cf1b22] text-white border-[#cf1b22]'
    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  availablePeriods,
  selectedPeriods,
  onChange,
  label = 'Periodos (mes)',
}) => {
  const togglePeriod = (period: string) => {
    if (selectedPeriods.includes(period)) {
      onChange(selectedPeriods.filter((item) => item !== period));
      return;
    }
    onChange([...selectedPeriods, period].sort((a, b) => a.localeCompare(b)));
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-[#50504f]">{label}</p>
      {availablePeriods.length === 0 ? (
        <p className="text-xs text-gray-500">No hay periodos disponibles</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {availablePeriods.map((period) => {
            const active = selectedPeriods.includes(period);
            return (
              <button
                key={period}
                type="button"
                onClick={() => togglePeriod(period)}
                aria-pressed={active}
                className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${chipClass(active)}`}
              >
                {period}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
