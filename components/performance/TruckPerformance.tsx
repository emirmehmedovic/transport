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
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 max-w-md mx-auto text-center">
          <p className="text-sm text-slate-600 font-medium">Nema dostupnih podataka o performansama</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900">Metrike performansi</h2>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-slate-600" />
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400 text-sm"
          >
            <option value={7}>Zadnjih 7 dana</option>
            <option value={30}>Zadnjih 30 dana</option>
            <option value={90}>Zadnjih 90 dana</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Ukupno km"
          value={formatNumber(performance.totalMiles)}
          subValue={`${performance.activeDays} active days`}
          color="blue"
        />
        <KPICard
          icon={<Package className="w-6 h-6" />}
          label="Završeni loadovi"
          value={formatNumber(performance.loadsCompleted)}
          subValue={`${performance.uptimePercentage.toFixed(1)}% uptime`}
          color="purple"
        />
        <KPICard
          icon={<DollarSign className="w-6 h-6" />}
          label="Generisani prihod"
          value={formatCurrency(performance.revenueGenerated)}
          subValue={`${formatCurrency(performance.revenueGenerated / performance.totalMiles)}/km`}
          color="green"
        />
        <KPICard
          icon={<Wrench className="w-6 h-6" />}
          label="Trošak po km"
          value={formatCurrency(performance.totalCostPerMile)}
          subValue={`Total costs: ${formatCurrency(performance.totalFuelCost + performance.totalMaintenanceCost)}`}
          color="orange"
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          label="Troškovi goriva"
          value={formatCurrency(performance.totalFuelCost)}
          subValue={`${formatCurrency(performance.fuelCostPerMile)} po km`}
          color="yellow"
        />
        <StatCard
          label="Troškovi održavanja"
          value={formatCurrency(performance.totalMaintenanceCost)}
          subValue={`${formatCurrency(performance.maintenanceCostPerMile)} po km`}
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
  return (
    <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
      {subValue && <div className="text-sm text-slate-600">{subValue}</div>}
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
    <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subValue && <div className="text-sm text-slate-600 mt-2">{subValue}</div>}
    </div>
  );
}
