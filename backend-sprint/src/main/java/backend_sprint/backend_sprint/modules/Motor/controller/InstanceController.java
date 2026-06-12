package backend_sprint.backend_sprint.modules.Motor.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Motor.DTO.InstanceResponse;
import backend_sprint.backend_sprint.modules.Motor.DTO.StartRequest;
import backend_sprint.backend_sprint.modules.Motor.model.Instance;
import backend_sprint.backend_sprint.modules.Motor.repository.InstanceRepository;
import backend_sprint.backend_sprint.modules.Motor.service.InstanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/instance")
@PreAuthorize("hasAnyAuthority('Recepcionista', 'RECEPCIONISTA', 'Funcionario', 'FUNCIONARIO')")
public class InstanceController {

    private static final Logger log = LoggerFactory.getLogger(InstanceController.class);

    private final InstanceService instanceService;
    private final InstanceRepository instanceRepo;

    public InstanceController(InstanceService instanceService, InstanceRepository instanceRepo) {
        this.instanceService = instanceService;
        this.instanceRepo = instanceRepo;
    }

    @PostMapping("/start")
    public ResponseEntity<Instance> start(@Valid @RequestBody StartRequest request) { 
        // @Valid ejecuta las validaciones automáticas de tu DTO (@NotBlank)
        
        log.info("=== NUEVA PETICIÓN RECIBIDA ===");
        log.info("Policy ID: {}", request.getPolicyId());
        log.info("Nombre: {}", request.getName());
        log.info("Email: {}", request.getEmail());
        log.info("Documento: {}", request.getDocumentId());
        log.info("===============================");

        Instance instance = instanceService.createInstance(
            request.getPolicyId(),
            request.getName(),
            request.getEmail(),
            request.getDocumentId(),
            request.getWorkflow()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(instance); 
    }

    @GetMapping("/all")
    public ResponseEntity<List<InstanceResponse>> getAllInstances() {
        log.info("=== SOLICITANDO LISTA DE TRÁMITES CON PERFILES ===");
        List<InstanceResponse> responseList = instanceService.getAllInstancesWithProfiles();
        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{departmentId}/current-node")
    public ResponseEntity<List<Map<String, Object>>> listarTareasPendientes(@PathVariable String departmentId) {
        log.info("📥 [INBOX] Petición recibida para el departamento: {}", departmentId);
        
        if (departmentId == null || departmentId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); 
        }

        List<Map<String, Object>> respuesta = instanceService.getPendingTasksForDepartment(departmentId);
        
        if (respuesta.isEmpty()) {
            log.info("ℹ️ [INBOX] No hay tareas pendientes para: {}", departmentId);
            return ResponseEntity.ok(new ArrayList<>()); 
        }

        log.info("✅ [INBOX] Se enviaron {} tareas al depto: {}", respuesta.size(), departmentId);
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/{id}/complete/{nodeId}")
    public ResponseEntity<Map<String, Object>> completarTarea(
            @PathVariable String id, 
            @PathVariable String nodeId, 
            @RequestBody Map<String, Object> formData) {

        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();

        log.info("✅ [COMPLETE] Petición para completar tarea en instancia: {}, nodo: {}", id, nodeId);
        log.info("Datos recibidos para completar la tarea: {}", formData);
        
        Instance resultado = instanceService.completarTareaHumana(id, nodeId, formData, currentUser);
        
        return ResponseEntity.ok(Map.of(
            "message", "Tarea completada y motor avanzado exitosamente",
            "instance", resultado
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Instance> getInstanceById(@PathVariable String id) {
        log.info("🔍 Buscando expediente completo de la Instancia: {}", id);
        return instanceRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}