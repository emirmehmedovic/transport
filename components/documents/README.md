# Documents Components

## 📦 Dostupne Komponente

### 1. DocumentsTab (Recommended)
Kompletan UI za upload i prikaz dokumenata. Najbolji izbor za integraciju.

```tsx
import { DocumentsTab } from '@/components/documents';

<DocumentsTab loadId={loadId} />
```

### 2. DocumentUpload
Drag & drop upload komponenta.

```tsx
import { DocumentUpload } from '@/components/documents';

<DocumentUpload
  loadId={loadId}
  onUploadSuccess={(doc) => console.log(doc)}
/>
```

### 3. DocumentList
Lista dokumenata sa search, filter, download, delete.

```tsx
import { DocumentList } from '@/components/documents';

<DocumentList loadId={loadId} />
```

### 4. DocumentViewer
Modal za pregled slika i PDF-ova.

```tsx
import { DocumentViewer } from '@/components/documents';

<DocumentViewer
  documentId={id}
  fileName="document.pdf"
  mimeType="application/pdf"
  onClose={() => setOpen(false)}
/>
```

## 📚 Puna Dokumentacija

Vidi `/docs/documents-module-integration.md` za kompletnu dokumentaciju sa:
- Integration examples
- API reference
- Permission system
- Testing checklist

## 🎯 Quick Start

Za Load detail page:
```tsx
<DocumentsTab loadId={loadId} showUploadButton={true} />
```

Za Driver detail page:
```tsx
<DocumentsTab driverId={driverId} showUploadButton={true} />
```

## ✅ Features

- ✅ Drag & drop upload
- ✅ Multi-file upload
- ✅ File validation (size, type)
- ✅ Progress indicators
- ✅ Search & filter
- ✅ Download & delete
- ✅ Image & PDF viewer
- ✅ Expiry date tracking
- ✅ Permission-based access
- ✅ Responsive design
