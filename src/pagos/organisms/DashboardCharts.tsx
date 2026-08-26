import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LocationChartData, ServiceTypeChartItem, TrendChartData } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TrendChartProps {
  trendData: TrendChartData;
  compareData?: number[] | null;
}

interface ServiceTypeChartProps {
  serviceTypeData: ServiceTypeChartItem[];
}

interface LocationChartProps {
  locationData: LocationChartData;
  compareData?: number[] | null;
}

const currencyTick = (value: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const truncateChartLabel = (value: string, maxLength = 42): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const LOCATION_ROW_HEIGHT = 44;
const LOCATION_CHART_MIN_HEIGHT = 320;
const LOCATION_CHART_SCROLL_MAX = 560;

const getLocationChartHeight = (rowCount: number): number =>
  Math.max(LOCATION_CHART_MIN_HEIGHT, rowCount * LOCATION_ROW_HEIGHT + 48);

const getLocationYAxisWidth = (labels: string[]): number => {
  const maxLength = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(300, Math.max(168, Math.ceil(maxLength * 6.2)));
};

interface LocationAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

const LocationAxisTick: React.FC<LocationAxisTickProps> = ({ x = 0, y = 0, payload }) => {
  const label = payload?.value ?? '';
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#50504f" fontSize={11}>
        <title>{label}</title>
        {truncateChartLabel(label)}
      </text>
    </g>
  );
};

export const TrendChart: React.FC<TrendChartProps> = ({ trendData, compareData }) => {
  const rows = trendData.labels.map((label, index) => ({
    label,
    total: trendData.data[index] ?? 0,
    compare: compareData?.[index] ?? null,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-80">
      <h3 className="text-sm font-semibold text-[#50504f] mb-4">Tendencia histórica</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="total" name="Total" stroke="#cf1b22" strokeWidth={2} dot={false} />
          {compareData && (
            <Line
              type="monotone"
              dataKey="compare"
              name="Comparativo"
              stroke="#50504f"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ServiceTypeChart: React.FC<ServiceTypeChartProps> = ({ serviceTypeData }) => {
  const rows = serviceTypeData.map((item) => ({
    label: item.label,
    value: item.value,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-80">
      <h3 className="text-sm font-semibold text-[#50504f] mb-4">Por tipo de servicio</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="value" name="Monto" fill="#cf1b22" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const LocationChart: React.FC<LocationChartProps> = ({ locationData, compareData }) => {
  const rows = locationData.labels.map((label, index) => ({
    label,
    total: locationData.data[index] ?? 0,
    compare: compareData?.[index] ?? null,
    count: locationData.counts[index] ?? 0,
  }));

  const chartHeight = getLocationChartHeight(rows.length);
  const yAxisWidth = getLocationYAxisWidth(locationData.labels);
  const needsScroll = chartHeight > LOCATION_CHART_SCROLL_MAX;
  const viewportHeight = needsScroll ? LOCATION_CHART_SCROLL_MAX : chartHeight;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[#50504f] mb-4">Por sede / ubicación</h3>
      <div
        className={needsScroll ? 'overflow-y-auto pr-1' : undefined}
        style={{ height: viewportHeight }}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
            barSize={compareData ? 14 : 18}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={yAxisWidth}
              interval={0}
              tick={LocationAxisTick}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'total' ? 'Monto' : 'Comparativo',
              ]}
              labelFormatter={(label: string) => label}
            />
            <Legend />
            <Bar dataKey="total" name="Monto" fill="#a11217" radius={[0, 6, 6, 0]} />
            {compareData && (
              <Bar dataKey="compare" name="Comparativo" fill="#9ca3af" radius={[0, 6, 6, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
