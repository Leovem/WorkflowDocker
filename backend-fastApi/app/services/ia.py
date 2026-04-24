from fastapi import APIRouter, HTTPException
from app.services.modelo import jarvis_assistant
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

ia_router = APIRouter()


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