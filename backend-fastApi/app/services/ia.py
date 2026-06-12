from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from urllib.parse import urlencode
import json

from app.services.modelo import (
    jarvis_assistant,
    generate_content,
    analizar_bitacora_con_ia,
)

ia_router = APIRouter()


# ============================================================
# MODELOS BASE
# ============================================================

class BitacoraEntry(BaseModel):
    action: str
    nodeName: str
    policyName: str
    timing: Dict[str, Any]
    user: Dict[str, Any]

    id: Optional[str] = None
    instanceId: Optional[str] = None
    nodeId: Optional[str] = None
    policyId: Optional[str] = None
    hasMultimedia: Optional[bool] = None


class SmartFillRequest(BaseModel):
    transcription: str
    fields: List[str]


class DiagramSnapshot(BaseModel):
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    swimlanes: List[Dict[str, Any]] = Field(default_factory=list)
    globalRequirements: Optional[Dict[str, Any]] = None
    workflow: Optional[Dict[str, Any]] = None
    jointEngineState: Optional[Dict[str, Any]] = None
    policy: Optional[Dict[str, Any]] = None


class CopilotRequest(BaseModel):
    prompt: str
    currentDiagram: DiagramSnapshot


# ============================================================
# MODELOS PARA IDENTIFICACIÓN DE REQUISITOS
# ============================================================

class RequirementPolicyContext(BaseModel):
    id: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    requisitos: Optional[List[str]] = None


class IdentifyRequirementsRequest(BaseModel):
    solicitud: str
    contexto_politicas: Optional[List[RequirementPolicyContext]] = None
    cliente_id: Optional[str] = None
    usuario_id: Optional[str] = None


# ============================================================
# MODELOS PARA REPORTES DINÁMICOS
# ============================================================

class ReportPromptRequest(BaseModel):
    prompt: str
    usuario_id: Optional[str] = None
    rol: Optional[str] = None


class ReportInterpretationResponse(BaseModel):
    titulo: str
    tipo_reporte: str
    filtros: Dict[str, Any]
    query_params: Dict[str, Any] = Field(default_factory=dict)
    agrupacion: Optional[str] = None
    metricas: List[str]
    formato_sugerido: str
    explicacion: str
    endpoint_sugerido: Optional[str] = None
    puede_generarse: bool
    datos_faltantes: List[str] = Field(default_factory=list)


# ============================================================
# MODELOS PARA CLASIFICACIÓN DE SOLICITUDES
# ============================================================

class ClassificationPolicyContext(BaseModel):
    id: Optional[str] = None
    nombre: str
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    palabras_clave: Optional[List[str]] = None


class ClassifyRequest(BaseModel):
    solicitud: str
    contexto_politicas: Optional[List[ClassificationPolicyContext]] = None
    cliente_id: Optional[str] = None
    usuario_id: Optional[str] = None


class ClassifyResponse(BaseModel):
    tipo_solicitud: str
    categoria: str
    politica_sugerida: str
    politica_id: Optional[str] = None
    prioridad_sugerida: str
    confianza: float
    palabras_clave: List[str]
    requiere_revision_humana: bool
    explicacion: str


# ============================================================
# UTILIDADES
# ============================================================

def model_to_dict(model: BaseModel) -> Dict[str, Any]:
    """
    Compatible con Pydantic v1 y v2.
    """
    if hasattr(model, "model_dump"):
        return model.model_dump()

    return model.dict()


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """
    Limpia y convierte una respuesta de Gemini a JSON.
    Sirve por si la IA devuelve ```json o texto extra.
    """
    if not raw_text:
        raise ValueError("La IA devolvió una respuesta vacía")

    cleaned = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError("La respuesta de IA no contiene un JSON válido")

        return json.loads(cleaned[start:end + 1])


def has_text(value: Optional[str]) -> bool:
    return value is not None and str(value).strip() != ""


def normalize_optional_string(value: Any) -> Optional[str]:
    if value is None:
        return None

    text = str(value).strip()

    if not text or text.lower() == "null":
        return None

    return text


def build_report_endpoint(base_endpoint: str, query_params: Dict[str, Any]) -> str:
    clean_params = {}

    for key, value in query_params.items():
        normalized_value = normalize_optional_string(value)

        if normalized_value is not None:
            clean_params[key] = normalized_value

    if not clean_params:
        return base_endpoint

    return f"{base_endpoint}?{urlencode(clean_params)}"


def normalize_status_from_prompt(prompt: str) -> Optional[str]:
    prompt_lower = prompt.lower()

    if "rechazad" in prompt_lower or "rechazo" in prompt_lower:
        return "REJECTED"

    if "pendient" in prompt_lower or "sin revisar" in prompt_lower:
        return "PENDING"

    if "aprobad" in prompt_lower or "válid" in prompt_lower or "valid" in prompt_lower:
        return "APPROVED"

    if (
        "observad" in prompt_lower
        or "observación" in prompt_lower
        or "observacion" in prompt_lower
        or "corregir" in prompt_lower
        or "corrección" in prompt_lower
        or "correccion" in prompt_lower
    ):
        return "OBSERVED"

    return None


