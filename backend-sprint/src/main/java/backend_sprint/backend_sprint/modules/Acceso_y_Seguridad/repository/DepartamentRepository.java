package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Departament;

public interface DepartamentRepository extends MongoRepository<Departament, String> {
    Optional<Departament> findByName(String name);

    boolean existsByName(String name);
}
