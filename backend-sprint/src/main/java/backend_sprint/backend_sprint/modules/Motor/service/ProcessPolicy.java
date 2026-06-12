package backend_sprint.backend_sprint.modules.Motor.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.DepartamentRepository;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service.BitacoraService;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service.FcmNotificationService;
import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;
import backend_sprint.backend_sprint.modules.Motor.model.Instance;
import backend_sprint.backend_sprint.modules.Motor.repository.EphemeralProfileRepository;
import backend_sprint.backend_sprint.modules.Motor.repository.InstanceRepository;

@Service
public class ProcessPolicy {

    private static final int MAX_ENGINE_STEPS = 500;

    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_RESUMING = "RUNNING-1";
    private static final String STATUS_WAITING_FOR_HUMAN = "WAITING_FOR_HUMAN";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_ENGINE_ERROR = "ENGINE_ERROR";

    private final EphemeralProfileRepository profileRepo;
    private final InstanceRepository instanceRepo;
    private final SseNotificationService ssenotificationService;
    private final FcmNotificationService pushService;
    private final BitacoraService bitacoraService;
    private final DepartamentRepository dptoRepository;

    public ProcessPolicy(
            EphemeralProfileRepository profileRepo,
            InstanceRepository instanceRepo,
            SseNotificationService ssenotificationService,
            FcmNotificationService fcmNotificationService,
            BitacoraService bitacoraService,
            DepartamentRepository dptoRepository
    ) {
        this.profileRepo = profileRepo;
        this.instanceRepo = instanceRepo;
        this.ssenotificationService = ssenotificationService;
        this.pushService = fcmNotificationService;
        this.bitacoraService = bitacoraService;
        this.dptoRepository = dptoRepository;
    }

    /**
     * Prepara la instancia para entrar al bucle buscando el nodo start.
     */
    public Instance arrancarMotor(Instance instance, Map<String, Object> policyJson) {
        System.out.println("\n🚀 --- INICIANDO MOTOR DE FLUJOS ---");
        System.out.println("📄 Trámite ID: " + instance.getId());

        String startNodeId = findNodeByType(policyJson, "start");

        if (startNodeId == null || startNodeId.trim().isEmpty()) {
            System.out.println("❌ ERROR: No se encontró nodo start en la política.");
            instance.setStatus(STATUS_ENGINE_ERROR);
            return instanceRepo.save(instance);
        }

        System.out.println("📍 Nodo INICIO encontrado. ID: " + startNodeId);

        instance.setCurrentNodeId(startNodeId);
        instance.setStatus(STATUS_RUNNING);

        System.out.println("⚙️ Arrancando ciclo de ejecución...");
        return runEngine(instance, policyJson);
    }

