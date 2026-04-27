package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO.ChartItemDTO;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model.Bitacora;

import java.util.List;

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
            Aggregation.limit(10)
        );

        AggregationResults<ChartItemDTO> results = mongoTemplate.aggregate(agg, "Bitacora", ChartItemDTO.class);
        return results.getMappedResults();
    }

    // 2. Gráfico: Volumen por Política (Trámites más solicitados)
    public List<ChartItemDTO> getVolumeByPolicy() {
        Aggregation agg = Aggregation.newAggregation(
            Aggregation.group("policyName").count().as("count"),
            Aggregation.project("count").and("_id").as("name"),
            Aggregation.sort(Sort.Direction.DESC, "count")
        );

        AggregationResults<ChartItemDTO> results = mongoTemplate.aggregate(agg, "Bitacora", ChartItemDTO.class);
        return results.getMappedResults();
    }

    // 3. Datos para Jarvis: Obtenemos los últimos 50 trámites cerrados para buscar anomalías
    public List<Bitacora> getRecentCompletedTasks() {
        Query query = new Query();
        query.addCriteria(Criteria.where("action").is("SUBMITTED"));
        query.with(Sort.by(Sort.Direction.DESC, "timing.completedAt"));
        query.limit(50);
        
        return mongoTemplate.find(query, Bitacora.class, "Bitacora");
    }
}