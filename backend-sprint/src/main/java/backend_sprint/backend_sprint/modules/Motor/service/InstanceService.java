package backend_sprint.backend_sprint.modules.Motor.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.JwtService;
import backend_sprint.backend_sprint.modules.Motor.DTO.InstanceResponse;
import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;
import backend_sprint.backend_sprint.modules.Motor.model.Instance;
import backend_sprint.backend_sprint.modules.Motor.repository.EphemeralProfileRepository;
import backend_sprint.backend_sprint.modules.Motor.repository.InstanceRepository;
import backend_sprint.backend_sprint.modules.Proccess.service.PolicyService;

@Service
public class InstanceService {
    
    private final InstanceRepository instanceRepo;
    private final EphemeralProfileRepository profileRepository;
    private final EmailNotificationService emailService;
    private final JwtService jwtService;
    private final EphemeralProfileRepository profileRepo;
    private final ProcessPolicy policyRun;
    private final PolicyService policyService;
    private final ProcessPolicy processPolicy;

    public InstanceService(InstanceRepository instanceRepo, EphemeralProfileRepository profileRepository, EmailNotificationService emailService, JwtService jwtService,
        EphemeralProfileRepository profileRepo, ProcessPolicy policyRun, PolicyService policyService, ProcessPolicy processPolicy) {
        this.instanceRepo = instanceRepo;
        this.profileRepository = profileRepository;
        this.emailService = emailService;
        this.jwtService = jwtService;
        this.profileRepo = profileRepo;
        this.policyRun = policyRun;
        this.policyService = policyService;
        this.processPolicy = processPolicy;
    }

    public Instance createInstance(String policyId, String name, String email, String documentId, Map<String, Object> payload) {

        EphemeralProfile profile = profileRepository.findByEmailOrDocumentId(email, documentId)
            .orElse(new EphemeralProfile());

        profile.setName(name);
        profile.setEmail(email);
        profile.setDocumentId(documentId);

        boolean isNewToken = false;

        if (profile.getAccessToken() == null || profile.getTokenExpiresAt() != null && profile.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            profile.setAccessToken(jwtService.generateCustomToken(name));
            profile.setTokenExpiresAt(null);
            profile.setActive(true);
            isNewToken = true;
        } else {
            profile.setTokenExpiresAt(null);
        }

        profileRepository.save(profile);

        if (isNewToken) {
            emailService.sendAccessEmail(profile.getEmail(), profile.getName(), profile.getAccessToken());
            System.out.println("🔑 Nuevo token generado para " + profile.getEmail() + ": " + profile.getAccessToken());
        }

        Instance instance = new Instance();
        instance.setPolicyId(policyId);
        instance.setProfileId(profile.getId());
        instance.setWorkflow(payload); // Guardamos los datos iniciales aquí
        instance.setStatus("STARTING");

        Instance savedInstance = instanceRepo.save(instance);
    
        policyRun.arrancarMotor(instance,policyService.findById(policyId)); 
        return savedInstance;
    }


    // 🚀 NUEVO MÉTODO COMBINADO
    public List<InstanceResponse> getAllInstancesWithProfiles() {
        List<Instance> instances = instanceRepo.findAll();
        
        return instances.stream().map(instance -> {
            // Buscamos el perfil por su ID
            EphemeralProfile profile = profileRepo.findById(instance.getProfileId()).orElse(null);
            
            // Empaquetamos y devolvemos el DTO
            return new InstanceResponse(instance, profile);
        }).collect(Collectors.toList());
    }


