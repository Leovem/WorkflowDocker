package backend_sprint.backend_sprint.modules.Motor.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

@RestController
@RequestMapping("/api/instance")
@PreAuthorize("hasAnyAuthority('Recepcionista', 'RECEPCIONISTA', 'Funcionario', 'FUNCIONARIO')")
public class InstanceController {

    private final InstanceService instanceService;
    private final InstanceRepository instanceRepo;

    public InstanceController(InstanceService instanceService, InstanceRepository instanceRepo) {
        this.instanceService = instanceService;
        this.instanceRepo = instanceRepo;

    }

    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestBody StartRequest request) { // Usamos <?> para devolver texto o la Instancia
        
        System.out.println("=== NUEVA PETICIÓN RECIBIDA ===");
        
        // 🚀 1. VALIDACIÓN: ¿Llegó el objeto completamente nulo?
        if (request == null) {
            System.out.println("❌ ERROR: El body de la petición es null");
            return ResponseEntity.badRequest().body("La petición llegó vacía o el JSON está mal formado.");
        }

        System.out.println("Policy ID: " + request.getPolicyId());
        System.out.println("Nombre: " + request.getName());
        System.out.println("Email: " + request.getEmail());
        System.out.println("Documento: " + request.getDocumentId());
        System.out.println("Datos Dinámicos: " + request.getWorkflow()); 
        System.out.println("===============================");

        // 🚀 2. EXCEPCIONES/VALIDACIONES MANUALES
        if (request.getPolicyId() == null || request.getPolicyId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El ID de la política (policyId) es obligatorio.");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El nombre del solicitante es obligatorio.");
        }
        if (request.getDocumentId() == null || request.getDocumentId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El documento de identidad es obligatorio.");
        }

        // 🚀 3. EJECUCIÓN SEGURA
        try {
            Instance instance = instanceService.createInstance(
                request.getPolicyId(),
                request.getName(),
                request.getEmail(),
                request.getDocumentId(),
                request.getWorkflow()
            );
            return ResponseEntity.ok(instance); // Devuelve 200 OK con el objeto guardado
            
        } catch (IllegalArgumentException e) {
            // Si tu servicio lanza excepciones por lógica de negocio (ej. "La política no existe")
            System.err.println("❌ Error de negocio: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
            
        } catch (Exception e) {
            // Cualquier otro error de base de datos o de Java
            System.err.println("❌ Error interno del servidor: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Ocurrió un error al crear el trámite en el servidor.");
        }
    }


    @GetMapping("/all")
    public ResponseEntity<List<InstanceResponse>> getAllInstances() {
        System.out.println("=== SOLICITANDO LISTA DE TRÁMITES CON PERFILES ===");
        List<InstanceResponse> responseList = instanceService.getAllInstancesWithProfiles();
        return ResponseEntity.ok(responseList);
    }


// 🚀 MÉTODO CON MANEJO DE ERRORES ROBUSTO
    @GetMapping("/{departmentId}/current-node")
    public ResponseEntity<?> listarTareasPendientes(@PathVariable String departmentId) {
        System.out.println("📥 [INBOX] Petición recibida para el departamento: " + departmentId);
        
        if (departmentId == null || departmentId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El ID del departamento es requerido"));
        }

        try {
            List<Map<String, Object>> respuesta = instanceService.getPendingTasksForDepartment(departmentId);
            
            if (respuesta.isEmpty()) {
                System.out.println("ℹ️ [INBOX] No hay tareas pendientes para: " + departmentId);
                return ResponseEntity.ok(new ArrayList<>()); // Devuelve array vacío limpio
            }

            System.out.println("✅ [INBOX] Se enviaron " + respuesta.size() + " tareas al depto: " + departmentId);
            System.out.println("Detalles de la respuesta: " + respuesta);
            return ResponseEntity.ok(respuesta);

        } catch (Exception e) {
            System.err.println("🔥 [INBOX] Error crítico al obtener la bandeja: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Ocurrió un problema interno al cargar las tareas",
                "details", e.getMessage()
            ));
        }
    }


    @PostMapping("/{id}/complete/{nodeId}")
    public ResponseEntity<?> completarTarea(@PathVariable String id, @PathVariable String nodeId, @RequestBody Map<String, Object> formData) {

        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();

        System.out.println("✅ [COMPLETE] Petición para completar tarea en instancia: " + id + ", nodo: " + nodeId);
        System.out.println("Datos recibidos para completar la tarea: " + formData);
        try {
            Instance resultado = instanceService.completarTareaHumana(id, nodeId, formData, currentUser);
            return ResponseEntity.ok(Map.of(
                "message", "Tarea completada y motor avanzado exitosamente",
                "instance", resultado
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/{id}")
    public ResponseEntity<?> getInstanceById(@PathVariable String id) {
        try {
            System.out.println("🔍 Buscando expediente completo de la Instancia: " + id);
            return instanceRepo.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al buscar la instancia: " + e.getMessage());
        }
    }

}