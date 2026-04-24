package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "users")
@Data
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    @DocumentReference
    private Role role;

    @DocumentReference
    private Departament departamento;

    @Builder.Default
    private LocalDateTime createAt = LocalDateTime.now();

    @Builder.Default
    private boolean isActive = true;
}
