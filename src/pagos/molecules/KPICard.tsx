import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  compareValue?: string | number | null;
  accentClassName?: string;
}

const formatChange = (change: number): string => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  compareValue,
  accentClassName = 'bg-[#cf1b22]',
}) => {
  const changePositive = typeof change === 'number' && change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#50504f]">{value}</p>
        </div>
        <div className={`h-10 w-1.5 rounded-full ${accentClassName}`} />
      </div>

      {typeof change === 'number' && (
        <p className={`mt-3 text-sm font-medium ${changePositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatChange(change)} vs mes anterior
        </p>
      )}

      {compareValue !== null && compareValue !== undefined && (
        <p className="mt-2 text-xs text-gray-500">
          Comparativo: <span className="font-semibold text-gray-700">{compareValue}</span>
        </p>
      )}
    </div>
  );
};
