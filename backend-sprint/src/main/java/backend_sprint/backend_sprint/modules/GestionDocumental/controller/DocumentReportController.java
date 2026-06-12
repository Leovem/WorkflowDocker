package backend_sprint.backend_sprint.modules.GestionDocumental.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentDetailedReportResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentReportFilterRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentReportResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.DocumentReportService;

@RestController
@RequestMapping("/api/documents/reports")
public class DocumentReportController {

    private final DocumentReportService reportService;

    public DocumentReportController(DocumentReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/general")
    public ResponseEntity<DocumentReportResponse> getGeneralReport() {
        return ResponseEntity.ok(reportService.generateGeneralReport());
    }

    @GetMapping("/detailed")
    public ResponseEntity<DocumentDetailedReportResponse> getDetailedReport(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "policyId", required = false) String policyId,
            @RequestParam(value = "processInstanceId", required = false) String processInstanceId,
            @RequestParam(value = "clientId", required = false) String clientId,
            @RequestParam(value = "nodeId", required = false) String nodeId,
            @RequestParam(value = "departmentId", required = false) String departmentId,
            @RequestParam(value = "requiredDocumentName", required = false) String requiredDocumentName,
            @RequestParam(value = "uploadedByUserId", required = false) String uploadedByUserId
    ) {
        DocumentReportFilterRequest filter = buildFilter(
                status,
                policyId,
                processInstanceId,
                clientId,
                nodeId,
                departmentId,
                requiredDocumentName,
                uploadedByUserId
        );

        return ResponseEntity.ok(reportService.generateDetailedReport(filter));
    }

    @GetMapping("/detailed/excel")
    public ResponseEntity<byte[]> downloadDetailedExcelReport(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "policyId", required = false) String policyId,
            @RequestParam(value = "processInstanceId", required = false) String processInstanceId,
            @RequestParam(value = "clientId", required = false) String clientId,
            @RequestParam(value = "nodeId", required = false) String nodeId,
            @RequestParam(value = "departmentId", required = false) String departmentId,
            @RequestParam(value = "requiredDocumentName", required = false) String requiredDocumentName,
            @RequestParam(value = "uploadedByUserId", required = false) String uploadedByUserId
    ) {
        DocumentReportFilterRequest filter = buildFilter(
                status,
                policyId,
                processInstanceId,
                clientId,
                nodeId,
                departmentId,
                requiredDocumentName,
                uploadedByUserId
        );

        byte[] excelBytes = reportService.generateDetailedExcelReport(filter);

        String filename = buildExcelFileName(filter);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .body(excelBytes);
    }

    private DocumentReportFilterRequest buildFilter(
            String status,
            String policyId,
            String processInstanceId,
            String clientId,
            String nodeId,
            String departmentId,
            String requiredDocumentName,
            String uploadedByUserId
    ) {
        DocumentReportFilterRequest filter = new DocumentReportFilterRequest();

        filter.setStatus(status);
        filter.setPolicyId(policyId);
        filter.setProcessInstanceId(processInstanceId);
        filter.setClientId(clientId);

        filter.setNodeId(nodeId);
        filter.setDepartmentId(departmentId);
        filter.setRequiredDocumentName(requiredDocumentName);
        filter.setUploadedByUserId(uploadedByUserId);

        return filter;
    }

    private String buildExcelFileName(DocumentReportFilterRequest filter) {
        if (hasText(filter.getStatus())) {
            return "reporte_documentos_" + filter.getStatus().trim().toLowerCase() + ".xlsx";
        }

        if (hasText(filter.getProcessInstanceId())) {
            return "reporte_tramite_" + filter.getProcessInstanceId().trim() + ".xlsx";
        }

        if (hasText(filter.getClientId())) {
            return "reporte_cliente_" + filter.getClientId().trim() + ".xlsx";
        }

        if (hasText(filter.getPolicyId())) {
            return "reporte_politica_" + filter.getPolicyId().trim() + ".xlsx";
        }

        if (hasText(filter.getDepartmentId())) {
            return "reporte_departamento_" + filter.getDepartmentId().trim() + ".xlsx";
        }

        if (hasText(filter.getNodeId())) {
            return "reporte_nodo_" + filter.getNodeId().trim() + ".xlsx";
        }

        if (hasText(filter.getRequiredDocumentName())) {
            return "reporte_documento_requerido.xlsx";
        }

        return "reporte_documental.xlsx";
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}