package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByProcessResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByStatusResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentDashboardSummaryResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentDetailedReportResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentReportFilterRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentReportResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.WorkflowDocumentResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.WorkflowDocumentRepository;

@Service
public class DocumentReportService {

    private final DocumentDashboardService dashboardService;
    private final WorkflowDocumentRepository documentRepository;

    public DocumentReportService(
            DocumentDashboardService dashboardService,
            WorkflowDocumentRepository documentRepository
    ) {
        this.dashboardService = dashboardService;
        this.documentRepository = documentRepository;
    }

    public DocumentReportResponse generateGeneralReport() {
        DocumentDashboardSummaryResponse summary = dashboardService.getSummary();
        List<DocumentCountByStatusResponse> byStatus = dashboardService.getDocumentsByStatus();
        List<DocumentCountByProcessResponse> byProcess = dashboardService.getDocumentsByProcess();

        DocumentReportResponse report = new DocumentReportResponse();

        report.setTitle("Reporte general de gestión documental");
        report.setDescription("Resumen general del estado documental de los trámites registrados en el sistema.");
        report.setGeneratedAt(LocalDateTime.now());

        report.setSummary(summary);
        report.setDocumentsByStatus(byStatus);
        report.setDocumentsByProcess(byProcess);

        report.setConclusions(generateConclusions(summary, byStatus, byProcess));

        return report;
    }

    private List<String> generateConclusions(
            DocumentDashboardSummaryResponse summary,
            List<DocumentCountByStatusResponse> byStatus,
            List<DocumentCountByProcessResponse> byProcess
    ) {
        List<String> conclusions = new ArrayList<>();

        conclusions.add(
                "Se registraron " + safeNumber(summary.getTotalDocuments()) +
                        " documento(s) en el repositorio documental."
        );

        if (safeNumber(summary.getPendingDocuments()) > 0) {
            conclusions.add(
                    "Existen " + summary.getPendingDocuments() +
                            " documento(s) pendiente(s) de revisión."
            );
        } else {
            conclusions.add("No existen documentos pendientes de revisión.");
        }

        if (safeNumber(summary.getObservedDocuments()) > 0) {
            conclusions.add(
                    "Existen " + summary.getObservedDocuments() +
                            " documento(s) observado(s) que requieren corrección."
            );
        }

        if (safeNumber(summary.getRejectedDocuments()) > 0) {
            conclusions.add(
                    "Se registraron " + summary.getRejectedDocuments() +
                            " documento(s) rechazado(s)."
            );
        }

        if (safeNumber(summary.getTotalDownloaded()) > 0) {
            conclusions.add(
                    "Se registraron " + summary.getTotalDownloaded() +
                            " descarga(s) de documentos."
            );
        } else {
            conclusions.add("Todavía no se registraron descargas documentales.");
        }

        if (safeNumber(summary.getTotalViewed()) > 0) {
            conclusions.add(
                    "Se registraron " + summary.getTotalViewed() +
                            " visualización(es) de documentos."
            );
        }

        DocumentCountByStatusResponse dominantStatus = byStatus.stream()
                .max(Comparator.comparingLong(DocumentCountByStatusResponse::getTotal))
                .orElse(null);

        if (dominantStatus != null) {
            conclusions.add(
                    "El estado con mayor cantidad de documentos es " +
                            dominantStatus.getStatus() +
                            " con " +
                            dominantStatus.getTotal() +
                            " documento(s)."
            );
        }

        DocumentCountByProcessResponse processWithMoreDocuments = byProcess.stream()
                .max(Comparator.comparingLong(DocumentCountByProcessResponse::getTotalDocuments))
                .orElse(null);

        if (processWithMoreDocuments != null) {
            conclusions.add(
                    "El trámite con mayor cantidad de documentos es " +
                            processWithMoreDocuments.getProcessInstanceId() +
                            " con " +
                            processWithMoreDocuments.getTotalDocuments() +
                            " documento(s)."
            );
        }

        return conclusions;
    }