def type_from_status(status: Optional[str]) -> Optional[str]:
    if status == "PENDING":
        return "DOCUMENTOS_PENDIENTES"

    if status == "APPROVED":
        return "DOCUMENTOS_APROBADOS"

    if status == "REJECTED":
        return "DOCUMENTOS_RECHAZADOS"

    if status == "OBSERVED":
        return "DOCUMENTOS_OBSERVADOS"

    return None


def metrics_from_status(status: Optional[str]) -> List[str]:
    if status == "PENDING":
        return ["pendingDocuments", "totalDocuments"]

    if status == "APPROVED":
        return ["approvedDocuments", "totalDocuments"]

    if status == "REJECTED":
        return ["rejectedDocuments", "totalDocuments"]

    if status == "OBSERVED":
        return ["observedDocuments", "totalDocuments"]

    return ["totalDocuments"]


# ============================================================
# COPILOT DEL DIAGRAMA
# ============================================================

@ia_router.post("/copilot/ask")
async def ask_copilot(request: CopilotRequest):
    """
    Recibe el diagrama actual y el prompt del usuario.
    Devuelve una respuesta estructurada para aplicar o sugerir cambios.
    """
    print(f"📥 ChatBot escuchando -> Comando: {request.prompt}")
    print(f"📊 Analizando diagrama con {len(request.currentDiagram.nodes)} nodos.")

    try:
        diagram_dict = model_to_dict(request.currentDiagram)

        respuesta_jarvis = jarvis_assistant(
            user_prompt=request.prompt,
            current_diagram=diagram_dict,
        )

        print("📤 ChatBot respondió con éxito.")
        return respuesta_jarvis

    except Exception as e:
        print(f"❌ Error en la ruta /copilot/ask: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error de comunicación con el asistente IA.",
        )


# ============================================================
# SMART FILL DE FORMULARIOS
# ============================================================

@ia_router.post("/jarvis/smart-fill")
async def smart_form_fill(req: SmartFillRequest):
    system_prompt = f"""
Eres ChatBot, un asistente de extracción de datos para formularios dinámicos.

El usuario narró un caso por voz.

TRANSCRIPCIÓN:
"{req.transcription}"

CAMPOS DEL FORMULARIO:
{json.dumps(req.fields, ensure_ascii=False)}

REGLAS:
1. Si la narración menciona algo que encaja en un campo, asígnalo.
2. Si un campo no se menciona, pon su valor como "".
3. Las claves del JSON deben ser exactamente los nombres de los campos recibidos.
4. Responde únicamente con JSON válido.
5. No uses markdown.
"""

    print(f"📥 Smart fill transcripción: {req.transcription}")
    print(f"📋 Campos a llenar: {req.fields}")

    try:
        response = generate_content(system_prompt)
        return clean_json_response(response.text)

    except Exception as e:
        print(f"❌ Error llenando formulario con IA: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar el formulario automáticamente.",
        )


# ============================================================
# ANÁLISIS DE BITÁCORA / MÉTRICAS
# ============================================================

@ia_router.post("/jarvis/analisis")
async def jarvis_analisis(bitacora: List[BitacoraEntry]):
    total_tareas = len(bitacora)

    if total_tareas == 0:
        return {
            "stats": {
                "promedio": 0,
                "total": 0,
                "anomalia": None,
            },
            "jarvis_speech": "No existen tareas suficientes para analizar la bitácora.",
        }

    try:
        tiempos = [
            float(tarea.timing.get("durationMinutes", 0))
            for tarea in bitacora
        ]

        promedio = sum(tiempos) / total_tareas if total_tareas > 0 else 0

        tarea_lenta = max(
            bitacora,
            key=lambda tarea: float(tarea.timing.get("durationMinutes", 0)),
        )

        resumen = (
            f"Se procesaron {total_tareas} tareas. "
            f"El tiempo promedio es {promedio:.2f} minutos. "
            f"La tarea más lenta fue '{tarea_lenta.nodeName}' "
            f"por {tarea_lenta.user.get('name', 'Usuario desconocido')} "
            f"con {tarea_lenta.timing.get('durationMinutes', 0)} minutos."
        )

        response = analizar_bitacora_con_ia(resumen)

        try:
            comentario_ia = response.text
        except Exception as e:
            print(f"Error extrayendo texto de Gemini: {e}")
            comentario_ia = "No se pudo generar comentario de IA."

        return {
            "stats": {
                "promedio": promedio,
                "total": total_tareas,
                "anomalia": tarea_lenta,
            },
            "jarvis_speech": comentario_ia,
        }

    except Exception as e:
        print(f"❌ Error analizando bitácora: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo analizar la bitácora.",
        )


# ============================================================
# IDENTIFICACIÓN DE REQUISITOS
# ============================================================

