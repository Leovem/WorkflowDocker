package backend_sprint.backend_sprint.modules.Motor.DTO;

import jakarta.validation.constraints.NotBlank;

public class FcmTokenRequest {

    @NotBlank(message = "El token de acceso es obligatorio.")
    private String accessToken;

    @NotBlank(message = "El token FCM es obligatorio.")
    private String fcmToken;

    // Tu constructor, getters y setters aquí...
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getFcmToken() { return fcmToken; }
    public void setFcmToken(String fcmToken) { this.fcmToken = fcmToken; }
}