import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { WorkflowDocumentApiService } from '../../services/workflow-document-api.service';
import { DocumentAuditLog } from '../../models/document-audit.model';

@Component({
  selector: 'app-document-audit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-audit.component.html',
})
export class DocumentAuditComponent implements OnChanges {
  @Input({ required: true }) documentId!: string;

  auditLogs: DocumentAuditLog[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(private readonly documentApi: WorkflowDocumentApiService) {}

  ngOnChanges(): void {
    if (this.documentId) {
      this.loadAudit();
    }
  }

  loadAudit(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentApi.getDocumentAudit(this.documentId).subscribe({
      next: (logs) => {
        this.auditLogs = logs;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando auditoría:', error);
        this.errorMessage = 'No se pudo cargar la auditoría del documento.';
        this.isLoading = false;
      },
    });
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      UPLOADED: 'Subido',
      REVIEWED: 'Revisado',
      VIEWED: 'Visualizado',
      DOWNLOADED: 'Descargado',
      VERSION_CREATED: 'Nueva versión',
    };

    return labels[action] || action;
  }

  getActionClass(action: string): string {
    const classes: Record<string, string> = {
      UPLOADED: 'bg-blue-50 text-blue-700 border-blue-200',
      REVIEWED: 'bg-purple-50 text-purple-700 border-purple-200',
      VIEWED: 'bg-slate-50 text-slate-700 border-slate-200',
      DOWNLOADED: 'bg-green-50 text-green-700 border-green-200',
      VERSION_CREATED: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return classes[action] || 'bg-slate-50 text-slate-700 border-slate-200';
  }

  formatMetadata(metadata?: Record<string, any>): string {
    if (!metadata) {
      return '';
    }

    try {
      return JSON.stringify(metadata);
    } catch {
      return '';
    }
  }
}