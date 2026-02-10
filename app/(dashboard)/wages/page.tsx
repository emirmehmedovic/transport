'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Download, FileText, CheckCircle, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateDMY } from "@/lib/date";

interface PayStub {
  id: string;
  stubNumber: string;
  periodStart: string;
  periodEnd: string;
  totalMiles: number;
  totalAmount: number;
  avgRatePerMile: number;
  isPaid: boolean;
  paidDate: string | null;
  pdfPath: string | null;
  driver: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Driver {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function WagesPage() {
  const [payStubs, setPayStubs] = useState<PayStub[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Generate form state
  const [selectedDriver, setSelectedDriver] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPayStubs();
    fetchDrivers();
  }, []);

  const fetchPayStubs = async () => {
    try {
      const response = await fetch('/api/wages/pay-stubs');
      if (!response.ok) throw new Error('Neuspjelo dohvaćanje obračuna');
      const data = await response.json();
      setPayStubs(data.payStubs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      if (!response.ok) throw new Error('Neuspjelo dohvaćanje vozača');
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDriver || !periodStart || !periodEnd) {
      alert('Molimo popunite sva polja');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/wages/pay-stubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriver,
          periodStart,
          periodEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      alert(`Obračun generisan! Broj: ${data.payStub.stubNumber}`);

      // Refresh list
      fetchPayStubs();
      setShowGenerateModal(false);
      setSelectedDriver('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (error: any) {
      alert(error.message || 'Neuspjelo generisanje obračuna');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = async (id: string) => {
    try {
      const response = await fetch(`/api/wages/pay-stubs/${id}/generate-pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      alert('PDF uspješno generisan!');
      fetchPayStubs();
    } catch (error: any) {
      alert(error.message || 'Neuspjelo generisanje PDF-a');
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Označiti ovaj obračun kao plaćen?')) return;

    try {
      const response = await fetch(`/api/wages/pay-stubs/${id}/mark-paid`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Neuspješno označavanje kao plaćeno');

      alert('Označeno kao plaćeno!');
      fetchPayStubs();
    } catch (error) {
      alert('Neuspješno označavanje kao plaćeno');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatKilometers = (km: number) => {
    return km.toLocaleString('bs-BA', { maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    return formatDateDMY(dateStr);
  };

  const unpaid = payStubs.filter((s) => !s.isPaid).length;
  const paid = payStubs.filter((s) => s.isPaid).length;
  const totalAmount = payStubs.reduce((acc, stub) => acc + stub.totalAmount, 0);

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={DollarSign}
        title="Isplate i obračuni"
        subtitle="Generišite i pratite obračune za vozače uz uvid u status plaćanja."
        actions={
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-5 py-2 md:py-2.5 border border-white/15 bg-white/5 text-dark-50 text-xs md:text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
          >
            + Generiši
          </button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Obračuna</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{payStubs.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Plaćeni</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{paid}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Neplaćeni</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{unpaid}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Ukupno (BAM)</p>
            <p className="text-xl md:text-2xl font-bold mt-1 truncate">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </PageHeader>

      <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl overflow-hidden">
        <CardHeader className="border-b border-dark-100 pb-4 flex flex-col gap-2">
          <CardTitle className="text-2xl">Obračuni</CardTitle>
          <p className="text-sm text-dark-500">Pregled svih obračuna sa statusom plaćanja i dostupnim PDF dokumentima.</p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-dark-500">Učitavanje...</div>
          ) : payStubs.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-dark-300" />
              <p>Nema obračuna</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 border-b border-dark-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Obračun #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Vozač</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Kilometri</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Iznos (BAM)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Status plaćanja</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-dark-600 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {payStubs.map((stub) => (
                    <tr key={stub.id} className="hover:bg-dark-50">
                      <td className="px-6 py-4 text-sm font-medium text-dark-900">
                        {stub.stubNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-900">
                        {stub.driver.user.firstName} {stub.driver.user.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-600">
                        {formatDate(stub.periodStart)} - {formatDate(stub.periodEnd)}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-900">
                        {formatKilometers(stub.totalMiles)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-dark-900">
                        {formatCurrency(stub.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        {stub.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> Plaćeno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                            <Calendar className="w-3 h-3" /> Na čekanju
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-sm font-medium">
                          {!stub.pdfPath && (
                            <button
                              onClick={() => handleGeneratePDF(stub.id)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              PDF
                            </button>
                          )}
                          {!stub.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(stub.id)}
                              className="text-emerald-600 hover:text-emerald-800"
                            >
                              Označi plaćeno
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Generiši obračun
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vozač
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Odaberite vozača...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.user.firstName} {driver.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Početak perioda
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kraj perioda
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={generating}
              >
                Otkaži
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {generating ? 'Generišem...' : 'Generiši'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
