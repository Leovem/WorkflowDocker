package backend_sprint.backend_sprint.modules.GestionDocumental.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentVersion;

@Repository
public interface DocumentVersionRepository extends MongoRepository<DocumentVersion, String> {

    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);

    Optional<DocumentVersion> findByDocumentIdAndVersionNumber(String documentId, Integer versionNumber);

    long countByDocumentId(String documentId);
}