@ia_router.post("/jarvis/identificar-requisitos")
async def identificar_requisitos(req: IdentifyRequirementsRequest):
    """
    Analiza una solicitud y determina:
    - política de negocio sugerida
    - categoría del trámite
    - requisitos
    - documentos esperados
    - datos faltantes
    - preguntas sugeridas
    """
    politicas_contexto = []

    if req.contexto_politicas:
        politicas_contexto = [
            model_to_dict(politica)
            for politica in req.contexto_politicas
        ]

    system_prompt = f"""
Eres ChatBot, un agente inteligente especializado en políticas de negocio, gestión documental y workflows institucionales.

Tu tarea es analizar la solicitud de un cliente o funcionario y determinar qué política de negocio corresponde iniciar.

SOLICITUD DEL CLIENTE O FUNCIONARIO:
"{req.solicitud}"

CLIENTE ID:
"{req.cliente_id or 'No especificado'}"

USUARIO ID:
"{req.usuario_id or 'No especificado'}"

POLÍTICAS DE NEGOCIO DISPONIBLES:
{json.dumps(politicas_contexto, ensure_ascii=False, indent=2)}

REGLAS:
1. Responde únicamente con JSON válido.
2. No uses markdown.
3. Si existen políticas disponibles, prioriza elegir una de ellas.
4. Si no existe suficiente información, baja la confianza y pide datos faltantes.
5. Los requisitos deben ser claros y asociados a documentos o datos.
6. El campo confianza debe estar entre 0 y 1.
7. El campo puede_iniciar_tramite será true solo si la solicitud tiene información suficiente para iniciar.
8. No inventes politica_id si no viene en el contexto.

ESTRUCTURA EXACTA:
{{
  "politica_sugerida": "Nombre de la política de negocio",
  "politica_id": "ID de la política si existe, si no null",
  "categoria": "Categoría del trámite",
  "descripcion": "Descripción breve del trámite identificado",
  "confianza": 0.85,
  "requisitos": [
    {{
      "nombre": "Nombre del requisito",
      "descripcion": "Descripción del requisito",
      "obligatorio": true,
      "tipo_documento": "PDF|WORD|EXCEL|IMAGEN|VIDEO|AUDIO|DATO|DOCUMENTO"
    }}
  ],
  "documentos_esperados": ["Documento 1", "Documento 2"],
  "datos_faltantes": ["Dato faltante 1"],
  "preguntas_sugeridas": ["Pregunta 1"],
  "explicacion": "Explicación breve de por qué se eligió esa política",
  "puede_iniciar_tramite": true
}}
"""

    print(f"📥 Identificando requisitos para solicitud: {req.solicitud}")

    try:
        response = generate_content(system_prompt)
        result = clean_json_response(response.text)

        print("📤 Requisitos identificados correctamente.")
        return result

    except Exception as e:
        print(f"❌ Error identificando requisitos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo identificar la política de negocio ni sus requisitos.",
        )


# ============================================================
# REPORTES DINÁMICOS
# ============================================================