    public DocumentDetailedReportResponse generateDetailedReport(DocumentReportFilterRequest filter) {
        DocumentReportFilterRequest safeFilter = filter != null
                ? filter
                : new DocumentReportFilterRequest();

        List<WorkflowDocument> documents = findDocumentsByFilter(safeFilter);

        List<WorkflowDocumentResponse> documentResponses = documents.stream()
                .map(WorkflowDocumentResponse::fromEntity)
                .toList();

        DocumentDetailedReportResponse response = new DocumentDetailedReportResponse();

        response.setTitle(buildReportTitle(safeFilter));
        response.setDescription("Reporte detallado de documentos según los filtros seleccionados.");
        response.setGeneratedAt(LocalDateTime.now());

        response.setStatus(normalizeStatus(safeFilter.getStatus()));
        response.setPolicyId(trimToNull(safeFilter.getPolicyId()));
        response.setProcessInstanceId(trimToNull(safeFilter.getProcessInstanceId()));
        response.setClientId(trimToNull(safeFilter.getClientId()));

        response.setNodeId(trimToNull(safeFilter.getNodeId()));
        response.setDepartmentId(trimToNull(safeFilter.getDepartmentId()));
        response.setRequiredDocumentName(trimToNull(safeFilter.getRequiredDocumentName()));
        response.setUploadedByUserId(trimToNull(safeFilter.getUploadedByUserId()));

        response.setTotalDocuments(documentResponses.size());
        response.setDocuments(documentResponses);

        return response;
    }

