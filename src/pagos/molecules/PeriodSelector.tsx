import React from 'react';

interface PeriodSelectorProps {
  availablePeriods: string[];
  selectedPeriods: string[];
  onChange: (periods: string[]) => void;
  label?: string;
}

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
    onChange([...selectedPeriods, period].sort());
  };

  return (
    <div>
      <p className="text-sm font-medium text-[#50504f] mb-2">{label}</p>
      <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-white">
        {availablePeriods.length === 0 && (
          <p className="text-xs text-gray-500 px-1 py-2">No hay periodos disponibles</p>
        )}
        {availablePeriods.map((period) => {
          const checked = selectedPeriods.includes(period);
          return (
            <label key={period} className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePeriod(period)}
                className="rounded border-gray-300 text-[#cf1b22] focus:ring-[#cf1b22]"
              />
              <span>{period}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
