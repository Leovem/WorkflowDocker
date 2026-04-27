from fastapi import APIRouter, HTTPException
from app.services.modelo import jarvis_assistant, generate_content, analizar_bitacora_con_ia
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

ia_router = APIRouter()

class BitacoraEntry(BaseModel):
    action: str
    nodeName: str
    policyName: str
    timing: Dict[str, Any]
    user: Dict[str, Any]
    # Agregamos los demás campos como opcionales para evitar el 422 si faltan
    id: Optional[str] = None
    instanceId: Optional[str] = None
    nodeId: Optional[str] = None
    policyId: Optional[str] = None
    hasMultimedia: Optional[bool] = None


class SmartFillRequest(BaseModel):
    transcription: str
    fields: list[str]

class DiagramSnapshot(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class CopilotRequest(BaseModel):
    prompt: str
    currentDiagram: DiagramSnapshot

@ia_router.post("/copilot/ask")
async def ask_copilot(request: CopilotRequest):
    """
    Recibe el diagrama actual y el prompt del usuario, se lo pasa a Jarvis (Gemini) 
    y devuelve la respuesta estructurada.
    """
    print(f"📥 Jarvis escuchando -> Comando: {request.prompt}")
    print(f"📊 Analizando diagrama con {len(request.currentDiagram.nodes)} nodos.")

    try:
        # Convertimos el modelo de Pydantic a un diccionario normal de Python
        diagram_dict = request.currentDiagram.dict()
        
        # 🚀 LLAMAMOS A LA IA
        respuesta_jarvis = jarvis_assistant(
            user_prompt=request.prompt, 
            current_diagram=diagram_dict
        )
        
        print("📤 Jarvis respondió con éxito.")
        return respuesta_jarvis

    except Exception as e:
        print(f"❌ Error en la ruta /ask: {str(e)}")
        raise HTTPException(status_code=500, detail="Error de comunicación con el asistente IA.")
    
    
@ia_router.post("/jarvis/smart-fill")
async def smart_form_fill(req: SmartFillRequest):
    system_prompt = f"""
    Eres Jarvis, un asistente de extracción de datos.
    El usuario (un funcionario) ha narrado un caso por voz. Su transcripción es: "{req.transcription}"
    
    Tu tarea es extraer la información de esa narración y asignarla a los siguientes campos del formulario: {req.fields}
    
    REGLAS:
    1. Si la narración menciona algo que encaja en un campo, asígnalo.
    2. Si un campo no se menciona, pon su valor como "".
    3. Responde ÚNICAMENTE con un JSON válido donde las claves sean los nombres de los campos.
    """
    
    print(f"orden en texto: {req.transcription}")
    print(f"campos a llenar: {req.fields}")
    response = generate_content(system_prompt)
    
    raw_json = response.text.replace("```json", "").replace("```", "").strip()
    
    return json.loads(raw_json)




@ia_router.post("/jarvis/analisis")
async def jarvis_analisis(bitacora: List[BitacoraEntry]):
    # 1. Procesamiento rápido de datos
    total_tareas = len(bitacora)
    

    tiempos = [t.timing['durationMinutes'] for t in bitacora]
    
    promedio = sum(tiempos) / total_tareas if total_tareas > 0 else 0
    

    funcionario_lento = max(bitacora, key=lambda x: x.timing['durationMinutes'])
    
    resumen = (f"Se procesaron {total_tareas} tareas. El tiempo promedio es {promedio} min. "
               f"La tarea más lenta fue '{funcionario_lento.nodeName}' "
               f"por {funcionario_lento.user['name']} con {funcionario_lento.timing['durationMinutes']} min.")


    response = analizar_bitacora_con_ia(resumen)
    

    # ✅ EXTRAEMOS EL TEXTO REAL
    try:
        # Si generate_content devuelve el objeto de Gemini, usamos .text
        comentario_ia = response.text 
    except Exception as e:
        print(f"Error extrayendo texto de Gemini: {e}")
        comentario_ia = "{}" # Fallback seguro

    return {
        "stats": {
            "promedio": promedio,
            "total": total_tareas,
            "anomalia": funcionario_lento
        },
        "jarvis_speech": comentario_ia
    }