    public byte[] generateDetailedExcelReport(DocumentReportFilterRequest filter) {
        DocumentReportFilterRequest safeFilter = filter != null
                ? filter
                : new DocumentReportFilterRequest();

        List<WorkflowDocument> documents = findDocumentsByFilter(safeFilter);

        try (
                Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream()
        ) {
            Sheet sheet = workbook.createSheet("Reporte Documental");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            int rowIndex = 0;

            Row titleRow = sheet.createRow(rowIndex++);
            titleRow.createCell(0).setCellValue(buildReportTitle(safeFilter));

            Row generatedRow = sheet.createRow(rowIndex++);
            generatedRow.createCell(0).setCellValue("Generado en:");
            generatedRow.createCell(1).setCellValue(LocalDateTime.now().toString());

            rowIndex++;

            Row filterRow = sheet.createRow(rowIndex++);
            filterRow.createCell(0).setCellValue("Filtros aplicados");
            filterRow.createCell(1).setCellValue(buildFilterDescription(safeFilter));

            rowIndex++;

            Row header = sheet.createRow(rowIndex++);

            String[] columns = {
                    "ID Documento",
                    "Política",
                    "Trámite",
                    "Cliente",
                    "Nodo",
                    "Departamento",
                    "Documento requerido ID",
                    "Documento requerido",
                    "Archivo original",
                    "Archivo almacenado",
                    "Tipo",
                    "Tamaño bytes",
                    "Estado",
                    "Observación",
                    "Subido por ID",
                    "Subido por",
                    "Fecha subida",
                    "Revisado por ID",
                    "Revisado por",
                    "Fecha revisión",
                    "Versión",
                    "URL descarga"
            };

            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            for (WorkflowDocument document : documents) {
                Row row = sheet.createRow(rowIndex++);

                long sizeValue = Objects.requireNonNullElse(document.getSize(), 0L);
                int versionValue = Objects.requireNonNullElse(document.getVersion(), 1);

                row.createCell(0).setCellValue(nullSafe(document.getId()));
                row.createCell(1).setCellValue(nullSafe(document.getPolicyId()));
                row.createCell(2).setCellValue(nullSafe(document.getProcessInstanceId()));
                row.createCell(3).setCellValue(nullSafe(document.getClientId()));
                row.createCell(4).setCellValue(nullSafe(document.getNodeId()));
                row.createCell(5).setCellValue(nullSafe(document.getDepartmentId()));
                row.createCell(6).setCellValue(nullSafe(document.getRequiredDocumentId()));
                row.createCell(7).setCellValue(nullSafe(document.getRequiredDocumentName()));
                row.createCell(8).setCellValue(nullSafe(document.getOriginalFileName()));
                row.createCell(9).setCellValue(nullSafe(document.getStoredFileName()));
                row.createCell(10).setCellValue(nullSafe(document.getContentType()));
                row.createCell(11).setCellValue(sizeValue);
                row.createCell(12).setCellValue(nullSafe(document.getDocumentStatus()));
                row.createCell(13).setCellValue(nullSafe(document.getObservation()));
                row.createCell(14).setCellValue(nullSafe(document.getUploadedByUserId()));
                row.createCell(15).setCellValue(nullSafe(document.getUploadedByUserName()));
                row.createCell(16).setCellValue(
                        document.getCreatedAt() != null ? document.getCreatedAt().toString() : ""
                );
                row.createCell(17).setCellValue(nullSafe(document.getReviewedByUserId()));
                row.createCell(18).setCellValue(nullSafe(document.getReviewedByUserName()));
                row.createCell(19).setCellValue(
                        document.getReviewedAt() != null ? document.getReviewedAt().toString() : ""
                );
                row.createCell(20).setCellValue(versionValue);
                row.createCell(21).setCellValue(nullSafe(document.getDownloadUrl()));
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("No se pudo generar el reporte Excel", e);
        }
    }

    private List<WorkflowDocument> findDocumentsByFilter(DocumentReportFilterRequest filter) {
        String status = normalizeStatus(filter.getStatus());

        boolean hasStatus = hasText(status);
        boolean hasPolicyId = hasText(filter.getPolicyId());
        boolean hasProcessInstanceId = hasText(filter.getProcessInstanceId());
        boolean hasClientId = hasText(filter.getClientId());

        List<WorkflowDocument> baseDocuments;

        if (hasStatus && hasProcessInstanceId) {
            baseDocuments = documentRepository.findByProcessInstanceIdAndDocumentStatus(
                    filter.getProcessInstanceId().trim(),
                    status
            );
        } else if (hasStatus && hasPolicyId) {
            baseDocuments = documentRepository.findByPolicyIdAndDocumentStatus(
                    filter.getPolicyId().trim(),
                    status
            );
        } else if (hasStatus && hasClientId) {
            baseDocuments = documentRepository.findByClientIdAndDocumentStatus(
                    filter.getClientId().trim(),
                    status
            );
        } else if (hasStatus) {
            baseDocuments = documentRepository.findByDocumentStatus(status);
        } else if (hasProcessInstanceId) {
            baseDocuments = documentRepository.findByProcessInstanceId(
                    filter.getProcessInstanceId().trim()
            );
        } else if (hasPolicyId) {
            baseDocuments = documentRepository.findByPolicyId(
                    filter.getPolicyId().trim()
            );
        } else if (hasClientId) {
            baseDocuments = documentRepository.findByClientId(
                    filter.getClientId().trim()
            );
        } else {
            baseDocuments = documentRepository.findAll();
        }

        return applyAdditionalFilters(baseDocuments, filter);
    }

    private List<WorkflowDocument> applyAdditionalFilters(
            List<WorkflowDocument> documents,
            DocumentReportFilterRequest filter
    ) {
        Stream<WorkflowDocument> stream = documents.stream();

        if (hasText(filter.getNodeId())) {
            String nodeId = filter.getNodeId().trim();
            stream = stream.filter(document -> nodeId.equals(document.getNodeId()));
        }

        if (hasText(filter.getDepartmentId())) {
            String departmentId = filter.getDepartmentId().trim();
            stream = stream.filter(document -> departmentId.equals(document.getDepartmentId()));
        }

        if (hasText(filter.getRequiredDocumentName())) {
            String requiredDocumentName = normalizeText(filter.getRequiredDocumentName());
            stream = stream.filter(document ->
                    normalizeText(document.getRequiredDocumentName()).contains(requiredDocumentName)
            );
        }

        if (hasText(filter.getUploadedByUserId())) {
            String uploadedByUserId = filter.getUploadedByUserId().trim();
            stream = stream.filter(document -> uploadedByUserId.equals(document.getUploadedByUserId()));
        }

        return stream
                .sorted(Comparator.comparing(
                        WorkflowDocument::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private String normalizeStatus(String status) {
        if (!hasText(status) || "null".equalsIgnoreCase(status.trim())) {
            return null;
        }

        return status.trim().toUpperCase();
    }

    private String buildReportTitle(DocumentReportFilterRequest filter) {
        String status = normalizeStatus(filter.getStatus());

        if ("REJECTED".equals(status)) {
            return "Reporte detallado de documentos rechazados";
        }

        if ("PENDING".equals(status)) {
            return "Reporte detallado de documentos pendientes";
        }

        if ("APPROVED".equals(status)) {
            return "Reporte detallado de documentos aprobados";
        }

        if ("OBSERVED".equals(status)) {
            return "Reporte detallado de documentos observados";
        }

        if (hasText(filter.getDepartmentId())) {
            return "Reporte detallado de documentos por departamento";
        }

        if (hasText(filter.getNodeId())) {
            return "Reporte detallado de documentos por nodo";
        }

        if (hasText(filter.getRequiredDocumentName())) {
            return "Reporte detallado por documento requerido";
        }

        return "Reporte detallado de documentos";
    }

    private String buildFilterDescription(DocumentReportFilterRequest filter) {
        return "Estado: " + nullSafe(normalizeStatus(filter.getStatus()))
                + " | Política: " + nullSafe(filter.getPolicyId())
                + " | Trámite: " + nullSafe(filter.getProcessInstanceId())
                + " | Cliente: " + nullSafe(filter.getClientId())
                + " | Nodo: " + nullSafe(filter.getNodeId())
                + " | Departamento: " + nullSafe(filter.getDepartmentId())
                + " | Documento requerido: " + nullSafe(filter.getRequiredDocumentName())
                + " | Usuario que subió: " + nullSafe(filter.getUploadedByUserId());
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase();
    }

    private long safeNumber(Long value) {
        return value != null ? value : 0L;
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}