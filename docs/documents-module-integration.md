# Documents Module - Integration Guide

## 📋 Pregled

Documents module omogućava upload, pregled i download dokumenata povezanih sa loadovima i driverima. Kompletna implementacija uključuje:

### ✅ Implementirano

#### Backend (API Endpoints):
- ✅ `POST /api/documents/upload` - Upload dokumenata
- ✅ `GET /api/documents` - Lista dokumenata sa filterima
- ✅ `GET /api/documents/[id]` - Metadata dokumenta
- ✅ `GET /api/documents/[id]/download` - Download dokumenta
- ✅ `DELETE /api/documents/[id]` - Brisanje dokumenta
- ✅ `GET /api/documents/expiring` - Lista dokumenata koji ističu

#### Frontend Komponente:
- ✅ `DocumentUpload` - Drag & drop upload sa progress bar-om
- ✅ `DocumentList` - Tabela dokumenata sa search i filter
- ✅ `DocumentViewer` - Modal za pregled slika i PDF-ova
- ✅ `DocumentsTab` - Kombinovana komponenta (ready to use)

#### File Upload Sistem:
- ✅ File validation (size, MIME type)
- ✅ Filename sanitization
- ✅ Folder organizacija po document type
- ✅ Subfolder organizacija po loadId/driverId

---

## 🚀 Kako Koristiti

### 1. Integracija na Load Detail Page

Dodaj Documents tab na load detail stranicu:

```tsx
// app/(dashboard)/loads/[id]/page.tsx
import { DocumentsTab } from '@/components/documents';

export default function LoadDetailPage({ params }: { params: { id: string } }) {
  const loadId = params.id;

  return (
    <div className="space-y-6">
      {/* Load info cards */}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button className="py-4 border-b-2 border-primary-500 text-primary-600 font-medium">
              Info
            </button>
            <button className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Vehicles
            </button>
            <button className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Tab content based on active tab */}
          {activeTab === 'documents' && (
            <DocumentsTab
              loadId={loadId}
              showUploadButton={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Integracija na Driver Detail Page

Dodaj Documents tab na driver detail stranicu:

```tsx
// app/(dashboard)/drivers/[id]/page.tsx
import { DocumentsTab } from '@/components/documents';

