package backend_sprint.backend_sprint.modules.GestionDocumental.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;

@Repository
public interface WorkflowDocumentRepository extends MongoRepository<WorkflowDocument, String> {

    List<WorkflowDocument> findByPolicyId(String policyId);

    List<WorkflowDocument> findByProcessInstanceId(String processInstanceId);

    List<WorkflowDocument> findByClientId(String clientId);

    List<WorkflowDocument> findByNodeId(String nodeId);

    List<WorkflowDocument> findByDocumentStatus(String documentStatus);

    List<WorkflowDocument> findByProcessInstanceIdAndNodeId(
            String processInstanceId,
            String nodeId
    );

    List<WorkflowDocument> findByProcessInstanceIdAndDocumentStatus(
            String processInstanceId,
            String documentStatus
    );

    List<WorkflowDocument> findByPolicyIdAndDocumentStatus(
            String policyId,
            String documentStatus
    );

    List<WorkflowDocument> findByClientIdAndDocumentStatus(
            String clientId,
            String documentStatus
    );

    Optional<WorkflowDocument> findByStoredFileName(String storedFileName);

    long countByDocumentStatus(String documentStatus);

    long countByProcessInstanceId(String processInstanceId);
}