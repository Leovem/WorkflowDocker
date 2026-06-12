package backend_sprint.backend_sprint.modules.GestionDocumental.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocument;

public interface CollaborativeDocumentRepository
        extends MongoRepository<CollaborativeDocument, String> {

    List<CollaborativeDocument> findByProcessInstanceIdAndActiveTrue(
            String processInstanceId
    );

    List<CollaborativeDocument> findByProcessInstanceIdAndNodeIdAndActiveTrue(
            String processInstanceId,
            String nodeId
    );
}