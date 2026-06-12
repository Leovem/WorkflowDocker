import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../../environments/environment';

import { JarvisApiService } from '../../services/jarvis-api.service';
import { InterpretReportResponse } from '../../models/ai-report.model';
import { DocumentReportSummaryComponent } from '../../../Reportes/components/document-report-summary/document-report-summary.component';
import { DocumentReportTableComponent } from '../../../Reportes/components/document-report-table/document-report-table.component';

import {
  DocumentDashboardSummary,
  DocumentDetailedReport,
  DocumentReportGeneral,
} from '../../../Reportes/models/document-report.model';

interface AiReportMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  interpretation?: InterpretReportResponse;
}

@Component({
  selector: 'app-ai-report-interpreter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentReportSummaryComponent,
    DocumentReportTableComponent,
  ],
  templateUrl: './ai-report-interpreter.component.html',
})
export class AiReportInterpreterComponent {
  prompt = '';

  result: InterpretReportResponse | null = null;

  messages: AiReportMessage[] = [
    {
      role: 'assistant',
      text:
        'Hola, puedo ayudarte a generar reportes documentales. Por ejemplo: "Genera un Excel de documentos rechazados" o "Muéstrame los documentos pendientes".',
    },
  ];

  isLoading = false;
  isExecuting = false;
  isDownloading = false;

  errorMessage = '';
  successMessage = '';

  summaryResult: DocumentDashboardSummary | null = null;
  generalReportResult: DocumentReportGeneral | null = null;
  detailedReportResult: DocumentDetailedReport | null = null;
  rawResult: any = null;

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

  currentRole =
    localStorage.getItem('role') ||
    localStorage.getItem('userRole') ||
    'ADMIN';

  constructor(
    private readonly jarvisApi: JarvisApiService,
    private readonly http: HttpClient
  ) { }

