import React from 'react';

interface RangeKeySelectorProps {
  title: string;
  keys: string[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

export const RangeKeySelector: React.FC<RangeKeySelectorProps> = ({
  title,
  keys,
  selectedKeys,
  onChange,
  year,
  availableYears,
  onYearChange,
}) => {
  const toggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((item) => item !== key));
      return;
    }
    onChange([...selectedKeys, key]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#50504f]">{title}</p>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-xs border border-gray-300 rounded-md px-1.5 py-0.5"
          aria-label="Año del rango"
        >
          {availableYears.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const active = selectedKeys.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleKey(key)}
              aria-pressed={active}
              className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                active
                  ? 'bg-[#cf1b22] text-white border-[#cf1b22]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
};