    /**
     * Runner principal: ejecuta nodos automáticos hasta encontrar una actividad humana,
     * un final, un join pendiente o un error controlado.
     */
    public Instance runEngine(Instance instance, Map<String, Object> policy) {
        boolean isPaused = false;
        int stepCount = 0;

        List<String> ramasProcesadas = new ArrayList<>();

        limpiarNodoActualDePendientes(instance);

        while (!isPaused) {
            stepCount++;

            if (stepCount > MAX_ENGINE_STEPS) {
                System.out.println("❌ ERROR: El motor superó el máximo de pasos permitidos. Posible ciclo infinito.");
                instance.setStatus(STATUS_ENGINE_ERROR);
                break;
            }

            String currentId = instance.getCurrentNodeId();

            System.out.println("\n--- 🔄 PASO " + stepCount + " ---");
            System.out.println("➡️ Evaluando Nodo ID: " + currentId);

            if (currentId == null || currentId.trim().isEmpty()) {
                System.out.println("❌ ERROR: currentNodeId es null o vacío. Pausando motor.");
                instance.setStatus(STATUS_ENGINE_ERROR);
                break;
            }

            ramasProcesadas.add(currentId);

            Map<String, Object> currentNode = findNodeById(policy, currentId);

            if (currentNode == null) {
                System.out.println("❌ ERROR FATAL: El nodo " + currentId + " no existe en el JSON de la política.");
                instance.setStatus(STATUS_ENGINE_ERROR);
                break;
            }

            String type = safeString(currentNode.get("type"));
            String nodeName = safeString(currentNode.get("name"));

            System.out.println("📦 Tipo de Nodo: [" + type.toUpperCase() + "] - Nombre: " + nodeName);

            actualizarDepartamentoActual(instance, policy, currentNode);

            boolean nodeAlreadyVisited = wasNodeAlreadyVisited(instance, currentId);
            boolean isResuming = isHumanNode(type) && STATUS_RESUMING.equals(instance.getStatus());

            if (!isResuming && !nodeAlreadyVisited) {
                registrarVisitaSistema(instance, currentId, nodeName, type);
            }

            switch (type) {
                case "start":
                    System.out.println("🟢 Ejecutando INICIO. Buscando siguiente conexión...");
                    if (!moveToNextNode(instance, policy, currentId, null)) {
                        isPaused = true;
                    }
                    break;

                case "decision":
                case "if":
                    System.out.println("⚖️ Ejecutando IF/DECISION. Evaluando condiciones...");
                    String resultPort = evaluateCondition(currentNode, instance.getWorkflow());
                    System.out.println("✅ Resultado de la evaluación: Puerto de salida -> " + resultPort);

                    if (!moveToNextNode(instance, policy, currentId, resultPort)) {
                        isPaused = true;
                    }
                    break;

                case "merge":
                    System.out.println("🔀 Ejecutando MERGE. Unificando caminos...");
                    if (!moveToNextNode(instance, policy, currentId, null)) {
                        isPaused = true;
                    }
                    break;

                case "action":
                case "actividad":
                    isPaused = handleHumanActivity(
                            instance,
                            policy,
                            currentNode,
                            currentId,
                            nodeName,
                            nodeAlreadyVisited
                    );
                    break;

                case "fork":
                    System.out.println("🔀 NODO FORK ALCANZADO: Dividiendo el flujo...");
                    handleFork(instance, policy, currentId);
                    break;

                case "join":
                    System.out.println("🔀 NODO JOIN ALCANZADO: Sincronizando ramas...");
                    isPaused = handleJoin(instance, policy, currentId);
                    break;

                case "end":
                    System.out.println("🛑 NODO FIN ALCANZADO. Terminando trámite.");
                    handleEnd(instance);
                    isPaused = true;
                    break;

                default:
                    System.out.println("⚠️ TIPO DE NODO DESCONOCIDO: " + type + ". Pausando motor por seguridad.");
                    instance.setStatus(STATUS_ENGINE_ERROR);
                    isPaused = true;
                    break;
            }

            if (isPaused) {
                isPaused = handleParallelInterceptor(instance, ramasProcesadas, currentId, type);
            }
        }

        System.out.println("💾 Guardando estado final de la instancia en MongoDB...");
        System.out.println("🏁 --- CICLO DEL MOTOR FINALIZADO ---\n");

        return instanceRepo.save(instance);
    }

    /**
     * Reanuda el flujo después de una tarea humana.
     */
    public Instance continuarMotor(
            Instance instance,
            Map<String, Object> policyJson,
            Map<String, Object> formData,
            String userName
    ) {
        System.out.println("\n▶️ --- DESPERTANDO MOTOR ---");
        System.out.println("📄 Trámite ID: " + instance.getId());
        System.out.println("📥 Respuesta de la tarea: " + formData);

        if (instance.getWorkflow() == null) {
            instance.setWorkflow(new HashMap<>());
        }

        if (formData != null) {
            instance.getWorkflow().putAll(formData);
            System.out.println("💾 Datos del formulario inyectados a la instancia actual.");

            registrarEnvioUsuario(instance, formData);
            actualizarBitacoraAnalitica(instance, formData, userName);
        }

        try {
            instance.setStatus(STATUS_RESUMING);

            String currentNodeId = instance.getCurrentNodeId();
            System.out.println("⏭️ Saliendo de Actividad Humana (" + currentNodeId + ")");

            return runEngine(instance, policyJson);

        } catch (Exception e) {
            System.err.println("💥 [MOTOR FATAL ERROR] Falló al avanzar de nodo: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error en el motor al evaluar el diagrama: " + e.getMessage());
        }
    }

    // ==========================================================
    // MANEJADORES PRINCIPALES
    // ==========================================================

    private boolean handleHumanActivity(
            Instance instance,
            Map<String, Object> policy,
            Map<String, Object> currentNode,
            String currentId,
            String nodeName,
            boolean nodeAlreadyVisited
    ) {
        String deptoId = instance.getCurrentDepartmentId();

        if (!nodeAlreadyVisited) {
            registrarAsignacionBitacora(instance, policy, currentNode, deptoId);
        }

        System.out.println("✋ ACTIVIDAD HUMANA REQUERIDA.");

        if (STATUS_RESUMING.equals(instance.getStatus())) {
            System.out.println("🟢 Actividad humana completada. Buscando siguiente conexión...");

            boolean moved = moveToNextNode(instance, policy, currentId, null);

            if (moved) {
                instance.setStatus(STATUS_RUNNING);
                return false;
            }

            return true;
        }

        if (nodeAlreadyVisited) {
            System.out.println("⏳ La actividad [" + nodeName + "] ya fue registrada/notificada. Esperando en silencio...");
            return true;
        }

        System.out.println("✋ Pausando motor.");
        System.out.println("🏢 Asignando trámite al departamento ID: " + deptoId);

        instance.setStatus(STATUS_WAITING_FOR_HUMAN);

        if (deptoId != null && !deptoId.trim().isEmpty()) {
            ssenotificationService.notifyDepartment(deptoId, "Nueva tarea pendiente: " + nodeName);
            System.out.println("🔔 Notificación SSE enviada al departamento.");
        } else {
            System.out.println("⚠️ No se envió SSE porque el departamento actual es null.");
        }

        EphemeralProfile userProfile = profileRepo.findById(instance.getProfileId()).orElse(null);

        if (userProfile != null) {
            pushService.sendPushNotification(
                    userProfile.getFcmToken(),
                    "Actualización de Trámite",
                    "Su trámite ha avanzado a la etapa: " + nodeName
            );
            System.out.println("📱 Push Notification enviada al ciudadano.");
        }

        return true;
    }

    private void handleFork(Instance instance, Map<String, Object> policy, String currentId) {
        List<String> nuevasRamas = findAllNextNodeIds(policy, currentId);

        if (nuevasRamas.isEmpty()) {
            System.out.println("🚨 ADVERTENCIA: Fork sin salidas. El motor quedará pausado por seguridad.");
            instance.setStatus(STATUS_ENGINE_ERROR);
            return;
        }

        instance.setCurrentNodeId(nuevasRamas.get(0));
        System.out.println("🔗 Siguiente salto principal será al nodo: " + nuevasRamas.get(0));

        if (nuevasRamas.size() > 1) {
            List<String> pendientes = instance.getPendingNodes();
            if (pendientes == null) {
                pendientes = new ArrayList<>();
            }

            for (String rama : nuevasRamas.subList(1, nuevasRamas.size())) {
                if (!pendientes.contains(rama)) {
                    pendientes.add(rama);
                }
            }

            instance.setPendingNodes(pendientes);
            System.out.println("   ▶ " + (nuevasRamas.size() - 1) + " rama(s) enviadas a la cola de espera.");
        }
    }

    private boolean handleJoin(Instance instance, Map<String, Object> policy, String currentId) {
        int requiredEdges = countIncomingEdges(policy, currentId);

        if (requiredEdges <= 0) {
            System.out.println("⚠️ JOIN sin entradas detectadas. Se intentará avanzar por seguridad.");
            return !moveToNextNode(instance, policy, currentId, null);
        }

        Map<String, Integer> state = instance.getJoinState();
        if (state == null) {
            state = new HashMap<>();
        }

        int arrived = state.getOrDefault(currentId, 0) + 1;
        state.put(currentId, arrived);
        instance.setJoinState(state);

        if (arrived >= requiredEdges) {
            System.out.println("✅ JOIN: Todas las ramas (" + arrived + "/" + requiredEdges + ") llegaron. Unificando flujo...");

            state.remove(currentId);
            instance.setJoinState(state);

            boolean moved = moveToNextNode(instance, policy, currentId, null);
            return !moved;
        }

        System.out.println("⏳ JOIN: Rama en espera (" + arrived + "/" + requiredEdges + "). Faltan ramas por llegar.");
        return true;
    }

    private void handleEnd(Instance instance) {
        instance.setStatus(STATUS_COMPLETED);

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
    }

