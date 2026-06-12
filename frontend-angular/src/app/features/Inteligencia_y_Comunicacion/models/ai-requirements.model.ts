export interface RequirementPolicyContext {
  id?: string;
  nombre: string;
  descripcion?: string;
  requisitos?: string[];
}

export interface IdentifyRequirementsRequest {
  solicitud: string;
  contexto_politicas?: RequirementPolicyContext[];
  cliente_id?: string;
  usuario_id?: string;
}

export interface RequirementItem {
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  tipo_documento: string;
}

export interface IdentifyRequirementsResponse {
  politica_sugerida: string;
  politica_id?: string | null;

  categoria: string;
  descripcion: string;
  confianza: number;

  requisitos: RequirementItem[];
  documentos_esperados: string[];

  datos_faltantes: string[];
  preguntas_sugeridas: string[];

  explicacion: string;
  puede_iniciar_tramite: boolean;
}