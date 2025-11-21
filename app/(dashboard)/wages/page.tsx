'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Download, FileText, CheckCircle, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      if (!response.ok) throw new Error('Failed to fetch');
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
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDriver || !periodStart || !periodEnd) {
      alert('Please fill all fields');
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
      alert(`Pay stub generated! Number: ${data.payStub.stubNumber}`);

      // Refresh list
      fetchPayStubs();
      setShowGenerateModal(false);
      setSelectedDriver('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (error: any) {
      alert(error.message || 'Failed to generate pay stub');
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

      alert('PDF generated successfully!');
      fetchPayStubs();
    } catch (error: any) {
      alert(error.message || 'Failed to generate PDF');
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Mark this pay stub as paid?')) return;

    try {
      const response = await fetch(`/api/wages/pay-stubs/${id}/mark-paid`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed');

      alert('Marked as paid!');
      fetchPayStubs();
    } catch (error) {
      alert('Failed to mark as paid');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const unpaid = payStubs.filter((s) => !s.isPaid).length;
  const paid = payStubs.filter((s) => s.isPaid).length;
  const totalAmount = payStubs.reduce((acc, stub) => acc + stub.totalAmount, 0);

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={DollarSign}
        title="Isplate & Pay Stubs"
        subtitle="Generišite i pratite isplate vozačima uz uvid u status plaćanja."
        actions={
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-white/15 bg-white/5 text-dark-50 font-semibold hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            + Generate Pay Stub
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Ukupno stubs</p>
            <p className="text-2xl font-bold mt-1">{payStubs.length}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Plaćeni</p>
            <p className="text-2xl font-bold mt-1">{paid}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Neplaćeni</p>
            <p className="text-2xl font-bold mt-1">{unpaid}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Ukupno (USD)</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </PageHeader>

      <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl overflow-hidden">
        <CardHeader className="border-b border-dark-100 pb-4 flex flex-col gap-2">
          <CardTitle className="text-2xl">Pay Stubs</CardTitle>
          <p className="text-sm text-dark-500">Pregled svih obračuna sa statusom plaćanja i dostupnim PDF-ovima.</p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-dark-500">Učitavanje...</div>
          ) : payStubs.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-dark-300" />
              <p>Nema pay stubova</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 border-b border-dark-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Stub #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Vozač</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Milje</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Iznos</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 uppercase">Status</th>
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
                        {stub.totalMiles.toLocaleString()}
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
              Generate Pay Stub
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.user.firstName} {driver.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
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
                  Period End
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
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
