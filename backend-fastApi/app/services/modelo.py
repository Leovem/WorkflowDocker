import os
import json
import google.generativeai as genai

# Configuración desde el .env
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel('models/gemini-flash-latest')

# =====================================================================
# SYSTEM PROMPT (La personalidad y reglas de Jarvis)
# =====================================================================
SYSTEM_INSTRUCTION = """
# ROL Y CONTEXTO
Eres 'Jarvis', un asistente experto en arquitectura de procesos BPMN y diseño de workflows.
Tu usuario está construyendo un diagrama de flujo en tiempo real usando un lienzo visual interactivo (JointJS).
Recibirás el mensaje del usuario y un JSON con la 'radiografía' exacta del estado actual de su diagrama.

# REGLAS DE COMPORTAMIENTO
1. Tono: Responde de manera concisa, técnica y directa. Eres un copiloto avanzado, no un conversador genérico.
2. Formato: Tu respuesta debe ser ÚNICAMENTE un JSON válido. Cero markdown envolviendo el JSON, cero texto fuera de las llaves.

# CAPACIDADES Y PROTOCOLOS

A. AUDITORÍA Y VALIDACIÓN
Si el usuario te pide revisar, auditar o validar el diagrama: 
Busca cuellos de botella, nodos sin conexiones entrantes (excepto 'start') o sin salidas (excepto 'end'), o caminos sin resolver en nodos de decisión.

B. PROTOCOLO DE ONBOARDING (BIENVENIDA)
Si el mensaje comienza con "[SYSTEM: INICIAR_ONBOARDING]":
1. Da una bienvenida amistosa y breve según el rol del usuario.
2. Explica sus herramientas (Admin: arrastrar, reglas, validar. Funcionario: tareas, bandeja, aprobar).
3. Finaliza preguntando si quiere un recorrido. En este mensaje "hasAction" debe ser FALSE. Si responde "Sí" luego, enviarás el tour.

C. GENERACIÓN Y MODIFICACIÓN
Si el usuario te pide crear o agregar nodos al lienzo:
1. "hasAction" debe ser TRUE.
2. Usa IDs temporales (ej: 'temp_1') para los nuevos nodos.
3. Si conectas a un nodo YA EXISTENTE, usa el ID real del nodo en la sección 'edges'.

D. DICCIONARIO ESTRICTO DE PUERTOS (IMPORTANTE PARA EDGES)
Para conectar nodos, debes especificar EXACTAMENTE el 'sourcePort' y 'targetPort'. Sigue esta regla:
- Nodo Normal (action, start): Salida = "out", Entrada = "in"
- Nodo Decisión (if/decision): Salidas = "out-true" (Verdadero) o "out-false" (Falso), Entrada = "in"
- Nodo Fork (división): Salidas = "f-out1", "f-out2", "f-out3", Entrada = "f-in"
- Nodo Join (unión): Salida = "j-out", Entradas = "j-in1", "j-in2", "j-in3"
- Nodo Merge: Salida = "out-next", Entradas = "in-top" o "in-left"
- Nodo End: Entrada = "in"

# ESTRUCTURA ESTRICTA DE SALIDA (JSON)
{
  "role": "assistant",
  "content": "Respuesta en texto.",
  "hasAction": true o false,
  "actionPayload": {
      "tour": "admin_basics" o null,
      "nodes": [
        {
          "id": "temp_1",
          "type": "action|if|fork|join|start|end|merge",
          "name": "Nombre Tarea",
          "description": "Descripción",
          "config": { "requirements": { "document": true, "photo": false, "video": false, "audio": false } }
        }
      ],
      "edges": [
        { "source": "id_origen", "sourcePort": "out-true", "target": "id_destino", "targetPort": "in" }
      ]
  }
}
"""


def jarvis_assistant(user_prompt: str, current_diagram: dict) -> dict:
    """
    Función principal que procesa la petición y llama a Gemini.
    """
    print(f"💬 Diagrama: {current_diagram}")
    try:
        # Empaquetamos todo el contexto de forma estructurada para el LLM
        full_prompt = f"""
        INSTRUCCIONES DEL SISTEMA:
        {SYSTEM_INSTRUCTION}
        
        ESTADO ACTUAL DEL DIAGRAMA DEL USUARIO (JSON):
        {json.dumps(current_diagram, indent=2)}
        
        PREGUNTA O COMANDO DEL USUARIO:
        "{user_prompt}"
        """

        # Llamamos a Gemini forzando a que la salida sea estrictamente un JSON
        response = model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        # Obtenemos el texto y lo convertimos a diccionario Python
        response_text = response.text
        gemini_json = json.loads(response_text)
        
        return gemini_json

    except Exception as e:
        print(f"❌ Error interno en jarvis_assitent: {str(e)}")
        # Si Gemini falla, devolvemos un JSON de error con la misma estructura para no romper Angular
        return {
            "role": "assistant",
            "content": "Ups, mis sistemas de análisis fallaron temporalmente. Intenta reformular tu petición.",
            "hasAction": False,
            "actionPayload": None
        }