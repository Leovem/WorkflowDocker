import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  DocumentVersion,
  DocumentVersionUploadPayload,
} from '../models/document-version.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentVersionApiService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;

  constructor(private readonly http: HttpClient) {}

  uploadNewVersion(
    documentId: string,
    payload: DocumentVersionUploadPayload
  ): Observable<DocumentVersion> {
    const formData = new FormData();

    formData.append('file', payload.file);
    formData.append('uploadedByUserId', payload.uploadedByUserId);
    formData.append('uploadedByUserName', payload.uploadedByUserName);

    if (payload.changeReason) {
      formData.append('changeReason', payload.changeReason);
    }

    return this.http.post<DocumentVersion>(`${this.baseUrl}/${documentId}/versions`, formData);
  }

  getVersions(documentId: string): Observable<DocumentVersion[]> {
    return this.http.get<DocumentVersion[]>(`${this.baseUrl}/${documentId}/versions`);
  }

  getVersion(documentId: string, versionNumber: number): Observable<DocumentVersion> {
    return this.http.get<DocumentVersion>(
      `${this.baseUrl}/${documentId}/versions/${versionNumber}`
    );
  }

  getVersionDownloadUrl(documentId: string, versionNumber: number): string {
    return `${this.baseUrl}/${documentId}/versions/${versionNumber}/download`;
  }
}