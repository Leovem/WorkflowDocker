package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
public class LoginRequest {
    private String name;
    private String passwordHash;
}
