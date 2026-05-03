'use client';

import { useEffect, useState } from 'react';
import { DocumentsTab } from '@/components/documents';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateDMY } from "@/lib/date";

/**
 * Admin Documents Page
 * Prikazuje sve dokumente u sistemu
 * Dostupno samo za Admin i Dispatcher
 */
export default function DocumentsPage() {
  const [activeView, setActiveView] = useState<'all' | 'expiring' | 'compliance'>('all');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [documentsRes, complianceRes] = await Promise.all([
          fetch('/api/documents?limit=1'),
          fetch('/api/documents/compliance-summary'),
        ]);

        const documentsData = documentsRes.ok ? await documentsRes.json() : null;
        const complianceData = complianceRes.ok ? await complianceRes.json() : null;

        setSummary({
          totalDocuments: documentsData?.pagination?.total ?? 0,
          compliance: complianceData ?? null,
        });
      } catch (error) {
        console.error('Summary fetch error:', error);
      }
    }

    void fetchSummary();
  }, []);

  const summaryCards = [
    {
      label: 'Ukupno dokumenata',
      value: summary?.totalDocuments ?? '—',
      description: 'Sve kategorije',
    },
    {
      label: 'Nedostajuće stavke',
      value: summary?.compliance?.summary?.totalMissing ?? '—',
      description: 'Vozači, kamioni i prikolice',
    },
    {
      label: 'Ističe u 30 dana',
      value: summary?.compliance?.summary?.totalExpiring ?? '—',
      description: 'Compliance i registracije',
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={FileText}
        title="Dokumenti"
        subtitle="Centralizirano upravljanje svim dokumentima flote, spremno za audit."
        actions={
          <div className="flex items-center gap-1 md:gap-2 rounded-full border border-white/10 bg-white/10 p-1 text-xs md:text-sm font-semibold">
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full transition-colors whitespace-nowrap ${
                activeView === 'all'
                  ? 'bg-white text-dark-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Svi
            </button>
            <button
              onClick={() => setActiveView('expiring')}
              className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
                activeView === 'expiring'
                  ? 'bg-white text-dark-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
              Ističu
            </button>
            <button
              onClick={() => setActiveView('compliance')}
              className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full transition-colors whitespace-nowrap ${
                activeView === 'compliance'
                  ? 'bg-white text-dark-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Compliance
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 border border-white/10 text-white">
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">
                {card.label}
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1">{card.value}</p>
              <p className="text-[10px] md:text-xs text-white/60 mt-1">{card.description}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:gap-6">
        {activeView === 'all' && (
          <Card className="rounded-2xl md:rounded-[2rem] border border-dark-100 shadow-soft-xl">
            <CardHeader className="border-b border-dark-100 pb-4 md:pb-5 flex flex-col gap-2 px-4 md:px-6">
              <CardTitle className="text-lg md:text-2xl">Arhiva dokumenata</CardTitle>
              <p className="text-xs md:text-sm text-dark-500">
                Pretražite sve tipove dokumenata i po potrebi odmah uploadujte nove fajlove.
              </p>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
              <DocumentsTab showUploadButton={true} />
            </CardContent>
          </Card>
        )}

        {activeView === 'expiring' && (
          <Card className="rounded-2xl md:rounded-[2rem] border border-dark-100 shadow-soft-xl">
            <CardHeader className="border-b border-dark-100 pb-4 md:pb-5 flex flex-col gap-2 px-4 md:px-6">
              <CardTitle className="text-lg md:text-2xl">Dokumenti koji uskoro ističu</CardTitle>
              <p className="text-xs md:text-sm text-dark-500">
                Automatski pregled dokumenata kojima je potrebna hitna pažnja narednih 30 dana.
              </p>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
              <ExpiringDocuments />
            </CardContent>
          </Card>
        )}

        {activeView === 'compliance' && (
          <Card className="rounded-2xl md:rounded-[2rem] border border-dark-100 shadow-soft-xl">
            <CardHeader className="border-b border-dark-100 pb-4 md:pb-5 flex flex-col gap-2 px-4 md:px-6">
              <CardTitle className="text-lg md:text-2xl">Compliance pregled</CardTitle>
              <p className="text-xs md:text-sm text-dark-500">
                Obavezne stavke po vozaču, kamionu i prikolici, uz jasan pregled nedostajućih i stavki koje uskoro ističu.
              </p>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
              <ComplianceSummary summary={summary?.compliance} />
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
    return <div className="text-center text-gray-500 py-8">Učitavanje...</div>;
  }

  if (!expiringDocs || expiringDocs.total === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nema dokumenata koji uskoro ističu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-red-50 rounded-lg p-3 md:p-4 border border-red-200">
          <p className="text-xs md:text-sm text-red-600 font-medium mb-1">Urgentno (≤7 dana)</p>
          <p className="text-xl md:text-2xl font-bold text-red-700">{expiringDocs.urgent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 md:p-4 border border-yellow-200">
          <p className="text-xs md:text-sm text-yellow-600 font-medium mb-1">Upozorenje (7-15 dana)</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-700">{expiringDocs.warning}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
          <p className="text-xs md:text-sm text-blue-600 font-medium mb-1">Info (15-30 dana)</p>
          <p className="text-xl md:text-2xl font-bold text-blue-700">{expiringDocs.info}</p>
        </div>
      </div>

      {/* Urgent Documents */}
      {expiringDocs.documents.urgent.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-red-700 mb-2 md:mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
            Urgentno - ističe za 7 dana ili manje
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
          <h3 className="text-base md:text-lg font-semibold text-yellow-700 mb-2 md:mb-3">
            Upozorenje - ističe za 7-15 dana
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
          <h3 className="text-base md:text-lg font-semibold text-blue-700 mb-2 md:mb-3">
            Info - ističe za 15-30 dana
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
    return formatDateDMY(dateString);
  };

  return (
    <div className={`${bgColor} rounded-lg p-3 md:p-4 border`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm md:text-base truncate">{doc.fileName}</p>
          {doc.driver && (
            <p className="text-xs md:text-sm text-gray-600">
              Vozač: {doc.driver.user.firstName} {doc.driver.user.lastName}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right flex-shrink-0">
          <p className="text-xs md:text-sm font-semibold text-gray-900">
            Ističe: {formatDate(doc.expiryDate)}
          </p>
          <p className="text-[10px] md:text-xs text-gray-600">
            {doc.daysUntilExpiry} dana preostalo
          </p>
        </div>
      </div>
    </div>
  );
}

function ComplianceSummary({ summary }: { summary: any }) {
  if (!summary) {
    return <div className="text-center text-gray-500 py-8">Učitavanje compliance pregleda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-red-50 rounded-lg p-3 md:p-4 border border-red-200">
          <p className="text-xs md:text-sm text-red-600 font-medium mb-1">Nedostaje vozačima</p>
          <p className="text-xl md:text-2xl font-bold text-red-700">{summary.summary.driversMissing}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 md:p-4 border border-amber-200">
          <p className="text-xs md:text-sm text-amber-600 font-medium mb-1">Nedostaje kamionima</p>
          <p className="text-xl md:text-2xl font-bold text-amber-700">{summary.summary.trucksMissing}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
          <p className="text-xs md:text-sm text-blue-600 font-medium mb-1">Nedostaje prikolicama</p>
          <p className="text-xl md:text-2xl font-bold text-blue-700">{summary.summary.trailersMissing}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { key: 'driver', title: 'Obavezno za vozača' },
          { key: 'truck', title: 'Obavezno za kamion' },
          { key: 'trailer', title: 'Obavezno za prikolicu' },
        ].map((section) => (
          <div key={section.key} className="rounded-xl border border-dark-200 p-4">
            <h3 className="font-semibold text-dark-900 mb-3">{section.title}</h3>
            <div className="space-y-2">
              {summary.requiredByEntity[section.key].map((item: string) => (
                <div key={item} className="rounded-lg bg-dark-50 px-3 py-2 text-sm text-dark-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-dark-900 mb-3">Nedostajuće stavke</h3>
          <div className="space-y-2">
            {summary.missing.length > 0 ? (
              summary.missing.map((item: any) => (
                <div key={`${item.entityType}-${item.entityId}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="font-medium text-red-900">{item.entityLabel}</p>
                  <p className="text-sm text-red-700 mt-1">{item.missingItems.join(', ')}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-dark-500">Nema nedostajućih compliance stavki.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-dark-900 mb-3">Ističe u narednih 30 dana</h3>
          <div className="space-y-2">
            {summary.expiring.length > 0 ? (
              summary.expiring.map((item: any) => (
                <div key={`${item.entityType}-${item.entityId}-${item.itemLabel}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-medium text-amber-900">{item.entityLabel}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {item.itemLabel} • {formatDateDMY(item.expiryDate)} • {item.daysUntilExpiry} dana
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-dark-500">Nema stavki koje uskoro ističu.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
