export const LOAD_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostupan",
  ASSIGNED: "Dodijeljen",
  ACCEPTED: "Prihvaćen",
  PICKED_UP: "Preuzet",
  IN_TRANSIT: "U transportu",
  DELIVERED: "Isporučen",
  COMPLETED: "Završen",
  CANCELLED: "Otkazan",
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktivan",
  INACTIVE: "Neaktivan",
  VACATION: "Na odmoru",
  ON_VACATION: "Na odmoru",
  SICK_LEAVE: "Bolovanje",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  SENT: "Poslano",
  PAID: "Plaćeno",
  OVERDUE: "Dospjelo",
  VOID: "Stornirano",
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  OPEN: "Otvoren",
  APPROVED: "Odobren",
  REJECTED: "Odbijen",
  PAID: "Plaćen",
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Otvoren",
  IN_REVIEW: "U obradi",
  CLOSED: "Zatvoren",
};

export const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
  MINOR: "Manji",
  MAJOR: "Veći",
  CRITICAL: "Kritičan",
};

export const INSPECTION_TYPE_LABELS: Record<string, string> = {
  PRE_TRIP: "Prije vožnje",
  POST_TRIP: "Poslije vožnje",
};

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  SAFE: "Ispravno",
  UNSAFE: "Neispravno",
  NEEDS_REPAIR: "Potrebna popravka",
};

export const TOLL_PERMIT_TYPE_LABELS: Record<string, string> = {
  VIGNETTE: "Vinjeta",
  TOLLBOX: "Toll box",
  PERMIT: "Dozvola",
  EMISSION_ZONE: "Ekološka zona",
  OTHER: "Ostalo",
};

export const TOLL_PERMIT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktivno",
  EXPIRED: "Isteklo",
  SUSPENDED: "Suspendovano",
};

export const TRAILER_TYPE_LABELS: Record<string, string> = {
  CISTERNA: "Cisterna",
  CAR_HAULER: "Car hauler",
  KOFERAS: "Koferaš",
  OTHER: "Ostalo",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOL: "Tovarni list",
  POD: "Potvrda dostave",
  DAMAGE_REPORT: "Izvještaj o oštećenju",
  LOAD_PHOTO: "Fotografija transporta",
  RATE_CONFIRMATION: "Potvrda cijene",
  FUEL_RECEIPT: "Račun za gorivo",
  CDL_LICENSE: "CDL licenca",
  MEDICAL_CARD: "Medicinska kartica",
  INSURANCE: "Osiguranje",
  REGISTRATION: "Registracija",
  INSPECTION_PHOTO: "Inspekcijska fotografija",
  INCIDENT_PHOTO: "Fotografija incidenta",
  OTHER: "Ostalo",
};

export const DOCUMENT_APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Na čekanju",
  APPROVED: "Odobren",
  REJECTED: "Odbijen",
};

export function getLoadStatusLabel(status: string) {
  return LOAD_STATUS_LABELS[status] || status;
}

export function getDriverStatusLabel(status: string) {
  return DRIVER_STATUS_LABELS[status] || status;
}

export function getInvoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] || status;
}

export function getClaimStatusLabel(status: string) {
  return CLAIM_STATUS_LABELS[status] || status;
}

export function getIncidentStatusLabel(status: string) {
  return INCIDENT_STATUS_LABELS[status] || status;
}

export function getIncidentSeverityLabel(severity: string) {
  return INCIDENT_SEVERITY_LABELS[severity] || severity;
}

export function getInspectionTypeLabel(type: string) {
  return INSPECTION_TYPE_LABELS[type] || type;
}

export function getInspectionStatusLabel(status: string) {
  return INSPECTION_STATUS_LABELS[status] || status;
}

export function getTollPermitTypeLabel(type: string) {
  return TOLL_PERMIT_TYPE_LABELS[type] || type;
}

export function getTollPermitStatusLabel(status: string) {
  return TOLL_PERMIT_STATUS_LABELS[status] || status;
}

export function getTrailerTypeLabel(type: string) {
  return TRAILER_TYPE_LABELS[type] || type;
}

export function getDocumentTypeLabel(type: string) {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

export function getDocumentApprovalStatusLabel(status: string) {
  return DOCUMENT_APPROVAL_STATUS_LABELS[status] || status;
}
