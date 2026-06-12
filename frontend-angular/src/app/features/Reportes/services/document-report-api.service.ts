import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  DocumentCountByProcess,
  DocumentCountByStatus,
  DocumentDashboardSummary,
  DocumentDetailedReport,
  DocumentReportFilter,
  DocumentReportGeneral,
} from '../models/document-report.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentReportApiService {
  private readonly documentsBaseUrl = `${environment.apiUrl}/documents`;
  private readonly reportsBaseUrl = `${environment.apiUrl}/documents/reports`;
  private readonly dashboardBaseUrl = `${environment.apiUrl}/documents/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getDashboardSummary(): Observable<DocumentDashboardSummary> {
    return this.http.get<DocumentDashboardSummary>(
      `${this.dashboardBaseUrl}/summary`
    );
  }

  getDocumentsByStatus(): Observable<DocumentCountByStatus[]> {
    return this.http.get<DocumentCountByStatus[]>(
      `${this.dashboardBaseUrl}/by-status`
    );
  }

  getDocumentsByProcess(): Observable<DocumentCountByProcess[]> {
    return this.http.get<DocumentCountByProcess[]>(
      `${this.dashboardBaseUrl}/by-process`
    );
  }

  getGeneralReport(): Observable<DocumentReportGeneral> {
    return this.http.get<DocumentReportGeneral>(
      `${this.reportsBaseUrl}/general`
    );
  }

  getDetailedReport(
    filter: DocumentReportFilter
  ): Observable<DocumentDetailedReport> {
    const params = this.buildFilterParams(filter);

    return this.http.get<DocumentDetailedReport>(
      `${this.reportsBaseUrl}/detailed`,
      { params }
    );
  }

  downloadDetailedExcel(filter: DocumentReportFilter): void {
    const params = this.buildFilterParams(filter);

    this.http
      .get(`${this.reportsBaseUrl}/detailed/excel`, {
        params,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const fileName = this.buildExcelFileName(filter);
          this.downloadBlob(blob, fileName);
        },
        error: (error) => {
          console.error('Error descargando Excel:', error);
        },
      });
  }

  getDocumentDownloadUrl(
    storedFileName: string,
    userId: string,
    userName: string
  ): string {
    const encodedStoredFileName = encodeURIComponent(storedFileName);
    const encodedUserId = encodeURIComponent(userId);
    const encodedUserName = encodeURIComponent(userName);

    return `${this.documentsBaseUrl}/download/${encodedStoredFileName}?userId=${encodedUserId}&userName=${encodedUserName}`;
  }

  private buildFilterParams(filter: DocumentReportFilter): HttpParams {
    let params = new HttpParams();

    if (!filter) {
      return params;
    }

    if (filter.status) {
      params = params.set('status', filter.status);
    }

    if (filter.policyId?.trim()) {
      params = params.set('policyId', filter.policyId.trim());
    }

    if (filter.processInstanceId?.trim()) {
      params = params.set(
        'processInstanceId',
        filter.processInstanceId.trim()
      );
    }

    if (filter.clientId?.trim()) {
      params = params.set('clientId', filter.clientId.trim());
    }

    if (filter.nodeId?.trim()) {
      params = params.set('nodeId', filter.nodeId.trim());
    }

    if (filter.departmentId?.trim()) {
      params = params.set('departmentId', filter.departmentId.trim());
    }

    if (filter.requiredDocumentName?.trim()) {
      params = params.set(
        'requiredDocumentName',
        filter.requiredDocumentName.trim()
      );
    }

    if (filter.uploadedByUserId?.trim()) {
      params = params.set(
        'uploadedByUserId',
        filter.uploadedByUserId.trim()
      );
    }

    return params;
  }

  private buildExcelFileName(filter: DocumentReportFilter): string {
    if (filter.status) {
      return `reporte_documentos_${filter.status.toLowerCase()}.xlsx`;
    }

    if (filter.processInstanceId) {
      return `reporte_tramite_${filter.processInstanceId}.xlsx`;
    }

    if (filter.clientId) {
      return `reporte_cliente_${filter.clientId}.xlsx`;
    }

    if (filter.policyId) {
      return `reporte_politica_${filter.policyId}.xlsx`;
    }

    if (filter.departmentId) {
      return `reporte_departamento_${filter.departmentId}.xlsx`;
    }

    if (filter.nodeId) {
      return `reporte_nodo_${filter.nodeId}.xlsx`;
    }

    return 'reporte_documental.xlsx';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    window.URL.revokeObjectURL(url);
  }
}