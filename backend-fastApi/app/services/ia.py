from fastapi import APIRouter, HTTPException
from app.services.modelo import jarvis_assistant, generate_content
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

ia_router = APIRouter()


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