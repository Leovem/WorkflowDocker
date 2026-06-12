export interface ClassificationPolicyContext {
  id?: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  palabras_clave?: string[];
}

export interface ClassifyRequest {
  solicitud: string;
  contexto_politicas?: ClassificationPolicyContext[];
  cliente_id?: string;
  usuario_id?: string;
}

export interface ClassifyResponse {
  tipo_solicitud: string;
  categoria: string;
  politica_sugerida: string;
  politica_id?: string | null;

  prioridad_sugerida: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE' | string;
  confianza: number;

  palabras_clave: string[];
  requiere_revision_humana: boolean;

  explicacion: string;
}