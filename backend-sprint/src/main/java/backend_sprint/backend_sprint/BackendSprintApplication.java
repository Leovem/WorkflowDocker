package backend_sprint.backend_sprint;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Role;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.User;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.RoleRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.UserRepository;

@SpringBootApplication
public class BackendSprintApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendSprintApplication.class, args);
    }

    @Bean
    CommandLineRunner init(UserRepository userRepo, RoleRepository roleRepo, MongoDatabaseFactory dbFactory,
            MongoTemplate mongoTemplate) {
        return args -> {
            System.out.println("🔍 DB DESDE EL FACTORY: " + dbFactory.getMongoDatabase().getName());
            System.out.println("✅ OPERACIÓN DE PRUEBA REALIZADA");

            Role adminRole = roleRepo.findByName("Root").orElseGet(() -> {
                Role newRole = new Role();
                newRole.setName("Root");
                return roleRepo.save(newRole);
            });

            if (!userRepo.existsByName("Root")) {
                BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                User root = User.builder()
                        .name("Root")
                        .email("admin@uagrm.edu.bo")
                        .passwordHash(encoder.encode("admin123"))
                        .role(adminRole)
                        .build();
                userRepo.save(root);
                System.out.println("Create user Root");
            } else {
                System.out.println("Exists user Root");
                userRepo.findByName("Root").ifPresent(user -> {
                    if (user.getRole() == null) {
                        user.setRole(adminRole);
                        userRepo.save(user);
                        System.out.println("Updated missing role for user Root!");
                    }
                });
            }
        };
    }
}