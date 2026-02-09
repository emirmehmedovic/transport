"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  Package,
  DollarSign,
  Target,
  Download,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Driver {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Comparison {
  driverId: string;
  driverName: string;
  email: string;
  status: string;
  performance: {
    totalMiles: number;
    totalRevenue: number;
    completedLoads: number;
    onTimeDeliveryRate: number;
    avgRevenuePerMile: number;
    avgRevenuePerLoad: number;
    utilizationRate: number;
  };
}

export default function DriversComparePage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      if (res.ok) {
        setDrivers(data.drivers || []);
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  };

  const handleDriverToggle = (driverId: string) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      } else {
        if (prev.length >= 10) {
          setError("Možete uporediti maksimalno 10 vozača");
          return prev;
        }
        return [...prev, driverId];
      }
    });
    setError("");
  };

  const handleCompare = async () => {
    if (selectedDrivers.length < 2) {
      setError("Odaberite najmanje 2 vozača za poređenje");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ids = selectedDrivers.join(",");
      const res = await fetch(`/api/drivers/compare?ids=${ids}&days=${period}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri poređenju");
      }

      setComparisons(data.comparisons);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (comparisons.length === 0) return;

    const headers = [
      "Driver Name",
      "Email",
      "Status",
      "Total km",
      "Total Revenue",
      "Completed Loads",
      "On-Time Delivery %",
      "Prosjek prihoda/km",
      "Avg Revenue/Load",
      "Utilization Rate %",
    ];

    const rows = comparisons.map((c) => [
      c.driverName,
      c.email,
      c.status,
      c.performance.totalMiles,
      c.performance.totalRevenue.toFixed(2),
      c.performance.completedLoads,
      c.performance.onTimeDeliveryRate.toFixed(1),
      c.performance.avgRevenuePerMile.toFixed(2),
      c.performance.avgRevenuePerLoad.toFixed(2),
      c.performance.utilizationRate.toFixed(1),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `driver-comparison-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Prepare chart data
  const chartData = comparisons.map((c) => ({
    name: c.driverName.split(" ")[0], // First name only for chart
    "Total km": c.performance.totalMiles,
    Revenue: c.performance.totalRevenue,
    Loads: c.performance.completedLoads,
    "On-Time %": c.performance.onTimeDeliveryRate,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/drivers")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900">
              Poređenje vozača
            </h1>
            <p className="text-dark-500 mt-1">
              Uporedite performanse više vozača
            </p>
          </div>
        </div>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Odabir vozača</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => handleDriverToggle(driver.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedDrivers.includes(driver.id)
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedDrivers.includes(driver.id)
                          ? "border-primary-500 bg-primary-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedDrivers.includes(driver.id) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-dark-900">
                      {driver.user.firstName} {driver.user.lastName}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-dark-600">
                Odabrano: <span className="font-semibold">{selectedDrivers.length}</span> vozača
              </p>
              <Button
                onClick={handleCompare}
                disabled={selectedDrivers.length < 2 || loading}
              >
                {loading ? "Učitavanje..." : "Uporedi"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisons.length > 0 && (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Rezultati poređenja</CardTitle>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-dark-700">
                        Vozač
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Ukupno km
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Prihod
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Loads
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        On-Time %
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        BAM/km
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((comparison) => (
                      <tr
                        key={comparison.driverId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-dark-900">
                              {comparison.driverName}
                            </p>
                            <p className="text-xs text-dark-500">
                              {comparison.email}
                            </p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {formatNumber(comparison.performance.totalMiles)}
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900 font-medium">
                          {formatCurrency(comparison.performance.totalRevenue)}
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {comparison.performance.completedLoads}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              comparison.performance.onTimeDeliveryRate >= 95
                                ? "bg-green-100 text-green-700"
                                : comparison.performance.onTimeDeliveryRate >= 85
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {comparison.performance.onTimeDeliveryRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {formatCurrency(comparison.performance.avgRevenuePerMile)}/km
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {comparison.performance.utilizationRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KM Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Total km
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="Total km" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="Revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Loads Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Completed Loads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="Loads" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* On-Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  On-Time Delivery %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="On-Time %" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