def normalize_report_interpretation(prompt: str, result: Dict[str, Any]) -> Dict[str, Any]:
    prompt_lower = prompt.lower()

    filtros = result.get("filtros") or {}
    query_params = result.get("query_params") or {}
    datos_faltantes = result.get("datos_faltantes") or []

    detected_status = normalize_status_from_prompt(prompt)
    current_status = (
        query_params.get("status")
        or filtros.get("estado")
        or detected_status
    )

    status = normalize_optional_string(current_status)

    if status:
        status = status.upper()

    tipo_reporte = result.get("tipo_reporte") or type_from_status(status)

    if status in ["PENDING", "APPROVED", "REJECTED", "OBSERVED"]:
        tipo_reporte = type_from_status(status)

    wants_excel = "excel" in prompt_lower or "xlsx" in prompt_lower
    wants_pdf = "pdf" in prompt_lower

    wants_summary = (
        "resumen" in prompt_lower
        or "dashboard" in prompt_lower
        or "general" in prompt_lower
    )

    wants_detail = (
        "detalle" in prompt_lower
        or "detallado" in prompt_lower
        or "listado" in prompt_lower
        or "lista" in prompt_lower
        or "tabla" in prompt_lower
        or "documentos" in prompt_lower
        or "archivo" in prompt_lower
        or "archivos" in prompt_lower
    )

    wants_by_status = (
        "por estado" in prompt_lower
        or "distribución" in prompt_lower
        or "distribucion" in prompt_lower
    )

    wants_by_process = (
        "por trámite" in prompt_lower
        or "por tramite" in prompt_lower
        or "agrupado por trámite" in prompt_lower
        or "agrupados por trámite" in prompt_lower
        or "agrupado por tramite" in prompt_lower
        or "agrupados por tramite" in prompt_lower
    )

    wants_downloads_views = (
        "descarga" in prompt_lower
        or "descargas" in prompt_lower
        or "visualización" in prompt_lower
        or "visualizaciones" in prompt_lower
        or "visualizacion" in prompt_lower
        or "visualizaciones" in prompt_lower
    )

    supported_query_keys = [
        "status",
        "policyId",
        "processInstanceId",
        "clientId",
        "nodeId",
        "departmentId",
        "requiredDocumentName",
        "uploadedByUserId",
    ]

    normalized_query_params = {}

    for key in supported_query_keys:
        value = query_params.get(key)

        if value is None:
            value = filtros.get(key)

        normalized_query_params[key] = normalize_optional_string(value)

    if status in ["PENDING", "APPROVED", "REJECTED", "OBSERVED"]:
        normalized_query_params["status"] = status

    if wants_by_process:
        result["agrupacion"] = "processInstanceId"

    # Datos faltantes cuando el usuario pide filtro, pero no da ID o valor concreto.
    if "por cliente" in prompt_lower and not normalized_query_params.get("clientId"):
        if "clientId" not in datos_faltantes:
            datos_faltantes.append("clientId")

    if ("por trámite" in prompt_lower or "por tramite" in prompt_lower) and not normalized_query_params.get("processInstanceId"):
        if not wants_by_process and "processInstanceId" not in datos_faltantes:
            datos_faltantes.append("processInstanceId")

    if ("por política" in prompt_lower or "por politica" in prompt_lower) and not normalized_query_params.get("policyId"):
        if "policyId" not in datos_faltantes:
            datos_faltantes.append("policyId")

    if "por departamento" in prompt_lower and not normalized_query_params.get("departmentId"):
        if "departmentId" not in datos_faltantes:
            datos_faltantes.append("departmentId")

    if "por nodo" in prompt_lower and not normalized_query_params.get("nodeId"):
        if "nodeId" not in datos_faltantes:
            datos_faltantes.append("nodeId")

    if (
        "documento requerido" in prompt_lower
        or "requisito documental" in prompt_lower
        or "por requisito" in prompt_lower
    ) and not normalized_query_params.get("requiredDocumentName"):
        if "requiredDocumentName" not in datos_faltantes:
            datos_faltantes.append("requiredDocumentName")

    # Decisión final de endpoint.
    if wants_pdf:
        result["formato_sugerido"] = "PDF"
        result["puede_generarse"] = False
        result["endpoint_sugerido"] = None
        result["explicacion"] = (
            "El usuario solicitó PDF, pero actualmente el backend documental "
            "solo genera reportes en JSON y Excel."
        )

    elif wants_excel:
        result["formato_sugerido"] = "EXCEL"
        result["tipo_reporte"] = tipo_reporte or "REPORTE_DETALLADO_EXCEL"
        result["endpoint_sugerido"] = build_report_endpoint(
            "/api/documents/reports/detailed/excel",
            normalized_query_params,
        )
        result["puede_generarse"] = True

    elif wants_downloads_views:
        result["tipo_reporte"] = "DESCARGAS_Y_VISUALIZACIONES"
        result["formato_sugerido"] = "DASHBOARD"
        result["endpoint_sugerido"] = "/api/documents/dashboard/summary"
        result["puede_generarse"] = True
        result["metricas"] = ["totalViewed", "totalDownloaded"]

    elif wants_by_status and not wants_detail:
        result["tipo_reporte"] = "DOCUMENTOS_POR_ESTADO"
        result["formato_sugerido"] = "DASHBOARD"
        result["endpoint_sugerido"] = "/api/documents/dashboard/by-status"
        result["puede_generarse"] = True

    elif wants_by_process and not status and not wants_detail:
        result["tipo_reporte"] = "DOCUMENTOS_POR_TRAMITE"
        result["formato_sugerido"] = "DASHBOARD"
        result["agrupacion"] = "processInstanceId"
        result["endpoint_sugerido"] = "/api/documents/dashboard/by-process"
        result["puede_generarse"] = True

    elif wants_summary and not status and not wants_detail:
        if "conclusiones" in prompt_lower or "completo" in prompt_lower:
            result["tipo_reporte"] = "REPORTE_GENERAL"
            result["formato_sugerido"] = "JSON"
            result["endpoint_sugerido"] = "/api/documents/reports/general"
        else:
            result["tipo_reporte"] = "RESUMEN_GENERAL"
            result["formato_sugerido"] = "DASHBOARD"
            result["endpoint_sugerido"] = "/api/documents/dashboard/summary"

        result["puede_generarse"] = True

    elif status or wants_detail:
        result["tipo_reporte"] = tipo_reporte or "REPORTE_DETALLADO"
        result["formato_sugerido"] = result.get("formato_sugerido") or "TABLA"
        result["endpoint_sugerido"] = build_report_endpoint(
            "/api/documents/reports/detailed",
            normalized_query_params,
        )
        result["puede_generarse"] = True

    else:
        result["tipo_reporte"] = result.get("tipo_reporte") or "REPORTE_GENERAL"
        result["formato_sugerido"] = result.get("formato_sugerido") or "JSON"
        result["endpoint_sugerido"] = result.get("endpoint_sugerido") or "/api/documents/reports/general"
        result["puede_generarse"] = True

    if not result.get("metricas"):
        if result.get("tipo_reporte") == "DESCARGAS_Y_VISUALIZACIONES":
            result["metricas"] = ["totalViewed", "totalDownloaded"]
        elif result.get("tipo_reporte") == "RESUMEN_GENERAL":
            result["metricas"] = [
                "totalDocuments",
                "pendingDocuments",
                "approvedDocuments",
                "rejectedDocuments",
                "observedDocuments",
                "totalUploaded",
                "totalReviewed",
                "totalViewed",
                "totalDownloaded",
            ]
        else:
            result["metricas"] = metrics_from_status(status)

    result["filtros"] = {
        "estado": normalized_query_params.get("status"),
        "policyId": normalized_query_params.get("policyId"),
        "processInstanceId": normalized_query_params.get("processInstanceId"),
        "clientId": normalized_query_params.get("clientId"),
        "nodeId": normalized_query_params.get("nodeId"),
        "departmentId": normalized_query_params.get("departmentId"),
        "requiredDocumentName": normalized_query_params.get("requiredDocumentName"),
        "uploadedByUserId": normalized_query_params.get("uploadedByUserId"),
        "fechaInicio": filtros.get("fechaInicio"),
        "fechaFin": filtros.get("fechaFin"),
    }

    result["query_params"] = normalized_query_params
    result["agrupacion"] = result.get("agrupacion")
    result["datos_faltantes"] = datos_faltantes

    if not result.get("titulo"):
        result["titulo"] = "Reporte documental dinámico"

    if not result.get("explicacion"):
        result["explicacion"] = (
            "La solicitud fue interpretada y asociada a los endpoints documentales disponibles."
        )

    return result


