package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.User;
import java.util.List;

public interface UserRepository extends MongoRepository<User, String> {

    boolean existsByName(String name);

    boolean existsByEmail(String email);

    Optional<User> findByName(String name);

    List<User> findByIsActiveTrue();

    Optional<User> findByIdAndIsActiveTrue(String id);
}