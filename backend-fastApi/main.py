from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from scalar_fastapi import get_scalar_api_reference
from app.services.ws_manager import manager
import json
from app.services.ia import ia_router



# Configuración de la Documentación (Metadata)
app = FastAPI(
    title="UAGRM Flow API",
    description="Sistema Inteligente de Gestión de Políticas y Workflows para la UAGRM",
    version="1.0.0",
    contact={
        "name": "Ved Dev",
        "url": "http://localhost:5173",
    },
    # Esto organiza la UI de Swagger
    openapi_tags=[
        {"name": "usuarios", "description": "Gestión de funcionarios y personal administrativo"},
        {"name": "departamentos", "description": "Estructura organizacional de la universidad"},
        {"name": "roles", "description": "Niveles de acceso y permisos"},
    ]
)

origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://workflow-puma.s3-website-us-east-1.amazonaws.com",
    "https://d2oa5maju2bq22.cloudfront.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Permite todos los headers (incluyendo Authorization)
)


app.include_router(ia_router, prefix="/ia", tags=["ia"])

# CONFIGURACION DE WEBSOCKETS
@app.websocket("/ia/ws/design/{politica_id}/{user_name}")
async def websocket_endpoint(websocket: WebSocket, politica_id: str, user_name: str):
    print(f"DEBUG: Intentando conectar {user_name} a Redis...")
    user_id = str(id(websocket))  # Generamos un ID único para el socket (puede ser cualquier cosa única)
    await manager.connect(websocket, politica_id)
    print(f"🚀 Usuario conectado: {user_name} en política {politica_id}")
    
    try:
        # Notificar entrada vía Redis
        await manager.broadcast({
            "type": "presence",
            "user": user_name,
            "action": "joined"
        }, politica_id)

        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Agregamos el usuario al mensaje para que el frontend sepa quién es
                message["user"] = user_name
                message["userId"] = user_id
                
                # --- 🟢 LÓGICA DE BLOQUEOS (HU 04) ---
                
                # 1. Petición de Bloqueo: El usuario quiere editar el nodo
                if message.get("type") == "request_lock":
                    node_id = message.get("nodeId")
                    # Intentamos bloquear en Redis
                    locked = await manager.lock_node(politica_id, node_id, user_id, user_name)
                    if not locked:
                        # Si falló, le avisamos solo a él que ya está ocupado (opcional)
                        await websocket.send_json({
                            "type": "lock_failed",
                            "nodeId": node_id,
                            "message": "Nodo ya está siendo editado por otro usuario"
                        })

                # 2. Petición de Desbloqueo: El usuario terminó de editar
                elif message.get("type") == "request_unlock":
                    await manager.unlock_node(politica_id, message.get("nodeId"), user_id)

                # 3. Mensajes Generales (cursores, nodos movidos, etc.)
                else:
                    await manager.broadcast(message, politica_id)

            except json.JSONDecodeError:
                continue 
                
    except Exception as e:
        print(f"❌ Error en socket de {user_name}: {e}")
    finally:
        # Importante el await aquí porque disconnect ahora es asíncrono
        await manager.disconnect(websocket, politica_id)
        await manager.broadcast({
            "type": "presence",
            "user": user_name,
            "action": "left"
        }, politica_id)
        print(f"🔌 Conexión cerrada para {user_name}")        
        


@app.get("/", tags=["Root"])
async def read_root():
    return {
        "status": "online",
        "message": "UAGRM Flow API está corriendo",
        "docs": "/docs"
    }
    

@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )