import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { DocumentReportApiService } from '../../services/document-report-api.service';
import {
  DocumentReportDetailItem,
  DocumentStatus,
} from '../../models/document-report.model';

@Component({
  selector: 'app-document-report-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-report-table.component.html',
})
export class DocumentReportTableComponent {
  @Input() documents: DocumentReportDetailItem[] = [];

  @Input() currentUserId = 'user_001';
  @Input() currentUserName = 'Funcionario';

  constructor(private readonly reportApi: DocumentReportApiService) {}

  downloadDocument(document: DocumentReportDetailItem): void {
    if (!document?.storedFileName) {
      console.warn('El documento no tiene storedFileName:', document);
      return;
    }

    const url = this.reportApi.getDocumentDownloadUrl(
      document.storedFileName,
      this.currentUserId,
      this.currentUserName
    );

    window.open(url, '_blank');
  }

  formatSize(size: number): string {
    if (!size || size <= 0) {
      return '0 KB';
    }

    const kb = size / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }

  getStatusLabel(status: DocumentStatus | string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      OBSERVED: 'Observado',
    };

    return labels[status] || status || 'Sin estado';
  }

  getStatusClass(status: DocumentStatus | string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
      OBSERVED: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return classes[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  }

  getShortId(value?: string): string {
    if (!value) {
      return '—';
    }

    return value.length > 10 ? `${value.slice(0, 8)}...` : value;
  }

  getRequiredDocumentName(document: DocumentReportDetailItem): string {
    return (
      document.requiredDocumentName ||
      document.requiredDocumentId ||
      'Sin requisito'
    );
  }

  getUploaderName(document: DocumentReportDetailItem): string {
    return (
      document.uploadedByUserName ||
      document.uploadedByUserId ||
      'Sin usuario'
    );
  }

  getReviewerName(document: DocumentReportDetailItem): string {
    return (
      document.reviewedByUserName ||
      document.reviewedByUserId ||
      'Sin revisión'
    );
  }

  hasObservation(document: DocumentReportDetailItem): boolean {
    return !!document.observation?.trim();
  }

  getContentTypeLabel(contentType: string): string {
    if (!contentType) {
      return 'Desconocido';
    }

    const map: Record<string, string> = {
      'application/pdf': 'PDF',
      'image/png': 'PNG',
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'Word',
      'text/plain': 'TXT',
      'audio/mpeg': 'Audio',
      'video/mp4': 'Video',
    };

    return map[contentType] || contentType;
  }
}