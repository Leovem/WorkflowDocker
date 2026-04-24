package backend_sprint.backend_sprint.modules.Motor.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.Motor.model.Instance;

@Repository
public interface InstanceRepository extends MongoRepository<Instance, String> {

    List<Instance> findByCurrentDepartmentIdAndStatus(String currentDepartmentId, String status);

    List<Instance> findByStatus(String status);

    // 🚀 NUEVO: Buscar todos los trámites de un usuario específico
    List<Instance> findByProfileId(String profileId);
}