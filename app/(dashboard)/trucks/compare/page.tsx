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
  Wrench,
  Download,
  Calendar,
  Activity,
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

interface Truck {
  id: string;
  truckNumber: string;
  make: string;
  model: string;
  year: number;
}

interface Comparison {
  truckId: string;
  truckNumber: string;
  truckName: string;
  isActive: boolean;
  performance: {
    totalMiles: number;
    revenueGenerated: number;
    loadsCompleted: number;
    totalCostPerMile: number;
    fuelCostPerMile: number;
    maintenanceCostPerMile: number;
    uptimePercentage: number;
    activeDays: number;
  };
}

export default function TrucksComparePage() {
  const router = useRouter();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      const res = await fetch("/api/trucks");
      const data = await res.json();
      if (res.ok) {
        setTrucks(data.trucks || []);
      }
    } catch (err) {
      console.error("Error fetching trucks:", err);
    }
  };

  const handleTruckToggle = (truckId: string) => {
    setSelectedTrucks((prev) => {
      if (prev.includes(truckId)) {
        return prev.filter((id) => id !== truckId);
      } else {
        if (prev.length >= 10) {
          setError("Možete uporediti maksimalno 10 kamiona");
          return prev;
        }
        return [...prev, truckId];
      }
    });
    setError("");
  };

  const handleCompare = async () => {
    if (selectedTrucks.length < 2) {
      setError("Odaberite najmanje 2 kamiona za poređenje");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ids = selectedTrucks.join(",");
      const res = await fetch(`/api/trucks/compare?ids=${ids}&days=${period}`);
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
      "Truck Number",
      "Truck Name",
      "Status",
      "Total km",
      "Revenue Generated",
      "Loads Completed",
      "Trošak/km",
      "Gorivo/km",
      "Održavanje/km",
      "Uptime %",
      "Active Days",
    ];

    const rows = comparisons.map((c) => [
      c.truckNumber,
      c.truckName,
      c.isActive ? "Active" : "Inactive",
      c.performance.totalMiles,
      c.performance.revenueGenerated.toFixed(2),
      c.performance.loadsCompleted,
      c.performance.totalCostPerMile.toFixed(2),
      c.performance.fuelCostPerMile.toFixed(2),
      c.performance.maintenanceCostPerMile.toFixed(2),
      c.performance.uptimePercentage.toFixed(1),
      c.performance.activeDays,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `truck-comparison-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Prepare chart data
  const chartData = comparisons.map((c) => ({
    name: c.truckNumber,
    "Total km": c.performance.totalMiles,
    Revenue: c.performance.revenueGenerated,
    Loads: c.performance.loadsCompleted,
    "Trošak/km": c.performance.totalCostPerMile,
    "Uptime %": c.performance.uptimePercentage,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/trucks")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900">
              Poređenje kamiona
            </h1>
            <p className="text-dark-500 mt-1">
              Uporedite performanse više kamiona
            </p>
          </div>
        </div>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Odabir kamiona</CardTitle>
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
              {trucks.map((truck) => (
                <button
                  key={truck.id}
                  onClick={() => handleTruckToggle(truck.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedTrucks.includes(truck.id)
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedTrucks.includes(truck.id)
                          ? "border-primary-500 bg-primary-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedTrucks.includes(truck.id) && (
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
                      {truck.truckNumber}
                    </span>
                  </div>
                  <p className="text-xs text-dark-600">
                    {truck.make} {truck.model}
                  </p>
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
                Odabrano: <span className="font-semibold">{selectedTrucks.length}</span> kamiona
              </p>
              <Button
                onClick={handleCompare}
                disabled={selectedTrucks.length < 2 || loading}
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
                        Kamion
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
                        Trošak/km
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Uptime %
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-dark-700">
                        Active Days
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((comparison) => (
                      <tr
                        key={comparison.truckId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-dark-900">
                              {comparison.truckNumber}
                            </p>
                            <p className="text-xs text-dark-500">
                              {comparison.truckName}
                            </p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {formatNumber(comparison.performance.totalMiles)}
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900 font-medium">
                          {formatCurrency(comparison.performance.revenueGenerated)}
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {comparison.performance.loadsCompleted}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              comparison.performance.totalCostPerMile <= 1.5
                                ? "bg-green-100 text-green-700"
                                : comparison.performance.totalCostPerMile <= 2.0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {formatCurrency(comparison.performance.totalCostPerMile)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              comparison.performance.uptimePercentage >= 90
                                ? "bg-green-100 text-green-700"
                                : comparison.performance.uptimePercentage >= 75
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {comparison.performance.uptimePercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-dark-900">
                          {comparison.performance.activeDays}
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
                  Revenue Generated
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
                  Loads Completed
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

            {/* Uptime Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Uptime Percentage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="Uptime %" fill="#f59e0b" />
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
