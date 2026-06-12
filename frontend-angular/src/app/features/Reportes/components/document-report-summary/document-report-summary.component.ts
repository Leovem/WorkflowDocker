import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { DocumentDashboardSummary } from '../../models/document-report.model';

interface SummaryCard {
  label: string;
  value: number;
  description: string;
  type:
    | 'total'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'observed'
    | 'viewed'
    | 'downloaded'
    | 'reviewed';
}

@Component({
  selector: 'app-document-report-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-report-summary.component.html',
})
export class DocumentReportSummaryComponent {
  @Input({ required: true }) summary!: DocumentDashboardSummary;

  get cards(): SummaryCard[] {
    if (!this.summary) {
      return [];
    }

    return [
      {
        label: 'Total documentos',
        value: this.summary.totalDocuments || 0,
        description: 'Documentos registrados',
        type: 'total',
      },
      {
        label: 'Pendientes',
        value: this.summary.pendingDocuments || 0,
        description: 'Esperando revisión',
        type: 'pending',
      },
      {
        label: 'Aprobados',
        value: this.summary.approvedDocuments || 0,
        description: 'Documentos válidos',
        type: 'approved',
      },
      {
        label: 'Rechazados',
        value: this.summary.rejectedDocuments || 0,
        description: 'No aceptados',
        type: 'rejected',
      },
      {
        label: 'Observados',
        value: this.summary.observedDocuments || 0,
        description: 'Requieren corrección',
        type: 'observed',
      },
      {
        label: 'Visualizaciones',
        value: this.summary.totalViewed || 0,
        description: 'Documentos vistos',
        type: 'viewed',
      },
      {
        label: 'Descargas',
        value: this.summary.totalDownloaded || 0,
        description: 'Archivos descargados',
        type: 'downloaded',
      },
      {
        label: 'Revisiones',
        value: this.summary.totalReviewed || 0,
        description: 'Acciones de revisión',
        type: 'reviewed',
      },
    ];
  }

  getCardClass(type: SummaryCard['type']): string {
    const classes: Record<SummaryCard['type'], string> = {
      total: 'border-slate-200 bg-white text-slate-900',
      pending: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      rejected: 'border-red-200 bg-red-50 text-red-800',
      observed: 'border-orange-200 bg-orange-50 text-orange-800',
      viewed: 'border-blue-200 bg-blue-50 text-blue-800',
      downloaded: 'border-purple-200 bg-purple-50 text-purple-800',
      reviewed: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    };

    return classes[type];
  }
}