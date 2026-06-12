import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  UpdateDocumentStatusPayload,
  WorkflowDocument,
  WorkflowDocumentUploadPayload,
} from '../models/workflow-document.model';

import { DocumentAuditLog } from '../models/document-audit.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowDocumentApiService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;

  constructor(private readonly http: HttpClient) {}

  uploadDocument(payload: WorkflowDocumentUploadPayload): Observable<WorkflowDocument> {
    const formData = new FormData();

    formData.append('file', payload.file);
    formData.append('policyId', payload.policyId);
    formData.append('processInstanceId', payload.processInstanceId);
    formData.append('clientId', payload.clientId);
    formData.append('uploadedByUserId', payload.uploadedByUserId);
    formData.append('uploadedByUserName', payload.uploadedByUserName);

    if (payload.nodeId) {
      formData.append('nodeId', payload.nodeId);
    }

    if (payload.departmentId) {
      formData.append('departmentId', payload.departmentId);
    }

    if (payload.requiredDocumentId) {
      formData.append('requiredDocumentId', payload.requiredDocumentId);
    }

    if (payload.requiredDocumentName) {
      formData.append('requiredDocumentName', payload.requiredDocumentName);
    }

    return this.http.post<WorkflowDocument>(`${this.baseUrl}/upload`, formData);
  }

  getAllDocuments(): Observable<WorkflowDocument[]> {
    return this.http.get<WorkflowDocument[]>(this.baseUrl);
  }

  getDocumentById(id: string): Observable<WorkflowDocument> {
    return this.http.get<WorkflowDocument>(`${this.baseUrl}/${id}`);
  }

  getDocumentsByProcessInstance(processInstanceId: string): Observable<WorkflowDocument[]> {
    return this.http.get<WorkflowDocument[]>(
      `${this.baseUrl}/process-instance/${processInstanceId}`
    );
  }

  getDocumentsByClient(clientId: string): Observable<WorkflowDocument[]> {
    return this.http.get<WorkflowDocument[]>(`${this.baseUrl}/client/${clientId}`);
  }

  getDocumentsByPolicy(policyId: string): Observable<WorkflowDocument[]> {
    return this.http.get<WorkflowDocument[]>(`${this.baseUrl}/policy/${policyId}`);
  }

  getDocumentsByProcessInstanceAndNode(
    processInstanceId: string,
    nodeId: string
  ): Observable<WorkflowDocument[]> {
    return this.http.get<WorkflowDocument[]>(
      `${this.baseUrl}/process-instance/${processInstanceId}/node/${nodeId}`
    );
  }

  updateDocumentStatus(
    documentId: string,
    payload: UpdateDocumentStatusPayload
  ): Observable<WorkflowDocument> {
    return this.http.patch<WorkflowDocument>(
      `${this.baseUrl}/${documentId}/status`,
      payload
    );
  }

  registerView(
    documentId: string,
    userId: string,
    userName: string
  ): Observable<WorkflowDocument> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('userName', userName);

    return this.http.post<WorkflowDocument>(
      `${this.baseUrl}/${documentId}/view`,
      null,
      { params }
    );
  }

  getDocumentAudit(documentId: string): Observable<DocumentAuditLog[]> {
    return this.http.get<DocumentAuditLog[]>(`${this.baseUrl}/${documentId}/audit`);
  }

  getDownloadUrl(storedFileName: string, userId: string, userName: string): string {
    const encodedUserId = encodeURIComponent(userId);
    const encodedUserName = encodeURIComponent(userName);

    return `${this.baseUrl}/download/${storedFileName}?userId=${encodedUserId}&userName=${encodedUserName}`;
  }
}