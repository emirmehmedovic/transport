'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Document {
  id: string;
  type: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiryDate: string | null;
  createdAt: string;
  load?: {
    id: string;
    loadNumber: string;
  };
  driver?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface DocumentListProps {
  loadId?: string;
  driverId?: string;
  onDocumentDeleted?: () => void;
}

const DOCUMENT_TYPE_LABELS: { [key: string]: string } = {
  BOL: 'Bill of Lading',
  POD: 'Proof of Delivery',
  DAMAGE_REPORT: 'Damage Report',
  LOAD_PHOTO: 'Load Photo',
  RATE_CONFIRMATION: 'Rate Confirmation',
  FUEL_RECEIPT: 'Fuel Receipt',
  CDL_LICENSE: 'CDL License',
  MEDICAL_CARD: 'Medical Card',
  INSURANCE: 'Insurance',
  REGISTRATION: 'Registration',
  OTHER: 'Other',
};

export default function DocumentList({
  loadId,
  driverId,
  onDocumentDeleted,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [loadId, driverId, selectedType]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (loadId) params.append('loadId', loadId);
      if (driverId) params.append('driverId', driverId);
      if (selectedType) params.append('type', selectedType);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Fetch documents error:', error);
      alert('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      // Refresh list
      fetchDocuments();
      setDeleteConfirm(null);

      if (onDocumentDeleted) {
        onDocumentDeleted();
      }

      alert('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpiring = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const daysUntil = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 30 && daysUntil > 0;
  };

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Type Filter */}
        <div className="sm:w-64">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <button
          onClick={fetchDocuments}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.fileName}
                          </p>
                          {doc.load && (
                            <p className="text-xs text-gray-500">
                              Load: {doc.load.loadNumber}
                            </p>
                          )}
                          {doc.driver && (
                            <p className="text-xs text-gray-500">
                              Driver: {doc.driver.user.firstName} {doc.driver.user.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {doc.expiryDate ? (
                        <div className="flex items-center space-x-2">
                          <span className={`
                            ${isExpired(doc.expiryDate) ? 'text-red-600 font-semibold' : ''}
                            ${isExpiring(doc.expiryDate) ? 'text-yellow-600 font-semibold' : ''}
                            ${!isExpired(doc.expiryDate) && !isExpiring(doc.expiryDate) ? 'text-gray-500' : ''}
                          `}>
                            {formatDate(doc.expiryDate)}
                          </span>
                          {(isExpired(doc.expiryDate) || isExpiring(doc.expiryDate)) && (
                            <AlertCircle className={`
                              w-4 h-4
                              ${isExpired(doc.expiryDate) ? 'text-red-500' : 'text-yellow-500'}
                            `} />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Download Button */}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirm(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Delete Document?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
