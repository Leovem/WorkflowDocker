package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Role;

public interface RoleRepository extends MongoRepository<Role, String> {
    Optional<Role> findByName(String name);

    boolean existsByName(String name);
}
