'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatDateDMY } from "@/lib/date";

interface TimeSeriesData {
  date: string;
  miles?: number;
  revenue?: number;
  loads?: number;
  costs?: number;
}

interface PerformanceChartsProps {
  timeSeriesData: TimeSeriesData[];
  type: 'driver' | 'truck';
}

export function PerformanceCharts({ timeSeriesData, type }: PerformanceChartsProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    return formatDateDMY(dateStr);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return `${(value / 1000).toFixed(1)}k KM`;
  };

  return (
    <div className="space-y-8">
      {/* Kilometri Over Time */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kilometri kroz vrijeme</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="miles"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', r: 4 }}
              activeDot={{ r: 6 }}
              name="km"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Prihod Over Time */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prihod kroz vrijeme</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value: number) =>
                new Intl.NumberFormat('bs-BA', {
                  style: 'currency',
                  currency: 'BAM',
                }).format(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Prihod"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Loads Per Week (Driver only) */}
      {type === 'driver' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loadovi po sedmici</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="loads" fill="#0ea5e9" name="Loadovi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Costs vs Revenue (Truck only) */}
      {type === 'truck' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Prihod vs troškovi
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) =>
                  new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(value)
                }
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Prihod" />
              <Bar dataKey="costs" fill="#ef4444" name="Troškovi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
