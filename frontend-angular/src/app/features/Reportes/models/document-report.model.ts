export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OBSERVED';

export interface DocumentDashboardSummary {
  totalDocuments: number;

  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  observedDocuments: number;

  totalUploaded: number;
  totalReviewed: number;
  totalViewed: number;
  totalDownloaded: number;
}

export interface DocumentCountByStatus {
  status: DocumentStatus | string;
  total: number;
}

export interface DocumentCountByProcess {
  processInstanceId: string;
  totalDocuments: number;
}

export interface DocumentReportGeneral {
  title: string;
  description: string;
  generatedAt: string;

  summary: DocumentDashboardSummary;
  documentsByStatus: DocumentCountByStatus[];
  documentsByProcess: DocumentCountByProcess[];

  conclusions: string[];
}

export interface DocumentReportDetailItem {
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

export interface DocumentDetailedReport {
  title: string;
  description: string;
  generatedAt: string;

  status?: DocumentStatus | '';
  policyId?: string;
  processInstanceId?: string;
  clientId?: string;

  nodeId?: string;
  departmentId?: string;
  requiredDocumentName?: string;
  uploadedByUserId?: string;

  totalDocuments: number;

  documents: DocumentReportDetailItem[];
}

export interface DocumentReportFilter {
  status?: DocumentStatus | '';

  policyId?: string;
  processInstanceId?: string;
  clientId?: string;

  nodeId?: string;
  departmentId?: string;
  requiredDocumentName?: string;
  uploadedByUserId?: string;
}