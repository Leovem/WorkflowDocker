package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByProcessResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentCountByStatusResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentDashboardSummaryResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.DocumentAuditLogRepository;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.WorkflowDocumentRepository;

@Service
public class DocumentDashboardService {

    private final WorkflowDocumentRepository documentRepository;
    private final DocumentAuditLogRepository auditLogRepository;

    public DocumentDashboardService(
            WorkflowDocumentRepository documentRepository,
            DocumentAuditLogRepository auditLogRepository
    ) {
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public DocumentDashboardSummaryResponse getSummary() {
        DocumentDashboardSummaryResponse response = new DocumentDashboardSummaryResponse();

        response.setTotalDocuments(documentRepository.count());

        response.setPendingDocuments(documentRepository.countByDocumentStatus("PENDING"));
        response.setApprovedDocuments(documentRepository.countByDocumentStatus("APPROVED"));
        response.setRejectedDocuments(documentRepository.countByDocumentStatus("REJECTED"));
        response.setObservedDocuments(documentRepository.countByDocumentStatus("OBSERVED"));

        response.setTotalUploaded(auditLogRepository.countByAction("UPLOADED"));
        response.setTotalReviewed(auditLogRepository.countByAction("REVIEWED"));
        response.setTotalViewed(auditLogRepository.countByAction("VIEWED"));
        response.setTotalDownloaded(auditLogRepository.countByAction("DOWNLOADED"));

        return response;
    }

    public List<DocumentCountByStatusResponse> getDocumentsByStatus() {
        List<DocumentCountByStatusResponse> response = new ArrayList<>();

        response.add(new DocumentCountByStatusResponse(
                "PENDING",
                documentRepository.countByDocumentStatus("PENDING")
        ));

        response.add(new DocumentCountByStatusResponse(
                "APPROVED",
                documentRepository.countByDocumentStatus("APPROVED")
        ));

        response.add(new DocumentCountByStatusResponse(
                "REJECTED",
                documentRepository.countByDocumentStatus("REJECTED")
        ));

        response.add(new DocumentCountByStatusResponse(
                "OBSERVED",
                documentRepository.countByDocumentStatus("OBSERVED")
        ));

        return response;
    }

    public List<DocumentCountByProcessResponse> getDocumentsByProcess() {
        List<WorkflowDocument> documents = documentRepository.findAll();

        Map<String, Long> counter = new LinkedHashMap<>();

        for (WorkflowDocument document : documents) {
            String processInstanceId = document.getProcessInstanceId();

            if (processInstanceId == null || processInstanceId.trim().isEmpty()) {
                processInstanceId = "SIN_TRAMITE";
            }

            counter.put(
                    processInstanceId,
                    counter.getOrDefault(processInstanceId, 0L) + 1
            );
        }

        List<DocumentCountByProcessResponse> response = new ArrayList<>();

        for (Map.Entry<String, Long> entry : counter.entrySet()) {
            response.add(new DocumentCountByProcessResponse(
                    entry.getKey(),
                    entry.getValue()
            ));
        }

        return response;
    }
}