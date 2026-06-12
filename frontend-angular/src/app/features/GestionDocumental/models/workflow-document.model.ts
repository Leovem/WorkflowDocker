export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OBSERVED';

export interface WorkflowDocument {
  id: string;

  policyId: string;
  processInstanceId: string;
  clientId: string;

  nodeId?: string;
  departmentId?: string;

  requiredDocumentId?: string;
  requiredDocumentName?: string;

  originalFileName: string;
  storedFileName: string;
  contentType: string;
  size: number;

  downloadUrl: string;

  uploadedByUserId: string;
  uploadedByUserName: string;

  documentStatus: DocumentStatus | string;
  observation?: string;

  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;

  version: number;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDocumentUploadPayload {
  file: File;

  policyId: string;
  processInstanceId: string;
  clientId: string;

  nodeId?: string;
  departmentId?: string;

  requiredDocumentId?: string;
  requiredDocumentName?: string;

  uploadedByUserId: string;
  uploadedByUserName: string;
}

export interface UpdateDocumentStatusPayload {
  status: DocumentStatus;
  observation?: string;
  reviewedByUserId: string;
  reviewedByUserName: string;
}