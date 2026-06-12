package backend_sprint.backend_sprint.modules.GestionDocumental.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentAuditLog;

@Repository
public interface DocumentAuditLogRepository extends MongoRepository<DocumentAuditLog, String> {

    List<DocumentAuditLog> findByDocumentIdOrderByCreatedAtDesc(String documentId);

    List<DocumentAuditLog> findByProcessInstanceIdOrderByCreatedAtDesc(String processInstanceId);

    List<DocumentAuditLog> findByClientIdOrderByCreatedAtDesc(String clientId);

    List<DocumentAuditLog> findByPolicyIdOrderByCreatedAtDesc(String policyId);

    List<DocumentAuditLog> findByUserIdOrderByCreatedAtDesc(String userId);

    List<DocumentAuditLog> findByActionOrderByCreatedAtDesc(String action);

    long countByAction(String action);
}