@ia_router.post("/jarvis/interpretar-reporte", response_model=ReportInterpretationResponse)
async def interpretar_reporte(req: ReportPromptRequest):
    """
    Interpreta una solicitud de reporte escrita en lenguaje natural.
    Devuelve una intención estructurada para que Angular o Spring Boot
    puedan generar el reporte real.
    """

    system_prompt = f"""
Eres Jarvis, un agente inteligente especializado en reportes dinámicos, métricas documentales, auditoría documental y workflows institucionales.

Tu tarea es interpretar la solicitud de reporte realizada por un jefe, administrador o funcionario, y devolver una intención estructurada para que el backend Spring Boot pueda generar el reporte real.

PROMPT DEL USUARIO:
"{req.prompt}"

ROL DEL USUARIO:
"{req.rol or 'No especificado'}"

USUARIO ID:
"{req.usuario_id or 'No especificado'}"

============================================================
CONTEXTO DEL SISTEMA
============================================================

El sistema tiene un módulo documental con documentos asociados a:
- políticas de negocio
- trámites o instancias
- clientes
- nodos del workflow
- departamentos
- documentos requeridos
- usuarios que subieron documentos

Cada documento puede tener estos estados:
- PENDING: documento pendiente de revisión
- APPROVED: documento aprobado
- REJECTED: documento rechazado
- OBSERVED: documento observado

El sistema también registra auditoría documental:
- UPLOADED: documento subido
- REVIEWED: documento revisado
- VIEWED: documento visualizado
- DOWNLOADED: documento descargado

============================================================
ENDPOINTS DISPONIBLES EN SPRING BOOT
============================================================

1. RESUMEN GENERAL DOCUMENTAL
GET /api/documents/dashboard/summary

Métricas:
- totalDocuments
- pendingDocuments
- approvedDocuments
- rejectedDocuments
- observedDocuments
- totalUploaded
- totalReviewed
- totalViewed
- totalDownloaded

2. DOCUMENTOS POR ESTADO
GET /api/documents/dashboard/by-status

3. DOCUMENTOS POR TRÁMITE
GET /api/documents/dashboard/by-process

4. REPORTE GENERAL CON CONCLUSIONES
GET /api/documents/reports/general

5. REPORTE DETALLADO DOCUMENTAL EN JSON
GET /api/documents/reports/detailed

Filtros soportados:
- status
- policyId
- processInstanceId
- clientId
- nodeId
- departmentId
- requiredDocumentName
- uploadedByUserId

Ejemplos:
GET /api/documents/reports/detailed?status=REJECTED
GET /api/documents/reports/detailed?status=PENDING
GET /api/documents/reports/detailed?processInstanceId=instance_001
GET /api/documents/reports/detailed?clientId=client_001
GET /api/documents/reports/detailed?policyId=policy_001
GET /api/documents/reports/detailed?departmentId=dep_001
GET /api/documents/reports/detailed?nodeId=node_001
GET /api/documents/reports/detailed?requiredDocumentName=Carnet
GET /api/documents/reports/detailed?uploadedByUserId=user_001

6. REPORTE DETALLADO DOCUMENTAL EN EXCEL
GET /api/documents/reports/detailed/excel

Filtros soportados:
- status
- policyId
- processInstanceId
- clientId
- nodeId
- departmentId
- requiredDocumentName
- uploadedByUserId

Ejemplos:
GET /api/documents/reports/detailed/excel?status=REJECTED
GET /api/documents/reports/detailed/excel?status=PENDING
GET /api/documents/reports/detailed/excel?departmentId=dep_001
GET /api/documents/reports/detailed/excel?nodeId=node_001
GET /api/documents/reports/detailed/excel?requiredDocumentName=Carnet
GET /api/documents/reports/detailed/excel?uploadedByUserId=user_001

============================================================
TIPOS DE REPORTE DISPONIBLES
============================================================

Usa uno de estos valores:
- RESUMEN_GENERAL
- DOCUMENTOS_POR_ESTADO
- DOCUMENTOS_POR_TRAMITE
- AUDITORIA_DOCUMENTAL
- DESCARGAS_Y_VISUALIZACIONES
- DOCUMENTOS_PENDIENTES
- DOCUMENTOS_APROBADOS
- DOCUMENTOS_OBSERVADOS
- DOCUMENTOS_RECHAZADOS
- REPORTE_GENERAL
- REPORTE_DETALLADO
- REPORTE_DETALLADO_EXCEL

============================================================
FORMATOS SUGERIDOS DISPONIBLES
============================================================

Usa uno de estos valores:
- DASHBOARD
- TABLA
- JSON
- EXCEL
- PDF

Actualmente el backend genera JSON y Excel real.
Si el usuario pide PDF, marca puede_generarse=false porque no existe endpoint PDF.

============================================================
MAPEO OBLIGATORIO DE ESTADOS
============================================================

Si el prompt menciona:
- "pendiente", "pendientes", "sin revisar" → estado = PENDING
- "aprobado", "aprobados", "válidos" → estado = APPROVED
- "rechazado", "rechazados", "rechazo" → estado = REJECTED
- "observado", "observados", "con observación", "corregir" → estado = OBSERVED

============================================================
MAPEO OBLIGATORIO DE ENDPOINTS
============================================================

1. Si el usuario pide resumen general:
endpoint_sugerido = "/api/documents/dashboard/summary"
tipo_reporte = "RESUMEN_GENERAL"
formato_sugerido = "DASHBOARD"

2. Si el usuario pide reporte general completo con conclusiones:
endpoint_sugerido = "/api/documents/reports/general"
tipo_reporte = "REPORTE_GENERAL"
formato_sugerido = "JSON"

3. Si el usuario pide conteo o distribución por estado:
endpoint_sugerido = "/api/documents/dashboard/by-status"
tipo_reporte = "DOCUMENTOS_POR_ESTADO"

4. Si el usuario pide documentos agrupados por trámite:
endpoint_sugerido = "/api/documents/dashboard/by-process"
tipo_reporte = "DOCUMENTOS_POR_TRAMITE"
agrupacion = "processInstanceId"

5. Si el usuario pide detalle, listado, tabla o documentos específicos:
endpoint_sugerido = "/api/documents/reports/detailed"
tipo_reporte = "REPORTE_DETALLADO"
formato_sugerido = "TABLA"

6. Si el usuario pide Excel:
endpoint_sugerido debe empezar con "/api/documents/reports/detailed/excel"
tipo_reporte = "REPORTE_DETALLADO_EXCEL"
formato_sugerido = "EXCEL"

7. Si el usuario pide documentos por departamento y proporciona departmentId:
usa query_params.departmentId.

8. Si el usuario pide documentos por nodo y proporciona nodeId:
usa query_params.nodeId.

9. Si el usuario pide documentos por requisito documental:
usa query_params.requiredDocumentName.

10. Si el usuario pide documentos subidos por un usuario:
usa query_params.uploadedByUserId.

11. No uses "/api/documents/reports/general" para documentos rechazados, pendientes, aprobados u observados, salvo que el usuario pida explícitamente un reporte general completo.

12. Si el usuario pide "por cliente", usa filtro clientId solo si proporciona un identificador de cliente claro. Si no lo proporciona, agrega "clientId" a datos_faltantes.

13. Si el usuario pide "por trámite", usa filtro processInstanceId solo si proporciona un identificador de trámite claro. Si no lo proporciona y además pide agrupación, usa agrupacion = "processInstanceId".

14. Si el usuario pide "por política", usa filtro policyId solo si proporciona un identificador de política claro. Si no lo proporciona, agrega "policyId" a datos_faltantes.

15. Si el usuario pide "por departamento", usa departmentId solo si proporciona un identificador claro. Si no lo proporciona, agrega "departmentId" a datos_faltantes.

16. Si el usuario pide "por nodo", usa nodeId solo si proporciona un identificador claro. Si no lo proporciona, agrega "nodeId" a datos_faltantes.

============================================================
REGLAS DE RESPUESTA
============================================================

1. Responde únicamente con JSON válido.
2. No uses markdown.
3. No agregues texto antes ni después del JSON.
4. No inventes endpoints fuera de los definidos.
5. No inventes filtros que no existan.
6. Si el usuario pide algo soportado por los endpoints, puede_generarse debe ser true.
7. Si el usuario pide algo no soportado, puede_generarse debe ser false.
8. Si el usuario pide Excel, el endpoint_sugerido debe ser de Excel.
9. Si el usuario pide detalle de documentos, usa reportes detallados, no dashboard.
10. Si el usuario pide solo conteo, usa dashboard.
11. Si el usuario pide todos los documentos, usa /api/documents/reports/detailed.
12. Si el usuario pide todos los documentos en Excel, usa /api/documents/reports/detailed/excel.
13. Si hay estado detectado, filtros.estado debe contener PENDING, APPROVED, REJECTED u OBSERVED.
14. Si no hay estado, filtros.estado debe ser null.
15. Si hay formato Excel, formato_sugerido debe ser EXCEL.
16. Si hay formato PDF, puede_generarse debe ser false.
17. El campo metricas debe contener nombres de métricas coherentes.
18. El campo explicacion debe ser breve, clara y técnica.
19. El campo datos_faltantes debe ser una lista, aunque esté vacía.
20. El campo query_params debe representar los filtros convertidos a parámetros URL.

============================================================
ESTRUCTURA EXACTA DE SALIDA
============================================================

{{
  "titulo": "Título claro del reporte",
  "tipo_reporte": "RESUMEN_GENERAL|DOCUMENTOS_POR_ESTADO|DOCUMENTOS_POR_TRAMITE|AUDITORIA_DOCUMENTAL|DESCARGAS_Y_VISUALIZACIONES|DOCUMENTOS_PENDIENTES|DOCUMENTOS_APROBADOS|DOCUMENTOS_OBSERVADOS|DOCUMENTOS_RECHAZADOS|REPORTE_GENERAL|REPORTE_DETALLADO|REPORTE_DETALLADO_EXCEL",
  "filtros": {{
    "estado": "PENDING|APPROVED|REJECTED|OBSERVED|null",
    "policyId": null,
    "processInstanceId": null,
    "clientId": null,
    "nodeId": null,
    "departmentId": null,
    "requiredDocumentName": null,
    "uploadedByUserId": null,
    "fechaInicio": null,
    "fechaFin": null
  }},
  "query_params": {{
    "status": null,
    "policyId": null,
    "processInstanceId": null,
    "clientId": null,
    "nodeId": null,
    "departmentId": null,
    "requiredDocumentName": null,
    "uploadedByUserId": null
  }},
  "agrupacion": "processInstanceId|null",
  "metricas": ["nombreMetrica1", "nombreMetrica2"],
  "formato_sugerido": "DASHBOARD|TABLA|JSON|EXCEL|PDF",
  "endpoint_sugerido": "/api/documents/reports/detailed/excel?status=REJECTED",
  "puede_generarse": true,
  "datos_faltantes": [],
  "explicacion": "Explicación breve de cómo se interpretó la solicitud."
}}
"""

    print(f"📥 Interpretando solicitud de reporte: {req.prompt}")

    try:
        response = generate_content(system_prompt)
        result = clean_json_response(response.text)
        result = normalize_report_interpretation(req.prompt, result)

        print("📤 Solicitud de reporte interpretada correctamente.")
        return result

    except Exception as e:
        print(f"❌ Error interpretando reporte: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo interpretar la solicitud de reporte.",
        )


