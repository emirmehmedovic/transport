import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';

// Konstante za upload
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Dozvoljeni MIME types
const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Office documents
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // Text
  'text/plain': ['.txt'],
} as const;

// Folder mapping po document type
export const DOCUMENT_FOLDERS = {
  BOL: 'documents/bol',
  POD: 'documents/pod',
  DAMAGE_REPORT: 'documents/damage-reports',
  LOAD_PHOTO: 'load-photos',
  RATE_CONFIRMATION: 'documents/rate-confirmations',
  FUEL_RECEIPT: 'documents/fuel-receipts',
  CDL_LICENSE: 'documents/compliance/cdl',
  MEDICAL_CARD: 'documents/compliance/medical',
  INSURANCE: 'documents/compliance/insurance',
  REGISTRATION: 'documents/compliance/registration',
  OTHER: 'documents/other',
} as const;

export type DocumentType = keyof typeof DOCUMENT_FOLDERS;

// Validation rezultat
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Upload rezultat
export interface UploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Sanitizuje filename - uklanja specijalne karaktere
 */
export function sanitizeFilename(filename: string): string {
  // Izvuci ekstenziju
  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = path.basename(filename, ext);

  // Zamijeni sve osim alphanumeric, dash i underscore sa underscore
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_') // Zamijeni multiple underscores sa jednim
    .substring(0, 50); // Limit na 50 karaktera

  // Generate unique suffix
  const uniqueSuffix = uuidv4().substring(0, 8);

  return `${sanitized}_${uniqueSuffix}${ext}`;
}

/**
 * Validira file size
 */
export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }
  return { isValid: true };
}

/**
 * Validira MIME type
 */
export async function validateMimeType(
  buffer: Buffer,
  originalMimeType?: string
): Promise<ValidationResult> {
  try {
    // Koristi file-type za detekciju pravog MIME type-a
    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType && originalMimeType) {
      // Ako ne možemo detektovati, provjeri original MIME type
      if (originalMimeType in ALLOWED_MIME_TYPES) {
        return { isValid: true };
      }
    }

    if (detectedType && detectedType.mime in ALLOWED_MIME_TYPES) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: 'File type not allowed. Allowed types: PDF, images (JPG, PNG, GIF, WEBP), Office documents',
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Could not validate file type',
    };
  }
}

/**
 * Kreira folder strukturu ako ne postoji
 */
export async function ensureUploadDir(subPath: string): Promise<string> {
  const fullPath = path.join(UPLOAD_DIR, subPath);

  if (!existsSync(fullPath)) {
    await mkdir(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Čuva file na disk
 */
export async function saveFile(
  buffer: Buffer,
  documentType: DocumentType,
  originalFilename: string,
  entityId?: string // loadId ili driverId
): Promise<UploadResult> {
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(originalFilename);

  // Odredi folder path
  let folderPath: string = DOCUMENT_FOLDERS[documentType];

  // Ako postoji entityId, kreiraj subfolder
  if (entityId) {
    folderPath = path.join(folderPath, entityId);
  }

  // Osiguraj da folder postoji
  const fullDirPath = await ensureUploadDir(folderPath);

  // Full file path
  const filePath = path.join(folderPath, sanitizedFilename);
  const fullFilePath = path.join(fullDirPath, sanitizedFilename);

  // Sačuvaj file
  await writeFile(fullFilePath, buffer);

  // Detektuj MIME type
  const fileType = await fileTypeFromBuffer(buffer);
  const mimeType = fileType?.mime || 'application/octet-stream';

  return {
    fileName: sanitizedFilename,
    filePath, // Relativni path za bazu
    fileSize: buffer.length,
    mimeType,
  };
}

/**
 * Briše file sa diska
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, filePath);

  if (existsSync(fullPath)) {
    await unlink(fullPath);
  }
}

/**
 * Validira upload request kompletno
 */
export async function validateUpload(
  file: File
): Promise<ValidationResult> {
  // Provjeri size
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  // Konvertuj u buffer za MIME type provjeru
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Provjeri MIME type
  const mimeValidation = await validateMimeType(buffer, file.type);
  if (!mimeValidation.isValid) {
    return mimeValidation;
  }

  return { isValid: true };
}

/**
 * Process upload - kompletan process
 */
export async function processUpload(
  file: File,
  documentType: DocumentType,
  entityId?: string
): Promise<UploadResult> {
  // Validacija
  const validation = await validateUpload(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Konvertuj u buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sačuvaj file
  const result = await saveFile(buffer, documentType, file.name, entityId);

  return result;
}
