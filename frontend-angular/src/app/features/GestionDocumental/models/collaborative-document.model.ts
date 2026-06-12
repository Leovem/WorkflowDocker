export interface CollaborativeDocument {
  id: string;
  title: string;

  workflowDocumentId?: string | null;

  processInstanceId?: string;
  policyId?: string;

  nodeId?: string;
  departmentId?: string;

  createdByUserId?: string;
  createdByUserName?: string;

  createdAt?: string;
  updatedAt?: string;

  active?: boolean;
}

export interface CollaborativeDocumentSession {
  documentId: string;
  roomName: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface CreateCollaborativeDocumentPayload {
  title: string;

  workflowDocumentId?: string | null;

  processInstanceId?: string;
  policyId?: string;

  nodeId?: string;
  departmentId?: string;

  createdByUserId: string;
  createdByUserName: string;
}