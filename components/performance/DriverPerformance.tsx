'use client';

import { useState, useEffect } from 'react';
import { PerformanceCharts } from './PerformanceCharts';
import { TrendingUp, Package, DollarSign, Target, Activity, Calendar } from 'lucide-react';

interface DriverPerformanceProps {
  driverId: string;
}

export function DriverPerformance({ driverId }: DriverPerformanceProps) {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchPerformance();
  }, [driverId, period]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/drivers/${driverId}/performance?days=${period}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPerformance(data.performance);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading performance data...</div>;
  }

  if (!performance) {
    return <div className="text-center py-8 text-gray-500">No performance data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Ukupno km"
          value={formatNumber(performance.totalMiles)}
          subValue={`${formatNumber(performance.totalLoadedMiles)} km utovareno`}
          color="blue"
        />
        <KPICard
          icon={<Package className="w-6 h-6" />}
          label="Završeni loadovi"
          value={formatNumber(performance.completedLoads)}
          subValue={`${performance.avgMilesPerLoad.toFixed(0)} avg km/load`}
          color="purple"
        />
        <KPICard
          icon={<DollarSign className="w-6 h-6" />}
          label="Ukupni prihod"
          value={formatCurrency(performance.totalRevenue)}
          subValue={`${formatCurrency(performance.avgRevenuePerMile)}/km`}
          color="green"
        />
        <KPICard
          icon={<Target className="w-6 h-6" />}
          label="On-Time Delivery"
          value={`${performance.onTimeDeliveryRate.toFixed(1)}%`}
          subValue={`${performance.activeDays} active days`}
          color="cyan"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Prosječni prihod po loadu"
          value={formatCurrency(performance.avgRevenuePerLoad)}
        />
        <StatCard
          label="Deadhead km"
          value={formatNumber(performance.totalDeadheadMiles)}
          subValue={`${((performance.totalDeadheadMiles / performance.totalMiles) * 100).toFixed(1)}% of total`}
        />
        <StatCard
          label="Utilization Rate"
          value={`${performance.utilizationRate.toFixed(1)}%`}
          subValue={`${performance.activeDays} of ${period} days`}
        />
      </div>

      {/* Charts */}
      <PerformanceCharts timeSeriesData={performance.timeSeriesData} type="driver" />
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: 'blue' | 'green' | 'purple' | 'cyan';
}) {
  const colors = {
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    purple: 'text-purple-500 bg-purple-50',
    cyan: 'text-cyan-500 bg-cyan-50',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {subValue && <div className="text-sm text-gray-500">{subValue}</div>}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-sm text-gray-500 font-medium mb-2">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}