    public Instance completarTareaHumana(String instanceId, String nodeId, Map<String, Object> respuestasFormulario, String userName) {
        // 1. Buscar la instancia que estaba pausada
        Instance instance = instanceRepo.findById(instanceId)
                .orElseThrow(() -> new RuntimeException("Instancia no encontrada"));

    
        String currentNodeId = instance.getCurrentNodeId();
        List<String> pendientes = instance.getPendingNodes();

        // 🚀 LA MAGIA DEL SWAP: Si la tarea que el humano envió NO es la que el motor estaba mirando...
        if (nodeId != null && !nodeId.equals(currentNodeId)) {
            
            // Buscamos si la tarea que envió está en el bolsillo de pendientes
            if (pendientes != null && pendientes.contains(nodeId)) {
                
                pendientes.remove(nodeId); // La sacamos del bolsillo
                
                // Guardamos la tarea que el motor estaba mirando en el bolsillo para no perderla
                if (currentNodeId != null && !pendientes.contains(currentNodeId)) {
                    pendientes.add(currentNodeId); 
                }
                
                // Actualizamos la base de datos
                instance.setPendingNodes(pendientes);
                instance.setCurrentNodeId(nodeId); // Apuntamos a la tarea correcta
                
                System.out.println("🔄 Swap realizado: Motor ahora apunta a la tarea completada -> " + nodeId);
            }
        }

        // 2. Buscar el diagrama original de la política
        Map<String, Object> policyJson = policyService.findById(instance.getPolicyId());

        // 3. Despertar el motor
        Instance instanciaActualizada = processPolicy.continuarMotor(instance, policyJson, respuestasFormulario, userName);

        // 4. Retornar al frontend
        return instanciaActualizada;
    }


