package backend_sprint.backend_sprint.modules.Motor.service;

import java.time.LocalDateTime;
import java.util.ArrayList; // 🚀 NUEVO: Necesario para la lista del historial
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;
import backend_sprint.backend_sprint.modules.Motor.model.Instance;
import backend_sprint.backend_sprint.modules.Motor.repository.EphemeralProfileRepository;
import backend_sprint.backend_sprint.modules.Motor.repository.InstanceRepository;

@Service
public class ProcessPolicy {
    private final EphemeralProfileRepository profileRepo;
    private final InstanceRepository instanceRepo;
    private final SseNotificationService ssenotificationService; 
    private final FcmNotificationService pushService;
        
    public ProcessPolicy(EphemeralProfileRepository profileRepo, 
                         InstanceRepository instanceRepo,
                         SseNotificationService ssenotificationService,
                         FcmNotificationService fcmNotificationService) {
        this.profileRepo = profileRepo;
        this.instanceRepo = instanceRepo;
        this.ssenotificationService = ssenotificationService;
        this.pushService = fcmNotificationService;
    }

    /**
     * Prepara la instancia para entrar al bucle buscando el nodo 'start'
     */
    public Instance arrancarMotor(Instance instance, Map<String, Object> policyJson) {
        System.out.println("\n🚀 --- INICIANDO MOTOR DE FLUJOS ---");
        System.out.println("📄 Trámite ID: " + instance.getId());
        
        String startNodeId = findNodeByType(policyJson, "start");
        System.out.println("📍 Nodo INICIO encontrado. ID: " + startNodeId);

        instance.setCurrentNodeId(startNodeId);
        instance.setStatus("RUNNING");
        
        System.out.println("⚙️ Arrancando ciclo de ejecución (Runner)...");
        return runEngine(instance, policyJson);
    }