    /**
     * Si una rama se pausa, intenta retomar otra rama paralela pendiente.
     * Devuelve true si el motor debe seguir pausado.
     * Devuelve false si encontró otra rama y debe seguir ejecutando.
     */
    private boolean handleParallelInterceptor(
            Instance instance,
            List<String> ramasProcesadas,
            String currentId,
            String type
    ) {
        List<String> pendientes = instance.getPendingNodes();

        if (pendientes == null || pendientes.isEmpty()) {
            return true;
        }

        String ramaParaRetomar = null;

        for (int i = 0; i < pendientes.size(); i++) {
            String candidate = pendientes.get(i);

            if (!ramasProcesadas.contains(candidate)) {
                ramaParaRetomar = pendientes.remove(i);
                break;
            }
        }

        if (ramaParaRetomar != null) {
            System.out.println("🔄 Pausando rama actual. Retomando paralela: " + ramaParaRetomar);

            if (shouldKeepCurrentNodePending(type) && !pendientes.contains(currentId)) {
                pendientes.add(currentId);
            }

            instance.setPendingNodes(pendientes);
            instance.setCurrentNodeId(ramaParaRetomar);

            return false;
        }

        if (shouldKeepCurrentNodePending(type) && !pendientes.contains(currentId)) {
            pendientes.add(currentId);
            instance.setPendingNodes(pendientes);
        }

        return true;
    }

    private boolean shouldKeepCurrentNodePending(String type) {
        return !"join".equals(type) && !"merge".equals(type);
    }

    // ==========================================================
    // AUDITORÍA / BITÁCORA
    // ==========================================================

    private void registrarVisitaSistema(
            Instance instance,
            String currentId,
            String nodeName,
            String type
    ) {
        Map<String, Object> auditRecord = new HashMap<>();
        auditRecord.put("nodeId", currentId);
        auditRecord.put("nodeName", nodeName);
        auditRecord.put("type", type);
        auditRecord.put("departmentId", instance.getCurrentDepartmentId());
        auditRecord.put("timestamp", LocalDateTime.now().toString());
        auditRecord.put("action", "SYSTEM_VISITED_NODE");

        List<Map<String, Object>> history = instance.getHistory();

        if (history == null) {
            history = new ArrayList<>();
        }

        history.add(auditRecord);
        instance.setHistory(history);
    }

    private void registrarEnvioUsuario(Instance instance, Map<String, Object> formData) {
        Map<String, Object> submissionRecord = new HashMap<>();

        String currentId = instance.getCurrentNodeId();

        submissionRecord.put("nodeId", currentId);
        submissionRecord.put("action", "USER_SUBMIT");
        submissionRecord.put("timestamp", LocalDateTime.now().toString());
        submissionRecord.put("departmentId", instance.getCurrentDepartmentId());
        submissionRecord.put("submittedData", formData);

        List<Map<String, Object>> history = instance.getHistory();

        if (history == null) {
            history = new ArrayList<>();
        }

        history.add(submissionRecord);
        instance.setHistory(history);
    }

