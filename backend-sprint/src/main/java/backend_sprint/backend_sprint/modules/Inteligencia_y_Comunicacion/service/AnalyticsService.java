package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO.BottleneckAnalysisDTO;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO.BottleneckItemDTO;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO.ChartItemDTO;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model.Bitacora;

@Service
public class AnalyticsService {

    @Autowired
    private MongoTemplate mongoTemplate;

    // 1. Gráfico: Top Funcionarios (Quienes han resuelto más tareas)
    public List<ChartItemDTO> getTopOfficials() {
        Aggregation agg = Aggregation.newAggregation(
                // Filtramos solo las tareas que ya fueron enviadas/aprobadas
                Aggregation.match(Criteria.where("action").is("SUBMITTED")),
                // Agrupamos por el nombre del usuario y contamos
                Aggregation.group("user.name").count().as("count"),
                // Mapeamos el resultado a nuestro DTO
                Aggregation.project("count").and("_id").as("name"),
                // Ordenamos del mayor al menor
                Aggregation.sort(Sort.Direction.DESC, "count"),
                // Tomamos el Top 10
                Aggregation.limit(10));

        AggregationResults<ChartItemDTO> results = mongoTemplate.aggregate(agg, "Bitacora", ChartItemDTO.class);
        return results.getMappedResults();
    }

    // 2. Gráfico: Volumen por Política (Trámites más solicitados)
    public List<ChartItemDTO> getVolumeByPolicy() {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.group("policyName").count().as("count"),
                Aggregation.project("count").and("_id").as("name"),
                Aggregation.sort(Sort.Direction.DESC, "count"));

        AggregationResults<ChartItemDTO> results = mongoTemplate.aggregate(agg, "Bitacora", ChartItemDTO.class);
        return results.getMappedResults();
    }

    // 3. Datos para Jarvis: Obtenemos los últimos 50 trámites cerrados para buscar
    // anomalías
    public List<Bitacora> getRecentCompletedTasks() {
        Query query = new Query();
        query.addCriteria(Criteria.where("action").is("SUBMITTED"));
        query.with(Sort.by(Sort.Direction.DESC, "timing.completedAt"));
        query.limit(50);

        return mongoTemplate.find(query, Bitacora.class, "Bitacora");
    }

    public BottleneckAnalysisDTO getSimpleBottleneckPrediction() {
        List<Bitacora> recentTasks = getRecentCompletedTasks();

        long totalTasks = recentTasks.size();
        double totalDuration = 0.0;

        for (Bitacora task : recentTasks) {
            totalDuration += extractDurationMinutes(task);
        }

        double averageDuration = totalTasks > 0 ? totalDuration / totalTasks : 0.0;

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("action").is("SUBMITTED")),
                Aggregation.group("nodeName", "policyName")
                        .count().as("taskCount")
                        .avg("timing.durationMinutes").as("averageDurationMinutes")
                        .max("timing.durationMinutes").as("maxDurationMinutes"),
                Aggregation.project("taskCount", "averageDurationMinutes", "maxDurationMinutes")
                        .and("_id.nodeName").as("nodeName")
                        .and("_id.policyName").as("policyName"),
                Aggregation.sort(Sort.Direction.DESC, "averageDurationMinutes"));

        AggregationResults<Document> results = mongoTemplate.aggregate(
                agg,
                "Bitacora",
                Document.class);

        List<BottleneckItemDTO> bottlenecks = new ArrayList<>();

        for (Document result : results.getMappedResults()) {
            String nodeName = safeString(result.get("nodeName"));
            String policyName = safeString(result.get("policyName"));

            long taskCount = toLong(result.get("taskCount"));
            double avgDuration = toDouble(result.get("averageDurationMinutes"));
            double maxDuration = toDouble(result.get("maxDurationMinutes"));

            BottleneckItemDTO item = evaluateBottleneck(
                    nodeName,
                    policyName,
                    taskCount,
                    avgDuration,
                    maxDuration,
                    averageDuration);

            if (item != null) {
                bottlenecks.add(item);
            }
        }

        BottleneckAnalysisDTO response = new BottleneckAnalysisDTO();
        response.setGeneratedAt(LocalDateTime.now());
        response.setTotalTasksAnalyzed(totalTasks);
        response.setAverageDurationMinutes(roundTwoDecimals(averageDuration));
        response.setTotalBottlenecks(bottlenecks.size());
        response.setBottlenecks(bottlenecks);

        if (bottlenecks.isEmpty()) {
            response.setGeneralStatus("NORMAL");
        } else if (bottlenecks.size() >= 5) {
            response.setGeneralStatus("RISK");
        } else {
            response.setGeneralStatus("WARNING");
        }

        return response;
    }

    private BottleneckItemDTO evaluateBottleneck(
            String nodeName,
            String policyName,
            long taskCount,
            double avgDuration,
            double maxDuration,
            double globalAverage) {
        final double SLOW_AVERAGE_THRESHOLD = 30.0;
        final double CRITICAL_MAX_THRESHOLD = 60.0;
        final long HIGH_VOLUME_THRESHOLD = 5;

        boolean isSlowByAverage = avgDuration >= SLOW_AVERAGE_THRESHOLD;
        boolean isCriticalByMax = maxDuration >= CRITICAL_MAX_THRESHOLD;
        boolean isAboveGlobalAverage = globalAverage > 0 && avgDuration >= globalAverage * 1.8;
        boolean hasHighVolume = taskCount >= HIGH_VOLUME_THRESHOLD;

        if (!isSlowByAverage && !isCriticalByMax && !isAboveGlobalAverage && !hasHighVolume) {
            return null;
        }

        BottleneckItemDTO item = new BottleneckItemDTO();

        item.setPolicyName(policyName);
        item.setNodeName(nodeName);
        item.setTaskCount(taskCount);
        item.setAverageDurationMinutes(roundTwoDecimals(avgDuration));
        item.setMaxDurationMinutes(roundTwoDecimals(maxDuration));

        if (isCriticalByMax) {
            item.setType("CRITICAL_DELAY");
            item.setSeverity("CRITICAL");
            item.setMessage("La actividad tiene al menos una tarea con duración crítica.");
            item.setRecommendation("Revisar urgentemente esta actividad, reasignar responsables o dividir la carga.");
        } else if (isSlowByAverage) {
            item.setType("SLOW_ACTIVITY");
            item.setSeverity("HIGH");
            item.setMessage("La actividad tiene un tiempo promedio alto.");
            item.setRecommendation("Revisar carga del departamento, complejidad de la tarea o recursos asignados.");
        } else if (isAboveGlobalAverage) {
            item.setType("ABOVE_AVERAGE_ACTIVITY");
            item.setSeverity("MEDIUM");
            item.setMessage("La actividad está muy por encima del promedio general.");
            item.setRecommendation("Comparar esta actividad con otras del flujo y detectar causas de demora.");
        } else {
            item.setType("HIGH_VOLUME_ACTIVITY");
            item.setSeverity("MEDIUM");
            item.setMessage("La actividad concentra un volumen alto de tareas.");
            item.setRecommendation("Monitorear acumulación y considerar asignar más funcionarios.");
        }

        return item;
    }

    private double extractDurationMinutes(Bitacora task) {
        if (task == null || task.getTiming() == null) {
            return 0.0;
        }

        return task.getTiming().getDurationMinutes();
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }

        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }

        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private String safeString(Object value) {
        return value != null ? value.toString() : "";
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}