    /**
     * El Runner: El bucle que procesa la lógica hasta chocar con un "muro" humano.
     */
    public Instance runEngine(Instance instance, Map<String, Object> policy) {

        
        boolean isPaused = false;
        int stepCount = 0; // Para el log

        // 🚀 NUEVO: Memoria para no crear bucles infinitos
        List<String> ramasProcesadas = new ArrayList<>();

        // 🚀 LIMPIEZA INICIAL: Evita que el nodo actual esté duplicado en la cola de espera
        List<String> inicioPendientes = instance.getPendingNodes();
        if (inicioPendientes != null && inicioPendientes.contains(instance.getCurrentNodeId())) {
            inicioPendientes.remove(instance.getCurrentNodeId());
            instance.setPendingNodes(inicioPendientes);
        }

        while (!isPaused) { // El ciclo siempre corre al menos una vez
            stepCount++;
            String currentId = instance.getCurrentNodeId();
            System.out.println("\n--- 🔄 PASO " + stepCount + " ---");
            System.out.println("➡️ Evaluando Nodo ID: " + currentId);

            ramasProcesadas.add(currentId);

            Map<String, Object> currentNode = findNodeById(policy, currentId);
            
            if (currentNode == null) {
                System.out.println("❌ ERROR FATAL: El nodo " + currentId + " no existe en el JSON de la política.");
                break;
            }

            String type = (String) currentNode.get("type");
            String nodeName = (String) currentNode.get("name");
            System.out.println("📦 Tipo de Nodo: [" + type.toUpperCase() + "] - Nombre: " + nodeName);

            // =======================================================================
            // 🚀 ACTUALIZAR EL DEPARTAMENTO EN CADA NODO
            // Extraemos el swimlane y actualizamos la instancia antes de evaluar qué hace el nodo
            // =======================================================================
            String swimlaneId = (String) currentNode.get("swimlaneId");
            if (swimlaneId != null && !swimlaneId.trim().isEmpty()) {
                Map<String, Object> deptoNode = findLaneById(policy, swimlaneId);
                if (deptoNode != null && deptoNode.get("departmentId") != null) {
                    String currentDeptoId = (String) deptoNode.get("departmentId");
                    
                    // ACUMULAMOS los departamentos para que múltiples bandejas vean el trámite
                    List<String> deptosActivos = instance.getActiveDepartments();
                    if (deptosActivos == null) deptosActivos = new ArrayList<>();
                    if (!deptosActivos.contains(currentDeptoId)) {
                        deptosActivos.add(currentDeptoId);
                    }
                    instance.setActiveDepartments(deptosActivos);
                    
                    instance.setCurrentDepartmentId(currentDeptoId); // Mantenemos compatibilidad
                    System.out.println("📍 Ficha movida al Departamento ID: " + currentDeptoId);
                }
            }

            // =======================================================================
            // 🚀 NUEVO: COMPROBAR SI YA VISITAMOS ESTE NODO ANTES (Evita duplicados)
            // =======================================================================
            boolean nodeAlreadyVisited = false;
            List<Map<String, Object>> history = instance.getHistory();
            if (history != null) {
                for (Map<String, Object> record : history) {
                    if (currentId.equals(record.get("nodeId")) && "SYSTEM_VISITED_NODE".equals(record.get("action"))) {
                        nodeAlreadyVisited = true;
                        break;
                    }
                }
            }

            boolean isResuming = ("action".equals(type) || "actividad".equals(type)) && "RUNNING-1".equals(instance.getStatus());
            
            if (!isResuming && !nodeAlreadyVisited) {
                Map<String, Object> auditRecord = new HashMap<>();
                auditRecord.put("nodeId", currentId);
                auditRecord.put("nodeName", nodeName);
                auditRecord.put("type", type);
                auditRecord.put("departmentId", instance.getCurrentDepartmentId());
                auditRecord.put("timestamp", LocalDateTime.now().toString());
                auditRecord.put("action", "SYSTEM_VISITED_NODE");

                if (history == null) history = new ArrayList<>();
                history.add(auditRecord);
                instance.setHistory(history);
            }
            // =======================================================================

            switch (type) {
                case "start":
                    System.out.println("🟢 Ejecutando INICIO. Buscando siguiente conexión...");
                    instance.setCurrentNodeId(findNextNodeId(policy, currentId, null));
                    System.out.println("🔗 Siguiente salto será al nodo: " + instance.getCurrentNodeId());
                    break;

                case "decision":
                case "if":
                    System.out.println("⚖️ Ejecutando IF/DECISION. Evaluando condiciones...");
                    String resultPort = evaluateCondition(currentNode, instance.getWorkflow());
                    System.out.println("✅ Resultado de la evaluación: Puerto de salida -> " + resultPort);
                    
                    instance.setCurrentNodeId(findNextNodeId(policy, currentId, resultPort));
                    System.out.println("🔗 Siguiente salto será al nodo: " + instance.getCurrentNodeId());
                    break;

                case "merge":
                    System.out.println("🔀 Ejecutando MERGE. Unificando caminos...");
                    instance.setCurrentNodeId(findNextNodeId(policy, currentId, null));
                    System.out.println("🔗 Siguiente salto será al nodo: " + instance.getCurrentNodeId());
                    break;

                case "action":
                case "actividad":
                    if ("RUNNING-1".equals(instance.getStatus())) {
                        System.out.println("🟢 Actividad Humana completada. Buscando siguiente conexión...");
                        String nextNode = findNextNodeId(policy, currentId, null);
                        instance.setCurrentNodeId(nextNode);
                        
                        System.out.println("🔗 Siguiente salto será al nodo: " + instance.getCurrentNodeId());
                        instance.setStatus("RUNNING");
                        break; 
                    }
                    
                    // 🚀 LA MAGIA: Si la tarea ya había sido notificada antes, 
                    // la volvemos a pausar pero en SILENCIO (Sin duplicados ni notificaciones)
                    if (nodeAlreadyVisited && type == "merge") {
                        System.out.println("⏳ La rama paralela [" + nodeName + "] ya está en la bandeja. Esperando en silencio...");
                        isPaused = true;
                        break;
                    }

                    // Si es la PRIMERA VEZ que el motor llega a esta tarea, hace todo el ruido normal:
                    String deptoId = instance.getCurrentDepartmentId();
                    
                    System.out.println("✋ ACTIVIDAD HUMANA REQUERIDA. Pausando motor.");
                    System.out.println("🏢 Asignando trámite al departamento ID: " + deptoId);
                    
                    instance.setStatus("WAITING_FOR_HUMAN");
                    
                    ssenotificationService.notifyDepartment(deptoId, "Nueva tarea pendiente: " + nodeName);
                    System.out.println("🔔 Notificación SSE enviada al departamento.");

                    EphemeralProfile userProfile = profileRepo.findById(instance.getProfileId()).orElse(null);
                    if (userProfile != null) {
                        pushService.sendPushNotification(
                            userProfile.getFcmToken(), 
                            "Actualización de Trámite", 
                            "Su trámite ha avanzado a la etapa: " + nodeName
                        );
                        System.out.println("📱 Push Notification enviada al ciudadano.");
                    }
                    
                    isPaused = true; 
                    break;
                    
                case "fork":
                    System.out.println("🔀 NODO FORK ALCANZADO: Dividiendo el flujo...");
                    
                    List<String> nuevasRamas = findAllNextNodeIds(policy, currentId);
                    
                    if (!nuevasRamas.isEmpty()) {
                        // El hilo principal sigue por la primera rama
                        instance.setCurrentNodeId(nuevasRamas.get(0));
                        System.out.println("🔗 Siguiente salto principal será al nodo: " + nuevasRamas.get(0));
                        
                        // Las demás ramas las guardamos en la cola de espera de la base de datos
                        if (nuevasRamas.size() > 1) {
                            List<String> pendientes = instance.getPendingNodes();
                            if (pendientes == null) pendientes = new ArrayList<>();
                            pendientes.addAll(nuevasRamas.subList(1, nuevasRamas.size()));
                            instance.setPendingNodes(pendientes);
                            System.out.println("   ▶ " + (nuevasRamas.size() - 1) + " rama(s) enviadas a la cola de espera.");
                        }
                    }
                    break;

                case "join":
                    System.out.println("🔀 NODO JOIN ALCANZADO: Sincronizando ramas...");
                    
                    int requiredEdges = countIncomingEdges(policy, currentId);
                    
                    Map<String, Integer> state = instance.getJoinState();
                    if (state == null) state = new HashMap<>();
                    
                    // Sumamos 1 a las ramas que ya habían llegado a este nodo
                    int arrived = state.getOrDefault(currentId, 0) + 1;
                    state.put(currentId, arrived);
                    instance.setJoinState(state); // Actualizamos la BD
                    
                    if (arrived >= requiredEdges) {
                        System.out.println("✅ JOIN: Todas las ramas (" + arrived + "/" + requiredEdges + ") llegaron. Unificando flujo...");
                        // Limpiamos la memoria de este Join por si el diagrama tiene ciclos y vuelve a pasar por aquí
                        state.remove(currentId);
                        instance.setJoinState(state);
                        
                        // Levantamos la barrera y avanzamos al siguiente nodo
                        instance.setCurrentNodeId(findNextNodeId(policy, currentId, null));
                        System.out.println("🔗 Siguiente salto será al nodo: " + instance.getCurrentNodeId());
                    } else {
                        System.out.println("⏳ JOIN: Rama en espera (" + arrived + "/" + requiredEdges + "). Faltan ramas por llegar.");
                        // Pausamos el motor en esta rama. ¡El interceptor se encargará de despertar las demás!
                        isPaused = true;
                    }
                    break;

                case "end":
                    System.out.println("🛑 NODO FIN ALCANZADO. Terminando trámite.");
                    instance.setStatus("COMPLETED");
                    
                    EphemeralProfile profile = profileRepo.findById(instance.getProfileId()).orElse(null);
                    if (profile != null) {
                        profile.setTokenExpiresAt(LocalDateTime.now().plusDays(5));
                        profileRepo.save(profile);
                        
                        pushService.sendPushNotification(
                            profile.getFcmToken(), 
                            "¡Trámite Finalizado!", 
                            "Su trámite ha concluido exitosamente. Tiene 5 días para descargar sus documentos."
                        );
                        System.out.println("📱 Push Notification final enviada al ciudadano.");
                    }
                    
                    isPaused = true;
                    break;

                default:
                    System.out.println("⚠️ TIPO DE NODO DESCONOCIDO: " + type + ". Pausando motor por seguridad.");
                    isPaused = true;
                    break;
            }

            // =======================================================================
            // 🚀 INTERCEPTOR DE PARALELISMO
            // Si una rama se pausó, verificamos si hay otra esperando antes de apagar el motor
            // =======================================================================
            


            // =======================================================================
            // 🚀 INTERCEPTOR DE PARALELISMO (CORREGIDO PARA JOIN)
            // =======================================================================
            if (isPaused) {
                List<String> pendientes = instance.getPendingNodes();
                if (pendientes != null && !pendientes.isEmpty()) {
                    
                    // 1. Buscamos una rama en la cola que NO hayamos evaluado en este ciclo
                    String ramaParaRetomar = null;
                    for (int i = 0; i < pendientes.size(); i++) {
                        if (!ramasProcesadas.contains(pendientes.get(i))) {
                            ramaParaRetomar = pendientes.remove(i);
                            break;
                        }
                    }

                    if (ramaParaRetomar != null) {
                        System.out.println("🔄 Pausando rama actual. Retomando paralela: " + ramaParaRetomar);
                        
                        // 🚀 LA MAGIA ANTI-BUG: 
                        // Solo guardamos la rama actual en pendientes si NO ES UN JOIN.
                        // Si es un Join, esa rama debe desaparecer de la cola.
                        if (!type.equals("join") && !type.equals("merge") && !pendientes.contains(currentId)) {
                            pendientes.add(currentId); 
                        }
                        
                        instance.setPendingNodes(pendientes);
                        instance.setCurrentNodeId(ramaParaRetomar);
                        isPaused = false; // ¡El motor sigue girando para evaluar la otra rama!
                        
                    } else {
                        // Si ya no hay ramas paralelas por evaluar y el motor se va a apagar por completo:
                        // Aseguramos que la tarea actual se guarde (A MENOS que sea un Join)
                        if (!type.equals("join") && !type.equals("merge") && !pendientes.contains(currentId)) {
                            pendientes.add(currentId);
                            instance.setPendingNodes(pendientes);
                        }
                    }
                }
            }



            /*
            if (isPaused) {
                List<String> pendientes = instance.getPendingNodes();
                if (pendientes != null && !pendientes.isEmpty()) {
                    
                    if (!type.equals("join") && !pendientes.contains(currentId)) {
                        pendientes.add(currentId);
                    }
                    // Buscamos una rama en la cola que NO hayamos evaluado en este ciclo
                    String ramaParaRetomar = null;
                    for (int i = 0; i < pendientes.size(); i++) {
                        if (!ramasProcesadas.contains(pendientes.get(i))) {
                            ramaParaRetomar = pendientes.remove(i);
                            break;
                        }
                    }

                    if (ramaParaRetomar != null) {
                        System.out.println("🔄 Pausando rama principal. Retomando paralela: " + ramaParaRetomar);
                        
                        // 🚀 AQUÍ ESTÁ LA MAGIA: Guardamos la rama actual antes de cambiarla
                        pendientes.add(currentId); 
                        instance.setPendingNodes(pendientes);
                        
                        instance.setCurrentNodeId(ramaParaRetomar);
                        isPaused = false; // ¡El motor sigue girando!
                    } 
                    // Si ramaParaRetomar es null, significa que TODAS las ramas ya están pausadas. 
                    // El ciclo termina naturalmente.

                }
            }
            */
        }

        
        System.out.println("💾 Guardando estado final de la instancia en MongoDB...");
        System.out.println("🏁 --- CICLO DEL MOTOR FINALIZADO ---\n");
        return instanceRepo.save(instance);
    }