  interpret(): void {
    const text = this.prompt.trim();

    if (!text) {
      this.errorMessage = 'Escribe qué reporte necesitas.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.result = null;
    this.clearResults();

    this.messages.push({
      role: 'user',
      text,
    });

    this.prompt = '';

    this.jarvisApi
      .interpretReport({
        prompt: text,
        usuario_id: this.currentUserId,
        rol: this.currentRole,
      })
      .subscribe({
        next: (response) => {
          console.log('RESPUESTA IA / JARVIS:', response);
          console.log('ENDPOINT SUGERIDO IA:', response.endpoint_sugerido);
          console.log('QUERY PARAMS IA:', response.query_params);

          this.result = response;
          this.isLoading = false;

          this.messages.push({
            role: 'assistant',
            text: 'Entendido. Estoy generando el reporte solicitado.',
          });

          this.executeReportFromInterpretation(response);
        },
        error: (error) => {
          console.error('Error interpretando reporte:', error);
          this.errorMessage = 'No se pudo interpretar la solicitud de reporte.';
          this.isLoading = false;
        },
      });
  }

  executeReportFromInterpretation(result: InterpretReportResponse): void {
    if (!result.puede_generarse) {
      this.errorMessage =
        result.explicacion ||
        'Jarvis indicó que este reporte todavía no puede generarse.';
      return;
    }

    if (result.datos_faltantes?.length) {
      this.errorMessage =
        'Faltan datos para generar el reporte: ' +
        result.datos_faltantes.join(', ');
      return;
    }

    if (!result.endpoint_sugerido) {
      this.errorMessage =
        'Jarvis no devolvió un endpoint válido para generar el reporte.';
      return;
    }

    const backendUrl = this.buildBackendUrl(result.endpoint_sugerido);
    console.log('URL FINAL PARA SPRING BOOT:', backendUrl);
    console.log('FORMATO SUGERIDO:', result.formato_sugerido);

    if (result.formato_sugerido === 'EXCEL') {
      this.downloadExcelFromEndpoint(backendUrl, result);
      return;
    }

    this.loadJsonReportFromEndpoint(backendUrl, result);
  }

  loadJsonReportFromEndpoint(
    url: string,
    interpretation: InterpretReportResponse
  ): void {
    this.isExecuting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get<any>(url).subscribe({
      next: (response) => {
        console.log('RESPUESTA BACKEND SPRING BOOT:', response);
        console.log('ENDPOINT SUGERIDO POR IA:', interpretation.endpoint_sugerido);

        this.isExecuting = false;

        this.mapBackendResponse(interpretation, response);

        console.log('RESULTADOS DESPUÉS DEL MAPEO:', {
          summaryResult: this.summaryResult,
          generalReportResult: this.generalReportResult,
          detailedReportResult: this.detailedReportResult,
          rawResult: this.rawResult,
        });

        this.successMessage = 'Reporte generado correctamente.';

        this.messages.push({
          role: 'system',
          text: 'Reporte generado correctamente.',
        });
      },
      error: (error) => {
        console.error('ERROR CONSULTANDO BACKEND SPRING BOOT:', error);
        console.error('URL QUE FALLÓ:', url);

        this.isExecuting = false;
        this.errorMessage =
          'Jarvis interpretó la solicitud, pero no se pudo consultar el backend.';
      },
    });
  }

  downloadExcelFromEndpoint(
    url: string,
    interpretation: InterpretReportResponse
  ): void {
    this.isDownloading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        console.log('EXCEL RECIBIDO DESDE BACKEND:', blob);
        console.log('TAMAÑO DEL ARCHIVO EXCEL:', blob.size);
        console.log('TIPO DEL ARCHIVO EXCEL:', blob.type);

        this.isDownloading = false;

        const filename = this.buildExcelFileName(interpretation);
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(objectUrl);

        this.successMessage = 'Se inició la descarga del reporte Excel.';

        this.messages.push({
          role: 'system',
          text: `Reporte Excel generado: ${filename}`,
        });
      },
      error: (error) => {
        console.error('Error descargando Excel:', error);
        this.isDownloading = false;
        this.errorMessage =
          'Jarvis interpretó la solicitud, pero no se pudo descargar el Excel.';
      },
    });
  }

  private mapBackendResponse(
    interpretation: InterpretReportResponse,
    response: any
  ): void {
    this.summaryResult = null;
    this.generalReportResult = null;
    this.detailedReportResult = null;
    this.rawResult = response;

    const endpoint = interpretation.endpoint_sugerido || '';

    console.log('MAPEANDO POR ENDPOINT IA:', endpoint);
    console.log('RESPUESTA BACKEND:', response);

    if (endpoint.startsWith('/api/documents/dashboard/summary')) {
      this.summaryResult = response as DocumentDashboardSummary;
      console.log('summaryResult asignado:', this.summaryResult);
      return;
    }

    if (endpoint.startsWith('/api/documents/reports/general')) {
      this.generalReportResult = response as DocumentReportGeneral;
      console.log('generalReportResult asignado:', this.generalReportResult);
      return;
    }

    if (endpoint.startsWith('/api/documents/reports/detailed')) {
      this.detailedReportResult = response as DocumentDetailedReport;
      console.log('detailedReportResult asignado:', this.detailedReportResult);
      return;
    }

    console.warn('Endpoint no reconocido:', endpoint);
  }



  clearChat(): void {
    this.prompt = '';
    this.result = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.clearResults();

    this.messages = [
      {
        role: 'assistant',
        text:
          'Chat reiniciado. Puedes pedirme reportes documentales dinámicos.',
      },
    ];
  }

  clearResults(): void {
    this.summaryResult = null;
    this.generalReportResult = null;
    this.detailedReportResult = null;
    this.rawResult = null;
  }

  useExample(text: string): void {
    this.prompt = text;
  }

  canDownloadExcel(): boolean {
    return (
      !!this.result &&
      this.result.formato_sugerido === 'EXCEL' &&
      this.result.puede_generarse
    );
  }

  getFormatClass(format: string): string {
    const classes: Record<string, string> = {
      DASHBOARD: 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10',
      TABLA: 'border-blue-400/40 text-blue-300 bg-blue-400/10',
      JSON: 'border-slate-400/40 text-slate-300 bg-slate-400/10',
      EXCEL: 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10',
      PDF: 'border-red-400/40 text-red-300 bg-red-400/10',
    };

    return (
      classes[format] ||
      'border-slate-400/40 text-slate-300 bg-slate-400/10'
    );
  }

  getGenerationClass(canGenerate: boolean): string {
    return canGenerate
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
      : 'border-orange-400/40 text-orange-300 bg-orange-400/10';
  }

  private buildBackendUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    if (cleanEndpoint.startsWith('/api/')) {
      const backendRoot = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${backendRoot}${cleanEndpoint}`;
    }

    return `${environment.apiUrl}${cleanEndpoint}`;
  }

  private buildExcelFileName(
    interpretation: InterpretReportResponse
  ): string {
    const queryParams = interpretation.query_params || {};

    if (queryParams.status) {
      return `reporte_documentos_${queryParams.status.toLowerCase()}.xlsx`;
    }

    if (queryParams.processInstanceId) {
      return `reporte_tramite_${queryParams.processInstanceId}.xlsx`;
    }

    if (queryParams.clientId) {
      return `reporte_cliente_${queryParams.clientId}.xlsx`;
    }

    if (queryParams.policyId) {
      return `reporte_politica_${queryParams.policyId}.xlsx`;
    }

    if (queryParams.departmentId) {
      return `reporte_departamento_${queryParams.departmentId}.xlsx`;
    }

    if (queryParams.nodeId) {
      return `reporte_nodo_${queryParams.nodeId}.xlsx`;
    }

    return 'reporte_documental_ia.xlsx';
  }
}