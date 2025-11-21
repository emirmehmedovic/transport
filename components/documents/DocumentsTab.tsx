'use client';

import { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import DocumentList from './DocumentList';
import { Upload, List } from 'lucide-react';

interface DocumentsTabProps {
  loadId?: string;
  driverId?: string;
  defaultView?: 'upload' | 'list';
  showUploadButton?: boolean;
}

/**
 * Kombinovana komponenta za prikaz i upload dokumenata
 * Može se koristiti na Load detail page ili Driver detail page
 */
export default function DocumentsTab({
  loadId,
  driverId,
  defaultView = 'list',
  showUploadButton = true,
}: DocumentsTabProps) {
  const [activeView, setActiveView] = useState<'upload' | 'list'>(defaultView);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    // Refresh document list nakon uspješnog uploada
    setRefreshKey(refreshKey + 1);
    setActiveView('list');
  };

  const handleDocumentDeleted = () => {
    // Refresh document list nakon brisanja
    setRefreshKey(refreshKey + 1);
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveView('list')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${activeView === 'list'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <List className="w-4 h-4 inline mr-2" />
            Documents
          </button>

          {showUploadButton && (
            <button
              onClick={() => setActiveView('upload')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${activeView === 'upload'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload
            </button>
          )}
        </div>

        {/* Info */}
        <div className="text-sm text-gray-500">
          {loadId && 'Load Documents'}
          {driverId && 'Driver Documents'}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeView === 'list' && (
          <DocumentList
            key={refreshKey}
            loadId={loadId}
            driverId={driverId}
            onDocumentDeleted={handleDocumentDeleted}
          />
        )}

        {activeView === 'upload' && (
          <DocumentUpload
            loadId={loadId}
            driverId={driverId}
            onUploadSuccess={handleUploadSuccess}
          />
        )}
      </div>
    </div>
  );
}
