import { prisma } from "./prisma";
import { AuditAction, AuditEntity } from "@prisma/client";

export { AuditAction, AuditEntity };

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
}

/**
 * Kreira audit log entry
 * @param data - Podaci za audit log
 * @returns Promise sa kreiranim audit logom
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes || null,
        ipAddress: data.ipAddress || null,
      },
    });

    console.log(
      `📝 Audit log created: ${data.action} on ${data.entity} (${data.entityId}) by user ${data.userId}`
    );

    return auditLog;
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Ne želimo da blokiramo operaciju ako audit log ne uspije
    // Samo logujemo grešku
    return null;
  }
}

/**
 * Helper funkcija za kreiranje audit loga sa IP adresom iz request-a
 */
export function getClientIp(request: Request): string | undefined {
  // Pokušaj dobiti IP iz različitih headers (proxy-aware)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback na undefined ako nismo mogli dobiti IP
  return undefined;
}

/**
 * Helper funkcija za kreiranje "before/after" change objecta
 * @param before - Staro stanje
 * @param after - Novo stanje
 * @returns Changes object sa before i after
 */
export function createChanges(before: any, after: any) {
  return {
    before,
    after,
  };
}

/**
 * Helper funkcija za kreiranje audit loga za CREATE akciju
 */
export async function auditCreate(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  data: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity,
    entityId,
    changes: {
      after: data,
    },
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za UPDATE akciju
 */
export async function auditUpdate(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  before: any,
  after: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity,
    entityId,
    changes: createChanges(before, after),
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za DELETE akciju
 */
export async function auditDelete(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  data: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity,
    entityId,
    changes: {
      before: data,
    },
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za STATUS_CHANGE akciju
 */
export async function auditStatusChange(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.STATUS_CHANGE,
    entity,
    entityId,
    changes: {
      before: { status: oldStatus },
      after: { status: newStatus },
    },
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za ASSIGNMENT akciju
 */
export async function auditAssignment(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  assignment: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.ASSIGNMENT,
    entity,
    entityId,
    changes: {
      after: assignment,
    },
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za DOCUMENT_UPLOAD akciju
 */
export async function auditDocumentUpload(
  userId: string,
  entityId: string,
  documentInfo: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.DOCUMENT_UPLOAD,
    entity: AuditEntity.DOCUMENT,
    entityId,
    changes: {
      after: documentInfo,
    },
    ipAddress,
  });
}

/**
 * Helper funkcija za kreiranje audit loga za PAYMENT akciju
 */
export async function auditPayment(
  userId: string,
  entityId: string,
  paymentInfo: any,
  ipAddress?: string
) {
  return createAuditLog({
    userId,
    action: AuditAction.PAYMENT,
    entity: AuditEntity.PAY_STUB,
    entityId,
    changes: {
      after: paymentInfo,
    },
    ipAddress,
  });
}
