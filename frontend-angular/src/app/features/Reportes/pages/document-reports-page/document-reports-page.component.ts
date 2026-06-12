import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DocumentDashboardSummary,
  DocumentDetailedReport,
  DocumentReportFilter,
  DocumentReportGeneral,
} from '../../models/document-report.model';

import { DocumentReportApiService } from '../../services/document-report-api.service';
import { DocumentReportSummaryComponent } from '../../components/document-report-summary/document-report-summary.component';
import { DocumentReportTableComponent } from '../../components/document-report-table/document-report-table.component';

@Component({
  selector: 'app-document-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentReportSummaryComponent,
    DocumentReportTableComponent,

  ],
  templateUrl: './document-reports-page.component.html',
})
export class DocumentReportsPageComponent implements OnInit {
  summary: DocumentDashboardSummary | null = null;
  generalReport: DocumentReportGeneral | null = null;
  detailedReport: DocumentDetailedReport | null = null;

  filter: DocumentReportFilter = this.buildEmptyFilter();

  isLoadingSummary = false;
  isLoadingGeneral = false;
  isLoadingDetailed = false;

  errorMessage = '';

  currentUserId =
    localStorage.getItem('userId') ||
    localStorage.getItem('id') ||
    'user_001';

  currentUserName =
    localStorage.getItem('name') ||
    localStorage.getItem('fullName') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('username') ||
    'Funcionario';

  constructor(private readonly reportApi: DocumentReportApiService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadGeneralReport();
    this.loadDetailedReport();
  }

  loadSummary(): void {
    this.isLoadingSummary = true;
    this.errorMessage = '';

    this.reportApi.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoadingSummary = false;
      },
      error: (error) => {
        console.error('Error cargando resumen:', error);
        this.errorMessage = 'No se pudo cargar el resumen documental.';
        this.isLoadingSummary = false;
      },
    });
  }

  loadGeneralReport(): void {
    this.isLoadingGeneral = true;

    this.reportApi.getGeneralReport().subscribe({
      next: (report) => {
        this.generalReport = report;
        this.isLoadingGeneral = false;
      },
      error: (error) => {
        console.error('Error cargando reporte general:', error);
        this.isLoadingGeneral = false;
      },
    });
  }

  loadDetailedReport(): void {
    this.isLoadingDetailed = true;
    this.errorMessage = '';

    this.reportApi.getDetailedReport(this.filter).subscribe({
      next: (report) => {
        this.detailedReport = report;
        this.isLoadingDetailed = false;
      },
      error: (error) => {
        console.error('Error cargando reporte detallado:', error);
        this.errorMessage = 'No se pudo cargar el reporte detallado.';
        this.isLoadingDetailed = false;
      },
    });
  }

  applyFilters(): void {
    this.loadDetailedReport();
  }

  clearFilters(): void {
    this.filter = this.buildEmptyFilter();
    this.loadDetailedReport();
  }

  downloadExcel(): void {
    this.reportApi.downloadDetailedExcel(this.filter);
  }

  private buildEmptyFilter(): DocumentReportFilter {
    return {
      status: '',
      policyId: '',
      processInstanceId: '',
      clientId: '',
      nodeId: '',
      departmentId: '',
      requiredDocumentName: '',
      uploadedByUserId: '',
    };
  }
}