package backend_sprint.backend_sprint.modules.GestionDocumental.repository;


import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentAudit;

public interface CollaborativeDocumentAuditRepository extends MongoRepository<CollaborativeDocumentAudit, String> {

    List<CollaborativeDocumentAudit> findByDocumentIdOrderByCreatedAtDesc(String documentId);
}