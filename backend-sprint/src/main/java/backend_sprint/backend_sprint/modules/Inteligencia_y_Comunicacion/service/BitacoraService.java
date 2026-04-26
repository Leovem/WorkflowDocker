package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model.Bitacora;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.repository.BitacoraRepository;
import backend_sprint.backend_sprint.modules.Motor.model.Instance;

@Service
public class BitacoraService {
    
    @Autowired
    private BitacoraRepository bitacoraRepo;

    /**
     * @Async permite que esto se ejecute en segundo plano sin bloquear el request del usuario.
     * Importante: Asegúrate de tener @EnableAsync en tu clase principal (Application.java)
     */

    @Async
    public void logBitacoraAssignment(Instance instance, Map<String, Object> node, String deptoId, String deptoName, String policyName) {
        Bitacora execution = new Bitacora();
        execution.setInstanceId(instance.getId());
        execution.setPolicyId(instance.getPolicyId()); // Asegúrate de tener este campo en Instance
        execution.setPolicyName(policyName);
        execution.setNodeId((String) node.get("id"));
        execution.setNodeName((String) node.get("name"));
        
        // Registramos el momento de entrada a la bandeja
        Bitacora.ExecutionTiming timing = new Bitacora.ExecutionTiming();
        timing.setAssignedAt(LocalDateTime.now());
        execution.setTiming(timing);

        // Datos del departamento (aún no hay usuario porque nadie la tomó)
        Bitacora.ExecutionUser user = new Bitacora.ExecutionUser();
        user.setDepartamentId(deptoId);
        user.setDepartamentName(deptoName);
        execution.setUser(user);

        execution.setAction("PENDING"); // Estado inicial
        bitacoraRepo.save(execution);
    }


    @Async
    public void updateTaskCompletion(String instanceId, String nodeId, String userName, String action, boolean hasMedia) {
        // Buscamos el registro que quedó pendiente para esa instancia y ese nodo
        Bitacora execution = bitacoraRepo.findFirstByInstanceIdAndNodeIdAndActionOrderByTimingAssignedAtDesc(
            instanceId, nodeId, "PENDING"
        );

        if (execution != null) {
            LocalDateTime now = LocalDateTime.now();
            execution.getTiming().setCompletedAt(now);
            
            // Calculamos duración
            long minutes = Duration.between(execution.getTiming().getAssignedAt(), now).toMinutes();
            execution.getTiming().setDurationMinutes(minutes);
            
            execution.getUser().setName(userName);
            execution.setAction(action); // Ej: "SUBMITTED", "APPROVED"
            execution.setHasMultimedia(hasMedia);
            
            bitacoraRepo.save(execution);
            System.out.println("📊 [BITÁCORA] Tarea actualizada. Tomó " + minutes + " minutos completarla.");
        } else {
            System.out.println("⚠️ [BITÁCORA] No se encontró la tarea PENDIENTE para actualizar.");
        }
    }
}