    private void registrarAsignacionBitacora(
            Instance instance,
            Map<String, Object> policy,
            Map<String, Object> currentNode,
            String deptoId
    ) {
        try {
            String deptoName = "Departamento Desconocido";

            if (deptoId != null && !deptoId.trim().isEmpty()) {
                var deptoObj = dptoRepository.findById(deptoId).orElse(null);
                if (deptoObj != null) {
                    deptoName = deptoObj.getName();
                }
            }

            String policyName = safeString(policy.get("name"));

            bitacoraService.logBitacoraAssignment(
                    instance,
                    currentNode,
                    deptoId,
                    deptoName,
                    policyName
            );

        } catch (Exception e) {
            System.out.println("⚠️ Error no fatal al registrar asignación en bitácora: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void actualizarBitacoraAnalitica(
            Instance instance,
            Map<String, Object> formData,
            String userName
    ) {
        try {
            boolean hasMedia = false;

            if (formData.containsKey("nodo")) {
                Object nodoRaw = formData.get("nodo");

                if (nodoRaw instanceof Map<?, ?>) {
                    Map<String, Object> nodoInfo = (Map<String, Object>) nodoRaw;
                    hasMedia = nodoInfo.containsKey("media") && nodoInfo.get("media") != null;
                }
            }

            String action = "SUBMITTED";

            bitacoraService.updateTaskCompletion(
                    instance.getId(),
                    instance.getCurrentNodeId(),
                    userName,
                    action,
                    hasMedia
            );

        } catch (Exception e) {
            System.out.println("⚠️ Error no fatal al actualizar la bitácora analítica: " + e.getMessage());
        }
    }

    private boolean wasNodeAlreadyVisited(Instance instance, String currentId) {
        List<Map<String, Object>> history = instance.getHistory();

        if (history == null) {
            return false;
        }

        for (Map<String, Object> record : history) {
            if (
                    currentId.equals(record.get("nodeId"))
                            && "SYSTEM_VISITED_NODE".equals(record.get("action"))
            ) {
                return true;
            }
        }

        return false;
    }

    // ==========================================================
    // DEPARTAMENTOS / SWIMLANES
    // ==========================================================

    private void actualizarDepartamentoActual(
            Instance instance,
            Map<String, Object> policy,
            Map<String, Object> currentNode
    ) {
        String swimlaneId = safeString(currentNode.get("swimlaneId"));

        if (swimlaneId == null || swimlaneId.trim().isEmpty()) {
            return;
        }

        Map<String, Object> deptoNode = findLaneById(policy, swimlaneId);

        if (deptoNode == null || deptoNode.get("departmentId") == null) {
            return;
        }

        String currentDeptoId = safeString(deptoNode.get("departmentId"));

        if (currentDeptoId == null || currentDeptoId.trim().isEmpty()) {
            return;
        }

        List<String> deptosActivos = instance.getActiveDepartments();

        if (deptosActivos == null) {
            deptosActivos = new ArrayList<>();
        }

        if (!deptosActivos.contains(currentDeptoId)) {
            deptosActivos.add(currentDeptoId);
        }

        instance.setActiveDepartments(deptosActivos);
        instance.setCurrentDepartmentId(currentDeptoId);

        System.out.println("📍 Ficha movida al Departamento ID: " + currentDeptoId);
    }

    // ==========================================================
    // NAVEGACIÓN DEL WORKFLOW
    // ==========================================================

    private boolean moveToNextNode(
            Instance instance,
            Map<String, Object> policy,
            String currentId,
            String portId
    ) {
        String nextNodeId = findNextNodeId(policy, currentId, portId);

        if (nextNodeId == null || nextNodeId.trim().isEmpty()) {
            System.out.println("🚨 ERROR: No se pudo avanzar desde el nodo " + currentId);
            instance.setStatus(STATUS_ENGINE_ERROR);
            return false;
        }

        instance.setCurrentNodeId(nextNodeId);
        System.out.println("🔗 Siguiente salto será al nodo: " + nextNodeId);

        return true;
    }

    @SuppressWarnings("unchecked")
    private String findNextNodeId(Map<String, Object> policy, String sourceId, String portId) {
        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");

        if (workflow == null) {
            System.out.println("🚨 ADVERTENCIA: La política no contiene workflow.");
            return null;
        }

        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        if (edges == null || edges.isEmpty()) {
            System.out.println("🚨 ADVERTENCIA: El workflow no contiene edges.");
            return null;
        }

        for (Map<String, Object> edge : edges) {
            if (sourceId.equals(edge.get("sourceNodeId"))) {
                if (portId == null || portId.equals(edge.get("sourcePort"))) {
                    return safeString(edge.get("targetNodeId"));
                }
            }
        }

        System.out.println(
                "🚨 ADVERTENCIA: No se encontró ninguna flecha saliendo del nodo "
                        + sourceId
                        + (portId != null ? " por el puerto " + portId : "")
        );

        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> findAllNextNodeIds(Map<String, Object> policy, String sourceId) {
        List<String> targets = new ArrayList<>();

        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");

        if (workflow == null) {
            return targets;
        }

        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        if (edges == null) {
            return targets;
        }

        for (Map<String, Object> edge : edges) {
            if (sourceId.equals(edge.get("sourceNodeId"))) {
                String targetId = safeString(edge.get("targetNodeId"));

                if (targetId != null && !targetId.trim().isEmpty()) {
                    targets.add(targetId);
                }
            }
        }

        return targets;
    }

    @SuppressWarnings("unchecked")
    private int countIncomingEdges(Map<String, Object> policy, String targetId) {
        int count = 0;

        Map<String, Object> workflow = (Map<String, Object>) policy.get("workflow");

        if (workflow == null) {
            return count;
        }

        List<Map<String, Object>> edges = (List<Map<String, Object>>) workflow.get("edges");

        if (edges == null) {
            return count;
        }

        for (Map<String, Object> edge : edges) {
            if (targetId.equals(edge.get("targetNodeId"))) {
                count++;
            }
        }

        return count;
    }

    // ==========================================================
    // EVALUACIÓN DE CONDICIONES
    // ==========================================================

    @SuppressWarnings("unchecked")
    private String evaluateCondition(Map<String, Object> node, Map<String, Object> payload) {
        Map<String, Object> config = (Map<String, Object>) node.get("configuration");

        if (config == null) {
            System.out.println("⚠️ Nodo de decisión sin configuration. Tomando salida falsa.");
            return "out-false";
        }

        Map<String, Object> logic = (Map<String, Object>) config.get("logic");

        if (logic == null) {
            System.out.println("⚠️ Nodo de decisión sin logic. Tomando salida falsa.");
            return "out-false";
        }

        String variable = safeString(logic.get("variable"));
        String operator = safeString(logic.get("operator"));
        Object targetValue = logic.get("value");

        if (variable == null || variable.trim().isEmpty() || operator == null || operator.trim().isEmpty()) {
            System.out.println("⚠️ Lógica incompleta en nodo de decisión. Tomando salida falsa.");
            return "out-false";
        }

        Object actualValue = null;

        if (payload != null) {
            actualValue = payload.get(variable);

            if (actualValue == null && payload.containsKey("nodo")) {
                Object nodoRaw = payload.get("nodo");

                if (nodoRaw instanceof Map<?, ?>) {
                    Map<String, Object> nodoData = (Map<String, Object>) nodoRaw;
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

    private boolean compareValues(Object actualValue, String operator, Object targetValue) {
        if (actualValue == null || targetValue == null || operator == null) {
            return false;
        }

        try {
            double val1 = Double.parseDouble(actualValue.toString());
            double val2 = Double.parseDouble(targetValue.toString());

            switch (operator) {
                case "==":
                    return val1 == val2;
                case ">":
                    return val1 > val2;
                case "<":
                    return val1 < val2;
                case ">=":
                    return val1 >= val2;
                case "<=":
                    return val1 <= val2;
                case "!=":
                    return val1 != val2;
                default:
                    return false;
            }

        } catch (NumberFormatException e) {
            String actual = actualValue.toString();
            String target = targetValue.toString();

            switch (operator) {
                case "==":
                    return actual.equalsIgnoreCase(target);
                case "!=":
                    return !actual.equalsIgnoreCase(target);
                case "contains":
                    return actual.toLowerCase().contains(target.toLowerCase());
                default:
                    return false;
            }
        }
    }

    // ==========================================================
    // BÚSQUEDAS EN JSON DE POLÍTICA
    // ==========================================================

    @SuppressWarnings("unchecked")
    private Map<String, Object> findNodeById(Map<String, Object> policyJson, String nodeId) {
        if (policyJson == null || nodeId == null) {
            return null;
        }

        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");

        if (workflow == null) {
            return null;
        }

        List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("nodes");

        if (nodes == null) {
            return null;
        }

        for (Map<String, Object> node : nodes) {
            if (nodeId.equals(node.get("id"))) {
                return node;
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findLaneById(Map<String, Object> policyJson, String nodeId) {
        if (policyJson == null || nodeId == null) {
            return null;
        }

        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");

        if (workflow == null) {
            return null;
        }

        List<Map<String, Object>> swimlanes = (List<Map<String, Object>>) workflow.get("swimlanes");

        if (swimlanes == null) {
            return null;
        }

        for (Map<String, Object> lane : swimlanes) {
            if (nodeId.equals(lane.get("id"))) {
                return lane;
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private String findNodeByType(Map<String, Object> policyJson, String type) {
        if (policyJson == null || type == null) {
            return null;
        }

        Map<String, Object> workflow = (Map<String, Object>) policyJson.get("workflow");

        if (workflow == null) {
            return null;
        }

        List<Map<String, Object>> nodes = (List<Map<String, Object>>) workflow.get("nodes");

        if (nodes == null) {
            return null;
        }

        for (Map<String, Object> node : nodes) {
            if (type.equals(node.get("type"))) {
                return safeString(node.get("id"));
            }
        }

        return null;
    }

    // ==========================================================
    // UTILIDADES
    // ==========================================================

    private void limpiarNodoActualDePendientes(Instance instance) {
        List<String> pendientes = instance.getPendingNodes();

        if (pendientes == null || pendientes.isEmpty()) {
            return;
        }

        String currentNodeId = instance.getCurrentNodeId();

        if (currentNodeId != null && pendientes.contains(currentNodeId)) {
            pendientes.remove(currentNodeId);
            instance.setPendingNodes(pendientes);
        }
    }

    private boolean isHumanNode(String type) {
        return "action".equals(type) || "actividad".equals(type);
    }

    private String safeString(Object value) {
        return value != null ? value.toString() : null;
    }
}