    /**
     * 🚀 NUEVO: Método para reanudar el flujo después de una tarea humana
     */
    public Instance continuarMotor(Instance instance, Map<String, Object> policyJson, Map<String, Object> formData) {
        System.out.println("\n▶️ --- DESPERTANDO MOTOR ---");
        System.out.println("📄 Trámite ID: " + instance.getId());
        System.out.println("📥 Respuesta de la tarea: " + formData);

        // 1. SEGURIDAD: Inicializar el map si viene nulo desde la base de datos
        if (instance.getWorkflow() == null) {
            instance.setWorkflow(new HashMap<>());
        }

        // 2. Guardar las respuestas del formulario en la instancia
        if (formData != null) {
            // A) Actualizamos el estado actual (para que el motor pueda evaluar IFs)
            instance.getWorkflow().putAll(formData);
            System.out.println("💾 Datos del formulario inyectados a la instancia actual.");

            // =======================================================================
            // 🚀 NUEVO: SISTEMA DE AUDITORÍA (Guardar cada envío sin sobrescribir)
            // =======================================================================
            Map<String, Object> submissionRecord = new HashMap<>();
            submissionRecord.put("nodeId", instance.getCurrentNodeId());
            submissionRecord.put("action", "USER_SUBMIT");
            submissionRecord.put("timestamp", LocalDateTime.now().toString());
            submissionRecord.put("departmentId", instance.getCurrentDepartmentId());
            submissionRecord.put("submittedData", formData); // <-- ¡Aquí se guarda el historial eterno!

            List<Map<String, Object>> history = instance.getHistory();
            if (history == null) history = new ArrayList<>();
            history.add(submissionRecord);
            instance.setHistory(history);
            // =======================================================================
        }

        try {

            instance.setStatus("RUNNING-1"); // Le quitamos el estado de "Pausa"
            // 3. Mover el puntero al SIGUIENTE nodo
            String currentNodeId = instance.getCurrentNodeId();
        
            System.out.println("⏭️ Saliendo de Actividad Humana (" + currentNodeId + ")");

            // 4. Volver a encender el bucle mágico (El Verdadero Motor)
            return runEngine(instance, policyJson);
            
        } catch (Exception e) {
            System.err.println("💥 [MOTOR FATAL ERROR] Falló al avanzar de nodo: " + e.getMessage());
            e.printStackTrace(); 
            throw new RuntimeException("Error en el motor al evaluar el diagrama: " + e.getMessage());
        }
    }

