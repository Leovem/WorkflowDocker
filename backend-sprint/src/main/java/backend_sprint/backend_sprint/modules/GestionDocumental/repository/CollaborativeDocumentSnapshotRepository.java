package backend_sprint.backend_sprint.modules.GestionDocumental.repository;


import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentSnapshot;

public interface CollaborativeDocumentSnapshotRepository extends MongoRepository<CollaborativeDocumentSnapshot, String> {

    List<CollaborativeDocumentSnapshot> findByDocumentIdOrderByVersionNumberDesc(String documentId);

    Optional<CollaborativeDocumentSnapshot> findTopByDocumentIdOrderByVersionNumberDesc(String documentId);
}