package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO.BottleneckAnalysisDTO;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model.Bitacora;
import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service.AnalyticsService;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*") // Ajusta según tu configuración de seguridad
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        Map<String, Object> response = new HashMap<>();

        // Empaquetamos ambas consultas en un solo llamado para ahorrar red
        response.put("topOfficials", analyticsService.getTopOfficials());
        response.put("volumeByPolicy", analyticsService.getVolumeByPolicy());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/recent-tasks")
    public ResponseEntity<List<Bitacora>> getRecentTasks() {
        // Este endpoint lo llamará Angular para luego enviarle estos datos a Jarvis en
        // FastAPI
        return ResponseEntity.ok(analyticsService.getRecentCompletedTasks());
    }

    @GetMapping("/bottlenecks/simple")
    public ResponseEntity<BottleneckAnalysisDTO> getSimpleBottleneckPrediction() {
        return ResponseEntity.ok(analyticsService.getSimpleBottleneckPrediction());
    }
}