    // --- Mapeo Lógico del JSON de JointJS ---

    private String findNextNodeId(Map<String, Object> policy, String sourceId, String portId) {
        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");
        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        for (Map<String, Object> edge : edges) {
            if (edge.get("sourceNodeId").equals(sourceId)) {
                if (portId == null || edge.get("sourcePort").equals(portId)) {
                    return (String) edge.get("targetNodeId");
                }
            }
        }
        
        System.out.println("🚨 ADVERTENCIA: No se encontró ninguna flecha (edge) saliendo del nodo " + sourceId + (portId != null ? " por el puerto " + portId : ""));
        return null;
    }

    private String evaluateCondition(Map<String, Object> node, Map<String, Object> payload) {
        Map<String, Object> config = (Map<String, Object>) node.get("configuration");
        Map<String, Object> logic = (Map<String, Object>) config.get("logic");

        String variable = (String) logic.get("variable");
        String operator = (String) logic.get("operator");
        Object targetValue = logic.get("value");
        
        Object actualValue = null;
        if (payload != null) {
            actualValue = payload.get(variable);
            if (actualValue == null && payload.containsKey("nodo")) {
                Map<String, Object> nodoData = (Map<String, Object>) payload.get("nodo");
                if (nodoData != null) {
                    actualValue = nodoData.get(variable);
                }
            }
        }

        System.out.println("   🔍 Evaluando variable: [" + variable + "]");
        System.out.println("      ▶ Valor esperado (Diagrama) : " + targetValue);
        System.out.println("      ▶ Valor real (Formulario)   : " + actualValue);
        System.out.println("      ▶ Operador                  : " + operator);

        boolean test = compareValues(actualValue, operator, targetValue);
        return test ? "out-true" : "out-false";
    }

