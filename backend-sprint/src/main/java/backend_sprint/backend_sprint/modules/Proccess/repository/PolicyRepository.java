package backend_sprint.backend_sprint.modules.Proccess.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.Proccess.model.policy;

@Repository
public interface PolicyRepository extends MongoRepository<policy, String> {
    boolean existsByName(String name);
}
