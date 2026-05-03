'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeDMY } from '@/lib/date';

type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'DOCUMENT_UPLOAD'
  | 'ASSIGNMENT'
  | 'PAYMENT';

interface AuditTimelineItem {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes: any;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

function getActionLabel(action: AuditAction): string {
  switch (action) {
    case 'CREATE':
      return 'Kreirano';
    case 'UPDATE':
      return 'Ažurirano';
    case 'DELETE':
      return 'Obrisano';
    case 'STATUS_CHANGE':
      return 'Promjena statusa';
    case 'DOCUMENT_UPLOAD':
      return 'Upload dokumenta';
    case 'ASSIGNMENT':
      return 'Dodjela';
    case 'PAYMENT':
      return 'Plaćanje';
  }
}

function getActionTone(action: AuditAction): string {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700';
    case 'DELETE':
      return 'bg-red-100 text-red-700';
    case 'STATUS_CHANGE':
      return 'bg-purple-100 text-purple-700';
    case 'DOCUMENT_UPLOAD':
      return 'bg-amber-100 text-amber-700';
    case 'ASSIGNMENT':
      return 'bg-orange-100 text-orange-700';
    case 'PAYMENT':
      return 'bg-teal-100 text-teal-700';
  }
}

export default function AuditTimelineCard({
  entity,
  entityId,
  title,
}: {
  entity: string;
  entityId: string;
  title: string;
}) {
  const [items, setItems] = useState<AuditTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          entity,
          entityId,
          limit: '10',
        });
        const response = await fetch(`/api/audit-logs?${params.toString()}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Neuspjelo učitavanje audit logova');
        }
        const data = await response.json();
        setItems(data.logs || []);
      } catch (err: any) {
        setError(err?.message || 'Greška pri učitavanju audita');
      } finally {
        setLoading(false);
      }
    }

    void fetchAuditLogs();
  }, [entity, entityId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-dark-500">Učitavanje audit vremenske linije...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-dark-500">Nema audit zapisa za ovaj entitet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-dark-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionTone(item.action)}`}>
                    {getActionLabel(item.action)}
                  </span>
                  <span className="text-xs text-dark-500">
                    {formatDateTimeDMY(item.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-dark-800 mt-2">
                  {item.user.firstName} {item.user.lastName} ({item.user.role})
                </p>
                {item.changes && (
                  <pre className="mt-2 text-xs bg-dark-50 rounded-lg p-2 overflow-x-auto text-dark-600">
                    {JSON.stringify(item.changes, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
