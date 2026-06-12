export interface DocumentVersion {
  id: string;
  documentId: string;

  versionNumber: number;

  originalFileName: string;
  storedFileName: string;
  contentType: string;
  size: number;

  downloadUrl: string;

  uploadedByUserId: string;
  uploadedByUserName: string;

  changeReason?: string;

  createdAt: string;
}

export interface DocumentVersionUploadPayload {
  file: File;
  uploadedByUserId: string;
  uploadedByUserName: string;
  changeReason?: string;
}