    /**
         * Obtiene todas las tareas pendientes de un departamento, 
         * incluyendo la configuración dinámica del nodo actual de cada tarea.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPendingTasksForDepartment(String departmentId) {
        
        List<Map<String, Object>> bandejaList = new ArrayList<>();

        // 1. 🚀 Traemos TODOS los pausados (Porque un trámite paralelo puede estar en varios departamentos a la vez)
        List<Instance> instances = instanceRepo.findByStatus("WAITING_FOR_HUMAN");
        System.out.println("🔍 [BANDEJA] Evaluando " + (instances != null ? instances.size() : 0) + " trámites pausados globales.");
        
        if (instances == null || instances.isEmpty()) return bandejaList; 

        Map<String, Map<String, Object>> cachePoliticas = new HashMap<>();

        for (Instance instance : instances) {
            try {
                // 2. ¿Este trámite involucra a nuestro departamento?
                List<String> deptosActivos = instance.getActiveDepartments();
                if (deptosActivos == null || !deptosActivos.contains(departmentId)) {
                    // Compatibilidad con trámites viejos sin el array
                    if (!departmentId.equals(instance.getCurrentDepartmentId())) continue;
                }

                String policyId = instance.getPolicyId();
                if (policyId == null) continue;

                // 3. Cachear la política
                if (!cachePoliticas.containsKey(policyId)) {
                    Map<String, Object> policy = policyService.getPolicyJsonById(policyId);
                    if (policy == null) continue;
                    cachePoliticas.put(policyId, policy);
                }
                Map<String, Object> policyJson = cachePoliticas.get(policyId);
                List<Map<String, Object>> nodes = (List<Map<String, Object>>) policyJson.get("nodes");
                if (nodes == null) continue;

                // =======================================================
                // 🚀 4. RECOPILAR TODAS LAS RAMAS ACTIVAS DE ESTA INSTANCIA
                // =======================================================
                // =======================================================
                // 🚀 4. RECOPILAR TODAS LAS RAMAS ACTIVAS (SIN DUPLICADOS)
                // =======================================================
                List<String> nodosAEvaluar = new ArrayList<>();
                if (instance.getCurrentNodeId() != null) {
                    nodosAEvaluar.add(instance.getCurrentNodeId());
                }
                
                if (instance.getPendingNodes() != null) {
                    for (String pendingId : instance.getPendingNodes()) {
                        if (!nodosAEvaluar.contains(pendingId)) { // Filtro Anti-Duplicados
                            nodosAEvaluar.add(pendingId);
                        }
                    }
                }

                // 5. Evaluar cada rama para ver si le toca a ESTE departamento
                for (String nodeId : nodosAEvaluar) {
                    Map<String, Object> matchedNode = null;
                    for (Map<String, Object> node : nodes) {
                        if (nodeId.equals(node.get("id"))) {
                            matchedNode = node;
                            break;
                        }
                    }

                    if (matchedNode != null) {
                        // Verificamos de qué departamento es EXCLUSIVAMENTE este nodo (Esta "rama")
                        String swimlaneId = (String) matchedNode.get("swimlaneId");
                        
                        // Buscamos el departamento del nodo
                        List<Map<String, Object>> swimlanes = (List<Map<String, Object>>) policyJson.get("swimlanes");
                        String nodeDeptoId = null;
                        if (swimlanes != null) {
                            for (Map<String, Object> sw : swimlanes) {
                                if (swimlaneId.equals(sw.get("id"))) {
                                    nodeDeptoId = (String) sw.get("departmentId");
                                    break;
                                }
                            }
                        }

                        // ¡Si esta rama específica pertenece al departamento que hace la petición, la agregamos a su bandeja!
                        if (departmentId.equals(nodeDeptoId)) {
                            Map<String, Object> taskResponse = new HashMap<>();
                            taskResponse.put("id", instance.getId()); 
                            taskResponse.put("status", instance.getStatus());
                            taskResponse.put("updatedAt", instance.getUpdatedAt());
                            taskResponse.put("nodeData", matchedNode); 

                            bandejaList.add(taskResponse);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("❌ Error procesando instancia en bandeja: " + e.getMessage());
            }
        }

        System.out.println("📤 [BANDEJA] Se encontraron " + bandejaList.size() + " tareas EXACTAS para el depto: " + departmentId);
        return bandejaList;
    }


    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getInstancesForMobile(String profileId) {
        
        List<Map<String, Object>> listaTramites = new ArrayList<>();
        
        // 1. Buscamos todas las instancias de este ciudadano
        List<Instance> instances = instanceRepo.findByProfileId(profileId);
        
        if (instances == null || instances.isEmpty()) {
            return listaTramites; 
        }

        // Caché temporal para no golpear la base de datos múltiples veces 
        // si el usuario tiene varios trámites del mismo tipo (ej. 3 licencias iguales)
        Map<String, Map<String, Object>> cachePoliticas = new HashMap<>();

        for (Instance instance : instances) {
            try {
                Map<String, Object> tramiteMovil = new HashMap<>();
                
                // ==========================================================
                // 🚀 DATOS PRINCIPALES DE LA INSTANCIA
                // ==========================================================
                tramiteMovil.put("id", instance.getId());
                tramiteMovil.put("status", instance.getStatus());
                tramiteMovil.put("createdAt", instance.getCreatedAt()); 
                tramiteMovil.put("updatedAt", instance.getUpdatedAt()); 
                tramiteMovil.put("currentNodeId", instance.getCurrentNodeId());
                
                // 📦 OBJETOS COMPLETOS (Si son null en la BD, pasarán como null al móvil)
                tramiteMovil.put("history", instance.getHistory());
                tramiteMovil.put("workflow", instance.getWorkflow());

                // ==========================================================
                // 🚀 BÚSQUEDA DIRECTA EN LA COLECCIÓN POLICY
                // ==========================================================
                String policyId = instance.getPolicyId();
                
                // 🛑 ESTRICTAMENTE NULOS por defecto (sin datos inventados)
                String workflowName = null;
                String workflowDescription = null;
                String currentNodeName = null;

                if (policyId != null && !policyId.trim().isEmpty()) {
                    
                    // Buscamos en la colección Policy solo si no la hemos buscado antes en este ciclo
                    if (!cachePoliticas.containsKey(policyId)) {
                        Map<String, Object> policyJson = policyService.findById(policyId);
                        cachePoliticas.put(policyId, policyJson); // Guardamos en memoria (incluso si es null)
                    }

                    Map<String, Object> policy = cachePoliticas.get(policyId);
                    System.out.println("🔍 [MÓVIL] Buscando política para trámite " + instance.getId() + ": " + (policy != null ? "¡Encontrada!" : "No encontrada"));
                    System.out.println("🔍 [MÓVIL] Detalles de la política: " + policy);
                    
                    if (policy != null) {
                        // Obtenemos nombre y descripción reales de la colección Policy
                        if (policy.containsKey("name")) {
                            workflowName = (String) policy.get("name");
                        }
                        if (policy.containsKey("description")) {
                            workflowDescription = (String) policy.get("description");
                        }
                        
                        // Buscamos el nombre del NODO ACTUAL donde está la ficha
                        List<Map<String, Object>> nodes = (List<Map<String, Object>>) policy.get("nodes");
                        if (nodes != null && instance.getCurrentNodeId() != null) {
                            for (Map<String, Object> node : nodes) {
                                if (instance.getCurrentNodeId().equals(node.get("id"))) {
                                    currentNodeName = (String) node.get("name");
                                    break; // Lo encontramos, dejamos de buscar
                                }
                            }
                        }
                    }
                }
                
                // Insertamos los valores al JSON. Si no se encontraron, se insertará un valor 'null'
                tramiteMovil.put("workflowName", workflowName);
                tramiteMovil.put("workflowDescription", workflowDescription);
                tramiteMovil.put("currentNodeName", currentNodeName);
                
                listaTramites.add(tramiteMovil);
                
            } catch (Exception e) {
                System.err.println("❌ Error formateando trámite " + instance.getId() + " para el móvil: " + e.getMessage());
            }
        }

        return listaTramites;
    }



    /*
       @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPendingTasksForDepartment(String realDepartmentId) {
        
        List<Map<String, Object>> bandejaList = new ArrayList<>();

        // ==============================================================================
        // FASE 1: EL ALGORITMO DE MAPEO (Departamento Real -> Lista de Swimlanes)
        // ==============================================================================
        
        List<String> targetSwimlaneIds = new ArrayList<>();
        Map<String, Map<String, Object>> cachePoliticas = new HashMap<>();

        // Obtener TODAS las políticas (ajusta este método según cómo lo tengas en tu policyService)
        List<Map<String, Object>> todasLasPoliticas = policyService.getAllPoliciesJson(); // ⚠️ Ajusta esto a tu código real

        for (Map<String, Object> policyJson : todasLasPoliticas) {
            String policyId = (String) policyJson.get("id"); // Asegúrate de que extraes el ID correctamente
            
            // Guardamos en caché para usarlo en la Fase 3 y ahorrar llamadas a la BD
            cachePoliticas.put(policyId, policyJson);

            Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");
            if (workflow != null && workflow.containsKey("swimlanes")) {
                List<Map<String, Object>> swimlanes = (List<Map<String, Object>>) workflow.get("swimlanes");
                
                for (Map<String, Object> swimlane : swimlanes) {
                    // Comparamos el ID del departamento que nos envió Angular con el del diagrama
                    if (realDepartmentId.equals(swimlane.get("departmentId"))) {
                        // Si coincide, guardamos la referencia interna (swimlaneId)
                        targetSwimlaneIds.add((String) swimlane.get("id"));
                    }
                }
            }
        }

        // Si este departamento no está asignado a ningún carril en ninguna política, devolvemos vacío
        if (targetSwimlaneIds.isEmpty()) {
            return bandejaList; 
        }

        // ==============================================================================
        // FASE 2: BÚSQUEDA EN LA BASE DE DATOS (Usando la lista de Swimlanes)
        // ==============================================================================
        
        // 🚀 Usamos el nuevo método con "In" pasándole el array de referencias
        List<Instance> instances = instanceRepo.findByCurrentDepartmentIdInAndStatus(targetSwimlaneIds, "WAITING_FOR_HUMAN");

        if (instances == null || instances.isEmpty()) {
            return bandejaList;
        }

        // ==============================================================================
        // FASE 3: EXTRACCIÓN DE FORMULARIOS DINÁMICOS
        // ==============================================================================
        
        for (Instance instance : instances) {
            try {
                String policyId = instance.getPolicyId();
                String currentNodeId = instance.getCurrentNodeId();

                // Recuperamos el JSON de la memoria RAM (¡Súper rápido!)
                Map<String, Object> policyJson = cachePoliticas.get(policyId);
                
                if (policyJson == null) continue;

                Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");
                List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("nodes");

                Map<String, Object> matchedNode = null;
                for (Map<String, Object> node : nodes) {
                    if (currentNodeId.equals(node.get("id"))) {
                        matchedNode = node;
                        break;
                    }
                }

                if (matchedNode == null) throw new RuntimeException("Nodo no encontrado en el diagrama.");

                // Preparamos la respuesta para Angular
                Map<String, Object> taskResponse = new HashMap<>();
                taskResponse.put("id", instance.getId()); 
                taskResponse.put("status", instance.getStatus());
                taskResponse.put("updatedAt", instance.getUpdatedAt());
                taskResponse.put("nodeData", matchedNode); // Todo el formFields y configuraciones

                bandejaList.add(taskResponse);

            } catch (Exception e) {
                System.err.println("⚠️ Error procesando instancia [" + instance.getId() + "]: " + e.getMessage());
            }
        }

        return bandejaList;
    }
    */
}