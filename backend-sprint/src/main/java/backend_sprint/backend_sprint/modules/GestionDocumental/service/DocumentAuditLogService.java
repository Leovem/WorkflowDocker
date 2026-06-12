package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentAuditLog;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.DocumentAuditLogRepository;

@Service
public class DocumentAuditLogService {

    private final DocumentAuditLogRepository auditLogRepository;

    public DocumentAuditLogService(DocumentAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public DocumentAuditLog registerAction(
            WorkflowDocument document,
            String action,
            String userId,
            String userName,
            String previousStatus,
            String newStatus,
            String observation,
            Map<String, Object> metadata
    ) {
        if (document == null) {
            throw new IllegalArgumentException("El documento no puede ser nulo para registrar auditoría");
        }

        DocumentAuditLog log = new DocumentAuditLog();

        log.setDocumentId(document.getId());
        log.setPolicyId(document.getPolicyId());
        log.setProcessInstanceId(document.getProcessInstanceId());
        log.setClientId(document.getClientId());
        log.setNodeId(document.getNodeId());

        log.setAction(action);

        log.setUserId(userId);
        log.setUserName(userName);

        log.setPreviousStatus(previousStatus);
        log.setNewStatus(newStatus);

        log.setObservation(observation);

        log.setCreatedAt(LocalDateTime.now());

        log.setMetadata(metadata);

        return auditLogRepository.save(log);
    }

    public List<DocumentAuditLog> findByDocumentId(String documentId) {
        return auditLogRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public List<DocumentAuditLog> findByProcessInstanceId(String processInstanceId) {
        return auditLogRepository.findByProcessInstanceIdOrderByCreatedAtDesc(processInstanceId);
    }

    public List<DocumentAuditLog> findByClientId(String clientId) {
        return auditLogRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public List<DocumentAuditLog> findByPolicyId(String policyId) {
        return auditLogRepository.findByPolicyIdOrderByCreatedAtDesc(policyId);
    }

    public List<DocumentAuditLog> findByUserId(String userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}