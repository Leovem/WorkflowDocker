package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "El nombre de usuario es obligatorio.")
    private String name;

    @NotBlank(message = "La contraseña es obligatoria.")
    private String passwordHash;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}