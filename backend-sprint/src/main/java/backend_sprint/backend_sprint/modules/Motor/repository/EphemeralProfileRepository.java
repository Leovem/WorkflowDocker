package backend_sprint.backend_sprint.modules.Motor.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;

public interface EphemeralProfileRepository extends MongoRepository<EphemeralProfile, String> {
    
    Optional<EphemeralProfile> findByEmailOrDocumentId(String email, String documentId);
    Optional<EphemeralProfile> findByAccessToken(String accessToken);
    
}
