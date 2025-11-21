'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

export default function DocumentViewer({
  documentId,
  fileName,
  mimeType,
  onClose,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';

  const downloadUrl = `/api/documents/${documentId}/download`;

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 25, 50));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {fileName}
            </h3>
            <p className="text-sm text-gray-500">{mimeType}</p>
          </div>

          <div className="flex items-center space-x-3 ml-4">
            {/* Zoom Controls (only for images) */}
            {isImage && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-6">
          {loading && (
            <div className="text-gray-500">Loading document...</div>
          )}

          {/* Image Viewer */}
          {isImage && (
            <div
              className="transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <img
                src={downloadUrl}
                alt={fileName}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  alert('Failed to load image');
                }}
              />
            </div>
          )}

          {/* PDF Viewer */}
          {isPDF && (
            <iframe
              src={downloadUrl}
              className="w-full h-full rounded-lg shadow-lg bg-white"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                alert('Failed to load PDF');
              }}
            />
          )}

          {/* Other Document Types */}
          {!isImage && !isPDF && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
