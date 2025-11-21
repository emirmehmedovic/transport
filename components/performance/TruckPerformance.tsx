'use client';

import { useState, useEffect } from 'react';
import { PerformanceCharts } from './PerformanceCharts';
import { TrendingUp, Package, DollarSign, Wrench, Activity, Calendar } from 'lucide-react';

interface TruckPerformanceProps {
  truckId: string;
}

export function TruckPerformance({ truckId }: TruckPerformanceProps) {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchPerformance();
  }, [truckId, period]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trucks/${truckId}/performance?days=${period}`);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          label="Total Miles"
          value={formatNumber(performance.totalMiles)}
          subValue={`${performance.activeDays} active days`}
          color="blue"
        />
        <KPICard
          icon={<Package className="w-6 h-6" />}
          label="Loads Completed"
          value={formatNumber(performance.loadsCompleted)}
          subValue={`${performance.uptimePercentage.toFixed(1)}% uptime`}
          color="purple"
        />
        <KPICard
          icon={<DollarSign className="w-6 h-6" />}
          label="Revenue Generated"
          value={formatCurrency(performance.revenueGenerated)}
          subValue={`${(performance.revenueGenerated / performance.totalMiles).toFixed(2)}/mile`}
          color="green"
        />
        <KPICard
          icon={<Wrench className="w-6 h-6" />}
          label="Cost per Mile"
          value={formatCurrency(performance.totalCostPerMile)}
          subValue={`Total costs: ${formatCurrency(performance.totalFuelCost + performance.totalMaintenanceCost)}`}
          color="orange"
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          label="Fuel Costs"
          value={formatCurrency(performance.totalFuelCost)}
          subValue={`${formatCurrency(performance.fuelCostPerMile)} per mile`}
          color="yellow"
        />
        <StatCard
          label="Maintenance Costs"
          value={formatCurrency(performance.totalMaintenanceCost)}
          subValue={`${formatCurrency(performance.maintenanceCostPerMile)} per mile`}
          color="red"
        />
      </div>

      {/* Charts */}
      <PerformanceCharts timeSeriesData={performance.timeSeriesData} type="truck" />
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
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    purple: 'text-purple-500 bg-purple-50',
    orange: 'text-orange-500 bg-orange-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-500 bg-red-50',
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
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-sm text-gray-500 font-medium mb-2">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}