export default function DriverDetailPage({ params }: { params: { id: string } }) {
  const driverId = params.id;

  return (
    <div className="space-y-6">
      {/* Driver info cards */}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button className="py-4 border-b-2 border-primary-500 text-primary-600 font-medium">
              Info
            </button>
            <button className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Performance
            </button>
            <button className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'documents' && (
            <DocumentsTab
              driverId={driverId}
              showUploadButton={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Standalone Upload (npr. u Modal)

Ako želiš samo upload komponentu:

```tsx
import { DocumentUpload } from '@/components/documents';

<DocumentUpload
  loadId={loadId}
  onUploadSuccess={(document) => {
    console.log('Uploaded:', document);
    // Refresh your data
  }}
  defaultDocumentType="POD"
  maxFiles={5}
/>
```

### 4. Standalone Document List

Ako želiš samo listu dokumenata:

```tsx
import { DocumentList } from '@/components/documents';

<DocumentList
  loadId={loadId}
  onDocumentDeleted={() => {
    // Refresh your data
  }}
/>
```

---

## 🎯 Komponente API

### DocumentsTab

Kombinovana komponenta sa upload i list view.

**Props:**
```typescript
{
  loadId?: string;          // ID loada (opciono)
  driverId?: string;        // ID drivera (opciono)
  defaultView?: 'upload' | 'list';  // Default view (default: 'list')
  showUploadButton?: boolean;       // Prikaži upload button (default: true)
}
```

### DocumentUpload

Drag & drop upload komponenta.

**Props:**
```typescript
{
  onUploadSuccess?: (document: any) => void;  // Callback nakon uspješnog uploada
  loadId?: string;                            // ID loada
  driverId?: string;                          // ID drivera
  defaultDocumentType?: string;               // Default document type
  maxFiles?: number;                          // Max broj fajlova (default: 10)
}
```

**Features:**
- ✅ Drag & drop interface
- ✅ Multi-file upload
- ✅ Progress bar
- ✅ File validation (size, type)
- ✅ Document type selector
- ✅ Expiry date za compliance docs

### DocumentList

Tabela dokumenata sa search i filter.

**Props:**
```typescript
{
  loadId?: string;                        // Filter by load
  driverId?: string;                      // Filter by driver
  onDocumentDeleted?: () => void;         // Callback nakon brisanja
}
```

**Features:**
- ✅ Search po filename
- ✅ Filter po document type
- ✅ Download button
- ✅ Delete button sa confirmation
- ✅ Expiry date warnings (za compliance docs)
- ✅ Pagination ready

### DocumentViewer

Modal za pregled dokumenata.

**Props:**
```typescript
{
  documentId: string;      // ID dokumenta
  fileName: string;        // Ime fajla
  mimeType: string;        // MIME type
  onClose: () => void;     // Close callback
}
```

**Features:**
- ✅ Image preview sa zoom kontrolama
- ✅ PDF viewer (inline)
- ✅ Download button
- ✅ Responsive

---

## 📁 Folder Struktura

Dokumenti se automatski organizuju:

```
uploads/
├── documents/
│   ├── bol/              # Bills of Lading
│   ├── pod/              # Proofs of Delivery
│   ├── damage-reports/   # Damage reports
│   ├── rate-confirmations/
│   ├── fuel-receipts/
│   ├── compliance/
│   │   ├── cdl/          # CDL licenses
│   │   ├── medical/      # Medical cards
│   │   ├── insurance/    # Insurance docs
│   │   └── registration/ # Registration docs
│   └── other/
├── load-photos/
│   └── [loadId]/         # Photos po loadu
│       ├── before/
│       └── after/
└── pay-stubs/
```

---

## 🔐 Permissions

### Admin & Dispatcher:
- ✅ Upload all document types
- ✅ View all documents
- ✅ Delete documents
- ✅ View expiring documents

### Driver:
- ✅ Upload documents za own loads
- ✅ View own documents
- ❌ Cannot delete documents
- ❌ Cannot view other drivers' documents

---

## 🎨 UI Components Used

Ove komponente koriste postojeći design system:
- Tailwind CSS classes
- Lucide React icons
- Primary color scheme (#0ea5e9)
- Shadow i border radius iz design guide-a

---

## ✅ Testing Checklist

### Backend:
- [ ] Test upload sa različitim file type-ovima
- [ ] Test file size validation (>10MB)
- [ ] Test MIME type validation
- [ ] Test download funkc ionalnost
- [ ] Test delete funkcionalnost
- [ ] Test permission checks (Admin, Dispatcher, Driver)
- [ ] Test expiring documents endpoint

### Frontend:
- [ ] Test drag & drop upload
- [ ] Test multi-file upload
- [ ] Test progress bar prikaz
- [ ] Test document type selector
- [ ] Test expiry date input (za compliance docs)
- [ ] Test search funkcionalnost
- [ ] Test filter by type
- [ ] Test download button
- [ ] Test delete confirmation modal
- [ ] Test image viewer sa zoom
- [ ] Test PDF viewer
- [ ] Test responsive design (mobile)

### Integration:
- [ ] Integriši na Load detail page
- [ ] Integriši na Driver detail page
- [ ] Test tab switching
- [ ] Test data refresh nakon upload/delete
- [ ] Test sa realnim dokumentima

---

## 🚨 Important Notes

### Security:
- ✅ Svi API endpoints su zaštićeni autentifikacijom
- ✅ File validation na backend-u (ne samo frontend)
- ✅ Filename sanitization za security
- ✅ Permission checks po rolama

### Performance:
- Optimizuj images prije uploada (možeš dodati compression)
- Consider lazy loading za document list
- Pagination je spremna za implementaciju

### Future Enhancements:
- [ ] Thumbnail generation za images
- [ ] OCR za text extraction iz PDF-ova
- [ ] Batch download (zip)
- [ ] Document versioning
- [ ] Digital signatures
- [ ] Telegram notifications za uploaded documents

---

## 📞 Support

Za pitanja ili probleme:
1. Provjeri ovu dokumentaciju
2. Provjeri `/lib/fileUpload.ts` za helper funkcije
3. Provjeri API endpoints u `/app/api/documents/`

---

**Verzija:** 1.0
**Datum:** November 2024
**Status:** ✅ Ready for Production
