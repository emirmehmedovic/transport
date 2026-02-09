"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  DollarSign,
  Fuel,
  Wrench,
  PieChart,
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
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

interface ExpenseData {
  period: {
    start: string;
    end: string;
    groupBy: "daily" | "weekly" | "monthly";
  };
  summary: {
    totalExpenses: number;
    totalFuelCost: number;
    totalMaintenanceCost: number;
    fuelRecordsCount: number;
    maintenanceRecordsCount: number;
  };
  timeSeriesData: Array<{
    date: string;
    fuelCost: number;
    maintenanceCost: number;
    totalCost: number;
    gallons: number;
  }>;
  byTruck: Array<{
    truckId: string;
    truckNumber: string;
    fuelCost: number;
    maintenanceCost: number;
    totalCost: number;
  }>;
  byType: {
    fuel: number;
    maintenance: number;
  };
  maintenanceByType: Array<{
    type: string;
    cost: number;
    count: number;
  }>;
}

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];

export default function ExpenseReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpenseData | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<"daily" | "weekly" | "monthly">("monthly");

  // Initialize dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, groupBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        groupBy,
      });

      const response = await fetch(`/api/reports/expenses?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch expense data");
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching expense data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(value);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 p-0 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900">Izvještaj o Troškovima</h1>
            <p className="text-dark-500">
              Analiza troškova goriva, održavanja i popravki
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          Izvezi PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Početni Datum
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Završni Datum
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupiši Po
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
              >
                <option value="daily">Dnevno</option>
                <option value="weekly">Sedmično</option>
                <option value="monthly">Mjesečno</option>
              </select>
            </div>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? "Učitavanje..." : "Ažuriraj Izvještaj"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ukupni Troškovi</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.totalExpenses)}
                    </h3>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Troškovi Goriva</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.totalFuelCost)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.summary.fuelRecordsCount} zapisa
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Fuel className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Održavanje</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.totalMaintenanceCost)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.summary.maintenanceRecordsCount} zapisa
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Troškovi Kroz Vrijeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Trošak"]}
                      />
                      <Legend />
                      <Bar dataKey="fuelCost" stackId="a" fill="#3B82F6" name="Gorivo" />
                      <Bar dataKey="maintenanceCost" stackId="a" fill="#F59E0B" name="Održavanje" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raspodjela Troškova</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={[
                          { name: "Gorivo", value: data.byType.fuel },
                          { name: "Održavanje", value: data.byType.maintenance },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F59E0B" />
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Troškovi po Kamionu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Kamion</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Gorivo</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Održ.</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Ukupno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byTruck.slice(0, 5).map((item) => (
                        <tr key={item.truckId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.truckNumber}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.fuelCost)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.maintenanceCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            {formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Održavanje po Tipu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Tip</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Broj</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Trošak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.maintenanceByType.map((item) => (
                        <tr key={item.type} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.type}</td>
                          <td className="px-4 py-3 text-right">{item.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">
                            {formatCurrency(item.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
