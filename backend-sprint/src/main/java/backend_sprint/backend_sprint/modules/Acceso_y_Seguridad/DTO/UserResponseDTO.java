package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO;

import java.time.LocalDateTime;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Departament;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponseDTO {
    private String id;
    private String name;
    private String email;
    private Role role;
    private Departament departamento;
    private LocalDateTime createAt;
    private boolean isActive;
}
