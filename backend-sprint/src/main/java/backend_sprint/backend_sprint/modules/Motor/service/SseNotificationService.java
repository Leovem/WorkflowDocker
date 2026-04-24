package backend_sprint.backend_sprint.modules.Motor.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SseNotificationService {

    // Mapa que asocia un departmentId con la lista de conexiones (emitters) de sus funcionarios
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * Suscribe a un funcionario al canal de su departamento.
     */
    public SseEmitter subscribe(String departmentId) {
        // Tiempo de espera de la conexión (Ej: 30 minutos). El navegador reconectará automáticamente si se corta.
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        
        // Inicializa la lista si el departamento no tiene a nadie conectado aún
        emitters.computeIfAbsent(departmentId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Limpieza automática cuando la conexión se cierra, expira o da error
        emitter.onCompletion(() -> removeEmitter(departmentId, emitter));
        emitter.onTimeout(() -> removeEmitter(departmentId, emitter));
        emitter.onError((e) -> removeEmitter(departmentId, emitter));

        // Enviar un evento inicial para confirmar conexión (opcional)
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Conectado al canal del departamento: " + departmentId));
        } catch (IOException e) {
            removeEmitter(departmentId, emitter);
        }

        return emitter;
    }

    /**
     * Envía una notificación a todos los funcionarios conectados de un departamento.
     */
    public void notifyDepartment(String departmentId, Object payload) {
    List<SseEmitter> departmentEmitters = emitters.get(departmentId);
    
    if (departmentEmitters != null && !departmentEmitters.isEmpty()) {
        // 1. Creamos una lista temporal para guardar los que fallaron
        List<SseEmitter> deadEmitters = new ArrayList<>();
        
        // 2. Recorremos y enviamos
        for (SseEmitter emitter : departmentEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("NEW_TASK")
                        .data(payload));
            } catch (IOException | IllegalStateException e) {
                // Si falla, lo marcamos como completado y lo anotamos en la lista negra
                emitter.complete();
                deadEmitters.add(emitter);
            }
        }
        
        // 3. Borramos todos los inactivos de una sola vez FUERA del bucle
        if (!deadEmitters.isEmpty()) {
            departmentEmitters.removeAll(deadEmitters);
        }
    }
}

    private void removeEmitter(String departmentId, SseEmitter emitter) {
        List<SseEmitter> departmentEmitters = emitters.get(departmentId);
        if (departmentEmitters != null) {
            departmentEmitters.remove(emitter);
            if (departmentEmitters.isEmpty()) {
                emitters.remove(departmentId); // Liberar memoria si el departamento queda vacío
            }
        }
    }
    
}
