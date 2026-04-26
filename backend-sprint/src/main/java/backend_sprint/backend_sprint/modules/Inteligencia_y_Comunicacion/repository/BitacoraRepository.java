package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model.Bitacora;

@Repository
public interface BitacoraRepository extends MongoRepository<Bitacora, String>{
    
    List<Bitacora> findByInstanceIdOrderByTimingCompletedAtDesc(String instanceId);

    List<Bitacora> findByUserDepartamentId(String departamentId);

    Bitacora findFirstByInstanceIdAndNodeIdAndActionOrderByTimingAssignedAtDesc(
    String instanceId, String nodeId, String action
);
}