# ============================================================
# CLASIFICACIÓN DE SOLICITUDES
# ============================================================

def normalize_classification_result(result: Dict[str, Any]) -> Dict[str, Any]:
    prioridad = str(result.get("prioridad_sugerida", "MEDIA")).upper()

    if prioridad not in ["BAJA", "MEDIA", "ALTA", "URGENTE"]:
        prioridad = "MEDIA"

    result["prioridad_sugerida"] = prioridad

    try:
        confianza = float(result.get("confianza", 0.0))
    except (TypeError, ValueError):
        confianza = 0.0

    confianza = max(0.0, min(confianza, 1.0))
    result["confianza"] = confianza

    if "palabras_clave" not in result or result["palabras_clave"] is None:
        result["palabras_clave"] = []

    if "requiere_revision_humana" not in result or result["requiere_revision_humana"] is None:
        result["requiere_revision_humana"] = confianza < 0.65

    if "politica_id" not in result:
        result["politica_id"] = None

    return result


@ia_router.post("/jarvis/clasificar-solicitud", response_model=ClassifyResponse)
async def clasificar_solicitud(req: ClassifyRequest):
    """
    Clasifica automáticamente una solicitud según:
    - tipo de trámite
    - categoría
    - política sugerida
    - prioridad
    - confianza
    """

    politicas_contexto = []

    if req.contexto_politicas:
        politicas_contexto = [
            model_to_dict(politica)
            for politica in req.contexto_politicas
        ]

    system_prompt = f"""
Eres Jarvis, un agente inteligente especializado en clasificación de solicitudes, políticas de negocio y workflows institucionales.

Tu tarea es clasificar la solicitud escrita por un cliente o funcionario.

SOLICITUD:
"{req.solicitud}"

CLIENTE ID:
"{req.cliente_id or 'No especificado'}"

USUARIO ID:
"{req.usuario_id or 'No especificado'}"

POLÍTICAS DE NEGOCIO DISPONIBLES:
{json.dumps(politicas_contexto, ensure_ascii=False, indent=2)}

============================================================
OBJETIVO
============================================================

Debes identificar:
1. El tipo de solicitud.
2. La categoría general del trámite.
3. La política de negocio más probable.
4. El ID de la política si fue enviado en contexto.
5. La prioridad sugerida.
6. La confianza de clasificación.
7. Palabras clave detectadas.
8. Si requiere revisión humana.
9. Una explicación breve.

============================================================
CATEGORÍAS SUGERIDAS
============================================================

- TRAMITE_ADMINISTRATIVO
- TRAMITE_ACADEMICO
- TRAMITE_DOCUMENTAL
- TRAMITE_FINANCIERO
- TRAMITE_LEGAL
- TRAMITE_TECNICO
- SOLICITUD_INTERNA
- SOLICITUD_CIUDADANA
- SOPORTE
- OTRO

============================================================
TIPOS DE SOLICITUD SUGERIDOS
============================================================

- LICENCIA_FUNCIONAMIENTO
- BECA_UNIVERSITARIA
- SOLICITUD_CERTIFICADO
- REGISTRO_DOCUMENTAL
- REVISION_DOCUMENTOS
- APROBACION_TRAMITE
- RECLAMO
- CONSULTA
- SOPORTE_TECNICO
- OTRO

Si el contexto de políticas contiene una política que coincide claramente, prioriza esa política.

============================================================
PRIORIDAD
============================================================

La prioridad_sugerida debe ser:
- BAJA
- MEDIA
- ALTA
- URGENTE

Criterios:
- URGENTE: vencimiento, plazo inmediato, emergencia, bloqueo crítico o riesgo alto.
- ALTA: afecta continuidad del trámite, documentación importante o requiere atención pronta.
- MEDIA: solicitud normal con información suficiente.
- BAJA: consulta general o solicitud no crítica.

============================================================
CONFIANZA
============================================================

El campo confianza debe ser un número entre 0 y 1.

- 0.90 a 1.00: clasificación muy clara.
- 0.70 a 0.89: clasificación probable.
- 0.50 a 0.69: clasificación dudosa.
- Menor a 0.50: requiere revisión humana.

============================================================
REGLAS
============================================================

1. Responde únicamente con JSON válido.
2. No uses markdown.
3. No agregues texto antes ni después del JSON.
4. No inventes politica_id si no viene en el contexto.
5. Si no hay contexto de políticas, politica_id debe ser null.
6. Si existe una política en contexto que coincide, usa su nombre e id.
7. Si la solicitud no se entiende, usa tipo_solicitud = "OTRO" y categoria = "OTRO".
8. requiere_revision_humana debe ser true si confianza < 0.65.
9. palabras_clave debe ser una lista.
10. explicacion debe ser breve y clara.

============================================================
ESTRUCTURA EXACTA
============================================================

{{
  "tipo_solicitud": "LICENCIA_FUNCIONAMIENTO|BECA_UNIVERSITARIA|SOLICITUD_CERTIFICADO|REGISTRO_DOCUMENTAL|REVISION_DOCUMENTOS|APROBACION_TRAMITE|RECLAMO|CONSULTA|SOPORTE_TECNICO|OTRO",
  "categoria": "TRAMITE_ADMINISTRATIVO|TRAMITE_ACADEMICO|TRAMITE_DOCUMENTAL|TRAMITE_FINANCIERO|TRAMITE_LEGAL|TRAMITE_TECNICO|SOLICITUD_INTERNA|SOLICITUD_CIUDADANA|SOPORTE|OTRO",
  "politica_sugerida": "Nombre de la política sugerida",
  "politica_id": null,
  "prioridad_sugerida": "BAJA|MEDIA|ALTA|URGENTE",
  "confianza": 0.85,
  "palabras_clave": ["palabra1", "palabra2"],
  "requiere_revision_humana": false,
  "explicacion": "Explicación breve de la clasificación realizada."
}}
"""

    print(f"📥 Clasificando solicitud: {req.solicitud}")

    try:
        response = generate_content(system_prompt)
        result = clean_json_response(response.text)
        result = normalize_classification_result(result)

        print("📤 Solicitud clasificada correctamente.")
        return result

    except Exception as e:
        print(f"❌ Error clasificando solicitud: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo clasificar la solicitud.",
        )