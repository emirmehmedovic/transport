'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from "@/lib/ui-labels";

interface DocumentUploadProps {
  onUploadSuccess?: (document: any) => void;
  loadId?: string;
  driverId?: string;
  inspectionId?: string;
  incidentId?: string;
  defaultDocumentType?: string;
  maxFiles?: number;
}

const DOCUMENT_TYPES = [
  { value: 'BOL', label: `${DOCUMENT_TYPE_LABELS.BOL} (BOL)` },
  { value: 'POD', label: `${DOCUMENT_TYPE_LABELS.POD} (POD)` },
  { value: 'DAMAGE_REPORT', label: DOCUMENT_TYPE_LABELS.DAMAGE_REPORT },
  { value: 'LOAD_PHOTO', label: DOCUMENT_TYPE_LABELS.LOAD_PHOTO },
  { value: 'RATE_CONFIRMATION', label: DOCUMENT_TYPE_LABELS.RATE_CONFIRMATION },
  { value: 'FUEL_RECEIPT', label: DOCUMENT_TYPE_LABELS.FUEL_RECEIPT },
  { value: 'CDL_LICENSE', label: DOCUMENT_TYPE_LABELS.CDL_LICENSE },
  { value: 'MEDICAL_CARD', label: DOCUMENT_TYPE_LABELS.MEDICAL_CARD },
  { value: 'INSURANCE', label: DOCUMENT_TYPE_LABELS.INSURANCE },
  { value: 'REGISTRATION', label: DOCUMENT_TYPE_LABELS.REGISTRATION },
  { value: 'OTHER', label: DOCUMENT_TYPE_LABELS.OTHER },
];

export default function DocumentUpload({
  onUploadSuccess,
  loadId,
  driverId,
  inspectionId,
  incidentId,
  defaultDocumentType,
  maxFiles = 10,
}: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState(defaultDocumentType || 'OTHER');
  const [expiryDate, setExpiryDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compliance document types
  const complianceTypes = ['CDL_LICENSE', 'MEDICAL_CARD', 'INSURANCE', 'REGISTRATION'];
  const showExpiryDate = complianceTypes.includes(documentType);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const newErrors: string[] = [];

    // Check total number of files
    if (selectedFiles.length + files.length > maxFiles) {
      newErrors.push(`Maksimalno je dozvoljeno ${maxFiles} fajlova`);
      setErrors(newErrors);
      return;
    }

    // Validate file sizes
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        newErrors.push(`${file.name} je prevelik (maksimalno 10 MB)`);
        return false;
      }
      return true;
    });

    setErrors(newErrors);
    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrors(['Odaberi barem jedan fajl']);
      return;
    }

    if (!documentType) {
      setErrors(['Odaberi vrstu dokumenta']);
      return;
    }

    setUploading(true);
    setErrors([]);
    const newProgress: { [key: string]: number } = {};

    try {
      // Upload files one by one
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', documentType);

        if (loadId) {
          formData.append('loadId', loadId);
        }

        if (driverId) {
          formData.append('driverId', driverId);
        }

        if (inspectionId) {
          formData.append('inspectionId', inspectionId);
        }

        if (incidentId) {
          formData.append('incidentId', incidentId);
        }

        if (showExpiryDate && expiryDate) {
          formData.append('expiryDate', expiryDate);
        }

        // Upload
        newProgress[file.name] = 50; // Simulate progress
        setProgress({ ...newProgress });

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Slanje nije uspjelo');
        }

        const result = await response.json();
        newProgress[file.name] = 100;
        setProgress({ ...newProgress });

        // Callback za svaki uspješan upload
        if (onUploadSuccess) {
          onUploadSuccess(result.document);
        }
      }

      // Reset form
      setSelectedFiles([]);
      setExpiryDate('');
      setProgress({});

      // Success message
      alert('Dokumenti su uspješno poslani');
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrors([error.message || 'Neuspjelo slanje dokumenata']);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Document Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vrsta dokumenta *
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          disabled={uploading}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry Date (for compliance docs) */}
      {showExpiryDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Datum isteka
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={uploading}
          />
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary-400'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Prevuci fajlove ovdje
        </p>
        <p className="text-sm text-gray-500 mb-4">
          ili klikni za odabir
        </p>
        <p className="text-xs text-gray-400">
          Maksimalna veličina: 10 MB • Dozvoljeno: PDF, slike i Office dokumenti
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Odabrani fajlovi ({selectedFiles.length})
          </h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <FileText className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {uploading && progress[file.name] !== undefined && (
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mx-3">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progress[file.name]}%` }}
                  />
                </div>
              )}

              {/* Remove Button */}
              {!uploading && (
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-700">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className={`
            px-6 py-2.5 rounded-lg font-medium
            transition-all duration-200
            ${uploading || selectedFiles.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-lg'
            }
          `}
        >
          {uploading ? 'Slanje...' : `Pošalji ${selectedFiles.length} fajl(a)`}
        </button>
      </div>
    </div>
  );
}
