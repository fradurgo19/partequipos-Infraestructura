import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  compareCounts?: number[] | null;
}

const currencyTick = (value: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const truncateChartLabel = (value: string, maxLength = 42): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const LOCATION_PIE_COLORS = [
  '#cf1b22',
  '#a11217',
  '#50504f',
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#be123c',
  '#4d7c0f',
];

const getLocationPieColor = (index: number): string =>
  LOCATION_PIE_COLORS[index % LOCATION_PIE_COLORS.length];

interface LocationPieSlice {
  name: string;
  value: number;
  count: number;
}

const buildLocationPieSlices = (
  labels: string[],
  values: number[],
  counts: number[]
): LocationPieSlice[] =>
  labels
    .map((name, index) => ({
      name,
      value: values[index] ?? 0,
      count: counts[index] ?? 0,
    }))
    .filter((item) => item.value > 0);

interface LocationPieTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LocationPieSlice }>;
}

const LocationPieTooltip: React.FC<LocationPieTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-sm">
      <p className="font-semibold text-[#50504f]">{item.name}</p>
      <p className="text-gray-700">{formatCurrency(item.value)}</p>
      <p className="text-gray-500">
        {item.count} factura{item.count === 1 ? '' : 's'}
      </p>
    </div>
  );
};

interface SingleLocationPieProps {
  title?: string;
  slices: LocationPieSlice[];
}

const LocationPieEmptyState: React.FC = () => (
  <div className="flex h-64 items-center justify-center text-sm text-gray-500">
    Sin datos para mostrar
  </div>
);

const SingleLocationPie: React.FC<SingleLocationPieProps> = ({ title, slices }) => {
  if (slices.length === 0) {
    return <LocationPieEmptyState />;
  }

  return (
    <div className="min-h-64">
      {title && <p className="mb-2 text-center text-xs font-medium text-gray-500">{title}</p>}
      <ResponsiveContainer width="100%" height={title ? 280 : 300}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius={96}
            paddingAngle={1}
          >
            {slices.map((slice, index) => (
              <Cell key={slice.name} fill={getLocationPieColor(index)} />
            ))}
          </Pie>
          <Tooltip content={<LocationPieTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            formatter={(value: string) => truncateChartLabel(value, 34)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
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

export const LocationChart: React.FC<LocationChartProps> = ({
  locationData,
  compareData,
  compareCounts,
}) => {
  const mainSlices = buildLocationPieSlices(
    locationData.labels,
    locationData.data,
    locationData.counts
  );

  const compareSlices =
    compareData && compareCounts
      ? buildLocationPieSlices(locationData.labels, compareData, compareCounts)
      : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[#50504f] mb-4">Por sede / ubicación</h3>
      {compareData ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SingleLocationPie title="Periodo principal" slices={mainSlices} />
          <SingleLocationPie title="Comparativo" slices={compareSlices} />
        </div>
      ) : (
        <div className="h-80">
          <SingleLocationPie slices={mainSlices} />
        </div>
      )}
    </div>
  );
};