    private Map<String, Object> findNodeById(Map<String, Object> policyJson, String nodeId) {
        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");
        if (workflow != null) {
            List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("nodes");
            if (nodes != null) {
                for (Map<String, Object> node : nodes) {
                    if (nodeId.equals(node.get("id"))) {
                        return node;
                    }
                }
            }
        }
        return null;
    }


    private Map<String, Object> findLaneById(Map<String, Object> policyJson, String nodeId) {
        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");
        if (workflow != null) {
            List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("swimlanes");
            if (nodes != null) {
                for (Map<String, Object> node : nodes) {
                    if (nodeId.equals(node.get("id"))) {
                        return node;
                    }
                }
            }
        }
        return null;
    }

    private String findNodeByType(Map<String, Object> policyJson, String type) {
        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");
        if (workflow != null) {
            List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("nodes");
            if (nodes != null) {
                for (Map<String, Object> node : nodes) {
                    if (type.equals(node.get("type"))) {
                        return (String) node.get("id");
                    }
                }
            }
        }
        return null;
    }

    private boolean compareValues(Object actualValue, String operator, Object targetValue) {
        if (actualValue == null || targetValue == null) return false;

        try {
            double val1 = Double.parseDouble(actualValue.toString());
            double val2 = Double.parseDouble(targetValue.toString());

            switch (operator) {
                case "==": return val1 == val2;
                case ">": return val1 > val2;
                case "<": return val1 < val2;
                case ">=": return val1 >= val2;
                case "<=": return val1 <= val2;
                default: return false;
            }
        } catch (NumberFormatException e) {
            if ("==".equals(operator)) {
                return actualValue.toString().equalsIgnoreCase(targetValue.toString());
            } else if ("contains".equals(operator)) {
                return actualValue.toString().toLowerCase().contains(targetValue.toString().toLowerCase());
            }
            return false;
        }
    }



    /**
     * 🚀 BUSCADOR FORK: Encuentra TODAS las flechas que salen de un nodo.
     */
    private List<String> findAllNextNodeIds(Map<String, Object> policy, String sourceId) {
        List<String> targets = new ArrayList<>();
        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");
        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        for (Map<String, Object> edge : edges) {
            if (edge.get("sourceNodeId").equals(sourceId)) {
                targets.add((String) edge.get("targetNodeId"));
            }
        }
        return targets;
    }


    /**
     * 🚀 BUSCADOR JOIN: Cuenta cuántas flechas ENTRAN a un nodo específico
     */
    private int countIncomingEdges(Map<String, Object> policy, String targetId) {
        int count = 0;
        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");
        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        if (edges != null) {
            for (Map<String, Object> edge : edges) {
                if (targetId.equals(edge.get("targetNodeId"))) {
                    count++;
                }
            }
        }
        return count;
    }
}