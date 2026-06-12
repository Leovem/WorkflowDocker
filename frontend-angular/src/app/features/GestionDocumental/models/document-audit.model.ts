export type DocumentAuditAction =
  | 'UPLOADED'
  | 'REVIEWED'
  | 'VIEWED'
  | 'DOWNLOADED'
  | 'VERSION_CREATED'
  | string;

export interface DocumentAuditLog {
  id: string;

  documentId: string;

  policyId: string;
  processInstanceId: string;
  clientId: string;

  nodeId?: string;
  departmentId?: string;

  requiredDocumentId?: string;
  requiredDocumentName?: string;

  action: DocumentAuditAction;

  userId?: string;
  userName?: string;

  previousStatus?: string;
  newStatus?: string;

  observation?: string;

  createdAt: string;

  metadata?: Record<string, any>;
}