'use client';

import { useEffect, useState } from 'react';
import { DocumentsTab } from '@/components/documents';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Admin Documents Page
 * Prikazuje sve dokumente u sistemu
 * Dostupno samo za Admin i Dispatcher
 */
export default function DocumentsPage() {
  const [activeView, setActiveView] = useState<'all' | 'expiring'>('all');

  const summaryCards = [
    {
      label: 'Ukupno dokumenata',
      value: '—',
      description: 'Sve kategorije',
    },
    {
      label: 'Load dokumenti',
      value: '—',
      description: 'BOL, POD, fotografije',
    },
    {
      label: 'Compliance',
      value: '—',
      description: 'CDL, medicinsko, osiguranje',
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={FileText}
        title="Dokumenti"
        subtitle="Centralizirano upravljanje svim dokumentima flote, spremno za audit."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 p-1 text-sm font-semibold">
            <button
              onClick={() => setActiveView('all')}
              className={`px-4 py-1.5 rounded-full transition-colors ${
                activeView === 'all'
                  ? 'bg-white text-dark-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Svi dokumenti
            </button>
            <button
              onClick={() => setActiveView('expiring')}
              className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 ${
                activeView === 'expiring'
                  ? 'bg-white text-dark-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Ističu
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                {card.label}
              </p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
              <p className="text-xs text-white/60 mt-1">{card.description}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-6">
        {activeView === 'all' && (
          <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl">
            <CardHeader className="border-b border-dark-100 pb-5 flex flex-col gap-2">
              <CardTitle className="text-2xl">Arhiva dokumenata</CardTitle>
              <p className="text-sm text-dark-500">
                Pretražite sve tipove dokumenata i po potrebi odmah uploadujte nove fajlove.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <DocumentsTab showUploadButton={true} />
            </CardContent>
          </Card>
        )}

        {activeView === 'expiring' && (
          <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl">
            <CardHeader className="border-b border-dark-100 pb-5 flex flex-col gap-2">
              <CardTitle className="text-2xl">Dokumenti koji uskoro ističu</CardTitle>
              <p className="text-sm text-dark-500">
                Automatski pregled dokumenata kojima je potrebna hitna pažnja narednih 30 dana.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <ExpiringDocuments />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Expiring Documents Component
 */
function ExpiringDocuments() {
  const [expiringDocs, setExpiringDocs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringDocuments();
  }, []);

  const fetchExpiringDocuments = async () => {
    try {
      const response = await fetch('/api/documents/expiring?days=30');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setExpiringDocs(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading...</div>;
  }

  if (!expiringDocs || expiringDocs.total === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No expiring documents</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600 font-medium mb-1">Urgent (≤7 days)</p>
          <p className="text-2xl font-bold text-red-700">{expiringDocs.urgent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600 font-medium mb-1">Warning (7-15 days)</p>
          <p className="text-2xl font-bold text-yellow-700">{expiringDocs.warning}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium mb-1">Info (15-30 days)</p>
          <p className="text-2xl font-bold text-blue-700">{expiringDocs.info}</p>
        </div>
      </div>

      {/* Urgent Documents */}
      {expiringDocs.documents.urgent.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Urgent - Expiring in 7 days or less
          </h3>
          <div className="space-y-2">
            {expiringDocs.documents.urgent.map((doc: any) => (
              <DocumentCard key={doc.id} doc={doc} urgency="urgent" />
            ))}
          </div>
        </div>
      )}

      {/* Warning Documents */}
      {expiringDocs.documents.warning.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-700 mb-3">
            Warning - Expiring in 7-15 days
          </h3>
          <div className="space-y-2">
            {expiringDocs.documents.warning.map((doc: any) => (
              <DocumentCard key={doc.id} doc={doc} urgency="warning" />
            ))}
          </div>
        </div>
      )}

      {/* Info Documents */}
      {expiringDocs.documents.info.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-blue-700 mb-3">
            Info - Expiring in 15-30 days
          </h3>
          <div className="space-y-2">
            {expiringDocs.documents.info.map((doc: any) => (
              <DocumentCard key={doc.id} doc={doc} urgency="info" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, urgency }: { doc: any; urgency: 'urgent' | 'warning' | 'info' }) {
  const bgColor = {
    urgent: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[urgency];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`${bgColor} rounded-lg p-4 border`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{doc.fileName}</p>
          {doc.driver && (
            <p className="text-sm text-gray-600">
              Driver: {doc.driver.user.firstName} {doc.driver.user.lastName}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            Expires: {formatDate(doc.expiryDate)}
          </p>
          <p className="text-xs text-gray-600">
            {doc.daysUntilExpiry} days remaining
          </p>
        </div>
      </div>
    </div>
  );
}
