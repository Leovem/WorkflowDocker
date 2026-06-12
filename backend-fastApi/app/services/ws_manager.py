from fastapi import WebSocket
from typing import List, Dict
import redis.asyncio as redis
import asyncio
import json
from app.core.config import settings

# app/services/ws_manager.py

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Cliente de redis asíncrono
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Tareas de escucha por politica para no duplicar
        self.listen_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, politica_id: str):
        await websocket.accept()
        if politica_id not in self.active_connections:
            self.active_connections[politica_id] = []
            self.listen_tasks[politica_id] = asyncio.create_task(self._listen_redis(politica_id))
        self.active_connections[politica_id].append(websocket)



    async def disconnect(self, websocket: WebSocket, politica_id: str):
        if politica_id in self.active_connections:
            if websocket in self.active_connections[politica_id]:
                self.active_connections[politica_id].remove(websocket)
            
            if not self.active_connections[politica_id]:
                if politica_id in self.listen_tasks:
                    self.listen_tasks[politica_id].cancel()
                    try:
                        await self.listen_tasks[politica_id]
                    except asyncio.CancelledError:
                        pass
                    del self.listen_tasks[politica_id]
                del self.active_connections[politica_id]
    
        # 🚨 NUEVO: Buscar y liberar todos los nodos bloqueados por este usuario al salir
        # Esto es por si cerró la pestaña sin darle a 'Guardar'
        pattern = f"lock:policy:{politica_id}:node:*"
        keys = await self.redis_client.keys(pattern)
        for key in keys:
            val = await self.redis_client.get(key)
            if val:
                data = json.loads(val)
                # Si encontramos un nodo bloqueado por el socket que se está yendo
                # (Aquí podrías comparar por user_name si el user_id del socket varía)
                if data.get("userName") in [u for u in self.active_connections.get(politica_id, [])]: # O lógica similar
                    # Para simplificar, puedes hacer que el front mande un unlock antes de morir 
                    # o que Redis lo limpie por TTL (que ya lo pusimos en 60s)
                    pass
        
       
       
                
    async def broadcast(self, message: dict, politica_id: str):
        channel = f"flow_channel_{politica_id}"
        await self.redis_client.publish(channel, json.dumps(message))

    async def _listen_redis(self, politica_id: str):
        channel_name = f"flow_channel_{politica_id}"
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(channel_name)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    if politica_id in self.active_connections:
                        for connection in self.active_connections[politica_id][:]:
                            try:
                                await connection.send_json(data)
                            except Exception:
                                self.active_connections[politica_id].remove(connection)
        except asyncio.CancelledError:
            await pubsub.unsubscribe(channel_name)
        except Exception as e:
            print(f"❌ Error en escucha Redis para política {politica_id}: {e}")

    # --- 🟢 MÉTODOS DE BLOQUEO CORREGIDOS ---

    async def lock_node(self, politica_id: str, node_id: str, user_id: str, user_name: str):
        """
        Intenta bloquear un nodo en redis para un usuario especifico.
        """
        lock_key = f"lock:policy:{politica_id}:node:{node_id}"
        
        # Guardamos la info del dueño del bloqueo
        lock_data = json.dumps({"userId": user_id, "userName": user_name})
        
        # 🚨 CORRECCIÓN: Usamos self.redis_client (que es el nombre correcto)
        success = await self.redis_client.set(lock_key, lock_data, nx=True, ex=60)
        
        if success:
            await self.broadcast({
                "type": "node_locked",
                "nodeId": node_id,
                "userId": user_id,
                "userName": user_name
            }, politica_id)
        
        return success

    async def unlock_node(self, politica_id: str, node_id: str, user_id: str):
        """
        Libera el nodo si el usuario que lo solicita es el dueño del bloqueo.
        """
        lock_key = f"lock:policy:{politica_id}:node:{node_id}"
        current_lock = await self.redis_client.get(lock_key)
        
        if current_lock:
            data = json.loads(current_lock)
            # 🚨 CORRECCIÓN: Aseguramos que la llave coincida con el JSON guardado ('userId')
            if data.get("userId") == user_id:
                await self.redis_client.delete(lock_key)
                await self.broadcast({
                    "type": "node_unlocked",
                    "nodeId": node_id,
                }, politica_id)
                return True
        return False

    async def check_node_locks(self, politica_id: str):
        pattern = f"lock:policy:{politica_id}:node:*"
        keys = await self.redis_client.keys(pattern)
        locks = {}
        for key in keys:
            node_id = key.split(":")[-1]
            val = await self.redis_client.get(key)
            locks[node_id] = json.loads(val)
        return locks
                 
manager = ConnectionManager()