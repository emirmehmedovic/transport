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
  TrendingUp,
  Truck,
  Calendar as CalendarIcon,
  BarChart3,
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
  LineChart,
  Line,
} from "recharts";

interface RevenueData {
  period: {
    start: string;
    end: string;
    groupBy: "daily" | "weekly" | "monthly";
  };
  summary: {
    totalRevenue: number;
    totalLoads: number;
    totalMiles: number;
    avgRevenuePerLoad: number;
    avgRevenuePerMile: number;
  };
  timeSeriesData: Array<{
    date: string;
    revenue: number;
    loads: number;
    miles: number;
  }>;
  byDriver: Array<{
    driverId: string;
    driverName: string;
    revenue: number;
    loads: number;
    miles: number;
  }>;
  byTruck: Array<{
    truckId: string;
    truckNumber: string;
    revenue: number;
    loads: number;
    miles: number;
  }>;
}

export default function RevenueReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevenueData | null>(null);
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

      const response = await fetch(`/api/reports/revenue?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("bs-BA").format(date);
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
            <h1 className="text-3xl font-bold text-dark-900">Izvještaj o Prihodima</h1>
            <p className="text-dark-500">
              Detaljan pregled prihoda i finansijskih performansi
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ukupni Prihod</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.totalRevenue)}
                    </h3>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ukupno Utovara</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {data.summary.totalLoads}
                    </h3>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Prosjek / Utovar</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.avgRevenuePerLoad)}
                    </h3>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Prosjek / km</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(data.summary.avgRevenuePerMile)}
                    </h3>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prihod Kroz Vrijeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Prihod"]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10B981" name="Prihod" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Utovara i Kilometraže</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="loads"
                        stroke="#3B82F6"
                        name="Utovari"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="miles"
                        stroke="#F59E0B"
                        name="km"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Najbolji Vozači po Prihodu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Vozač</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Utovari</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Prihod</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byDriver.slice(0, 5).map((item) => (
                        <tr key={item.driverId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.driverName}</td>
                          <td className="px-4 py-3 text-right">{item.loads}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">
                            {formatCurrency(item.revenue)}
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
                <CardTitle>Najbolji Kamioni po Prihodu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Kamion</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Utovari</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Prihod</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byTruck.slice(0, 5).map((item) => (
                        <tr key={item.truckId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.truckNumber}</td>
                          <td className="px-4 py-3 text-right">{item.loads}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">
                            {formatCurrency(item.revenue)}
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
