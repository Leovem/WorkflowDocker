import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CollaborativeDocument,
  CollaborativeDocumentSession,
  CreateCollaborativeDocumentPayload,
} from '../models/collaborative-document.model';

export interface SaveCollaborativeSnapshotPayload {
  htmlContent: string;
  plainText: string;
  savedByUserId: string;
  savedByUserName: string;
}

export interface CollaborativeSnapshotResponse {
  documentId: string;

  processInstanceId?: string;
  policyId?: string;
  nodeId?: string;
  departmentId?: string;

  versionNumber: number;

  htmlContent: string;
  plainText: string;

  savedByUserId?: string;
  savedByUserName?: string;

  savedAt?: string;
}

export interface CollaborativeDocumentAudit {
  id: string;

  documentId: string;

  processInstanceId?: string;
  policyId?: string;
  nodeId?: string;
  departmentId?: string;

  action: string;

  userId: string;
  userName: string;

  description: string;

  metadata?: Record<string, any>;

  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CollaborativeDocumentApiService {
  private readonly baseUrl = `${environment.apiUrl}/collaborative-documents`;

  constructor(private readonly http: HttpClient) {}

  createDocument(
    payload: CreateCollaborativeDocumentPayload
  ): Observable<CollaborativeDocument> {
    return this.http.post<CollaborativeDocument>(this.baseUrl, payload);
  }

  getDocument(documentId: string): Observable<CollaborativeDocument> {
    return this.http.get<CollaborativeDocument>(
      `${this.baseUrl}/${documentId}`
    );
  }

  getDocumentsByProcessInstance(
    processInstanceId: string
  ): Observable<CollaborativeDocument[]> {
    return this.http.get<CollaborativeDocument[]>(
      `${this.baseUrl}/process-instance/${processInstanceId}`
    );
  }

  getDocumentsByProcessInstanceAndNode(
    processInstanceId: string,
    nodeId: string
  ): Observable<CollaborativeDocument[]> {
    return this.http.get<CollaborativeDocument[]>(
      `${this.baseUrl}/process-instance/${processInstanceId}/node/${nodeId}`
    );
  }

  createSession(
    documentId: string,
    userId: string,
    userName: string,
    userColor?: string
  ): Observable<CollaborativeDocumentSession> {
    return this.http.post<CollaborativeDocumentSession>(
      `${this.baseUrl}/${documentId}/session`,
      {
        userId,
        userName,
        userColor,
      }
    );
  }

  saveSnapshot(
    documentId: string,
    payload: SaveCollaborativeSnapshotPayload
  ): Observable<CollaborativeSnapshotResponse> {
    return this.http.post<CollaborativeSnapshotResponse>(
      `${this.baseUrl}/${documentId}/snapshot`,
      payload
    );
  }

  getSnapshot(documentId: string): Observable<CollaborativeSnapshotResponse> {
    return this.http.get<CollaborativeSnapshotResponse>(
      `${this.baseUrl}/${documentId}/snapshot`
    );
  }

  getVersions(documentId: string): Observable<CollaborativeSnapshotResponse[]> {
    return this.http.get<CollaborativeSnapshotResponse[]>(
      `${this.baseUrl}/${documentId}/versions`
    );
  }

  getAudit(documentId: string): Observable<CollaborativeDocumentAudit[]> {
    return this.http.get<CollaborativeDocumentAudit[]>(
      `${this.baseUrl}/${documentId}/audit`
    );
  }
}