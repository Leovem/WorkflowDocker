package backend_sprint.backend_sprint.modules.GestionDocumental.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByProcessResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByStatusResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentDashboardSummaryResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.DocumentDashboardService;

@RestController
@RequestMapping("/api/documents/dashboard")
public class DocumentDashboardController {

    private final DocumentDashboardService dashboardService;

    public DocumentDashboardController(DocumentDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DocumentDashboardSummaryResponse> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/by-status")
    public ResponseEntity<List<DocumentCountByStatusResponse>> getDocumentsByStatus() {
        return ResponseEntity.ok(dashboardService.getDocumentsByStatus());
    }

    @GetMapping("/by-process")
    public ResponseEntity<List<DocumentCountByProcessResponse>> getDocumentsByProcess() {
        return ResponseEntity.ok(dashboardService.getDocumentsByProcess());
    }
}