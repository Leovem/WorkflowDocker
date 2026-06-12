import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.core.config import settings


router = APIRouter(
    prefix="/ai/requisitos",
    tags=["IA - Identificación de requisitos"]
)


MODEL_NAME = "gemini-2.5-flash"

client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ============================================================
# MODELOS DE REQUEST / RESPONSE
# ============================================================

class RequirementIdentificationRequest(BaseModel):
    solicitud: str = Field(
        ...,
        min_length=5,
        description="Texto escrito por el cliente o funcionario describiendo lo que necesita."
    )

    contexto_politicas: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Lista opcional de políticas de negocio existentes para que la IA elija una."
    )

    cliente_id: Optional[str] = None
    usuario_id: Optional[str] = None


class RequirementItem(BaseModel):
    nombre: str
    descripcion: str
    obligatorio: bool = True
    tipo_documento: str = "DOCUMENTO"


class RequirementIdentificationResponse(BaseModel):
    politica_sugerida: str
    categoria: str
    descripcion: str
    confianza: float

    requisitos: List[RequirementItem]
    documentos_esperados: List[str]

    datos_faltantes: List[str]
    preguntas_sugeridas: List[str]

    explicacion: str
    puede_iniciar_tramite: bool


# ============================================================
# PROMPT
# ============================================================

SYSTEM_PROMPT = """
Eres un agente inteligente especializado en políticas de negocio, gestión documental y workflows institucionales.

Tu tarea es analizar la solicitud de un cliente o funcionario y determinar qué política de negocio corresponde iniciar.

Debes identificar:
1. La política de negocio sugerida.
2. La categoría del trámite.
3. Los requisitos necesarios.
4. Los documentos esperados.
5. Datos faltantes.
6. Preguntas sugeridas para completar la solicitud.
7. Si el trámite puede iniciar o si falta información.

REGLAS:
- Responde únicamente JSON válido.
- No uses markdown.
- No inventes información sensible.
- Si no tienes suficiente información, baja la confianza y pide datos faltantes.
- Los requisitos deben ser claros, concretos y asociados a documentos o datos.
- Si se envían políticas existentes en el contexto, prioriza elegir una de ellas.
- El campo confianza debe estar entre 0 y 1.

ESTRUCTURA EXACTA:
{
  "politica_sugerida": "Nombre de la política",
  "categoria": "Categoría del trámite",
  "descripcion": "Descripción breve del trámite identificado",
  "confianza": 0.85,
  "requisitos": [
    {
      "nombre": "Nombre del requisito",
      "descripcion": "Descripción del requisito",
      "obligatorio": true,
      "tipo_documento": "PDF|WORD|EXCEL|IMAGEN|VIDEO|AUDIO|DATO|DOCUMENTO"
    }
  ],
  "documentos_esperados": ["Documento 1", "Documento 2"],
  "datos_faltantes": ["Dato faltante 1"],
  "preguntas_sugeridas": ["Pregunta 1"],
  "explicacion": "Explicación breve de por qué se eligió esa política",
  "puede_iniciar_tramite": true
}
"""


def _safe_json_loads(text: str) -> Dict[str, Any]:
    """
    Convierte la respuesta de Gemini a JSON.
    Si Gemini devuelve texto con espacios o saltos, igual intenta parsear.
    """
    if not text:
        raise ValueError("La IA devolvió una respuesta vacía")

    cleaned = text.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1:
            raise

        return json.loads(cleaned[start:end + 1])


def identify_requirements_with_ai(
    solicitud: str,
    contexto_politicas: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Llama a Gemini para identificar la política de negocio y sus requisitos.
    """

    contexto = contexto_politicas if contexto_politicas else []

    prompt = f"""
INSTRUCCIONES DEL SISTEMA:
{SYSTEM_PROMPT}

SOLICITUD DEL CLIENTE O FUNCIONARIO:
{solicitud}

POLÍTICAS DE NEGOCIO DISPONIBLES:
{json.dumps(contexto, ensure_ascii=False, indent=2)}
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    return _safe_json_loads(response.text)


# ============================================================
# ENDPOINT
# ============================================================

@router.post("/identificar", response_model=RequirementIdentificationResponse)
def identificar_requisitos(request: RequirementIdentificationRequest):
    try:
        result = identify_requirements_with_ai(
            solicitud=request.solicitud,
            contexto_politicas=request.contexto_politicas
        )

        return result

    except Exception as e:
        print(f"❌ Error en identificación de requisitos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo identificar la política de negocio ni sus requisitos."
        )