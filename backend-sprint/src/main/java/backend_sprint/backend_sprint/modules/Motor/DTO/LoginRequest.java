package backend_sprint.backend_sprint.modules.Motor.DTO;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "El token es obligatorio.")
    private String token;

    // Tu constructor, getters y setters aquí...
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}