export interface InterpretReportRequest {
  prompt: string;
  usuario_id?: string;
  rol?: string;
}

export interface ReportFilters {
  estado?: string | null;

  policyId?: string | null;
  processInstanceId?: string | null;
  clientId?: string | null;

  nodeId?: string | null;
  departmentId?: string | null;
  requiredDocumentName?: string | null;
  uploadedByUserId?: string | null;

  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export interface ReportQueryParams {
  status?: string | null;

  policyId?: string | null;
  processInstanceId?: string | null;
  clientId?: string | null;

  nodeId?: string | null;
  departmentId?: string | null;
  requiredDocumentName?: string | null;
  uploadedByUserId?: string | null;
}

export interface InterpretReportResponse {
  titulo: string;
  tipo_reporte:
    | 'RESUMEN_GENERAL'
    | 'DOCUMENTOS_POR_ESTADO'
    | 'DOCUMENTOS_POR_TRAMITE'
    | 'AUDITORIA_DOCUMENTAL'
    | 'DESCARGAS_Y_VISUALIZACIONES'
    | 'DOCUMENTOS_PENDIENTES'
    | 'DOCUMENTOS_APROBADOS'
    | 'DOCUMENTOS_OBSERVADOS'
    | 'DOCUMENTOS_RECHAZADOS'
    | 'REPORTE_GENERAL'
    | 'REPORTE_DETALLADO'
    | 'REPORTE_DETALLADO_EXCEL'
    | string;

  filtros: ReportFilters;
  query_params: ReportQueryParams;

  agrupacion?: string | null;
  metricas: string[];

  formato_sugerido: 'DASHBOARD' | 'TABLA' | 'JSON' | 'EXCEL' | 'PDF' | string;
  endpoint_sugerido?: string | null;

  puede_generarse: boolean;
  datos_faltantes: string[];

  explicacion: string;
}