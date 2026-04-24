package backend_sprint.backend_sprint.modules.Motor.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "ephemeral_profiles")
@Getter @Setter
public class EphemeralProfile {
    @Id
    private String id;
    private String name;
    private String email;
    private String documentId;
    private String accessToken;
    private LocalDateTime tokenExpiresAt;
    private boolean isActive;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String fcmToken; // Para notificaciones push
}
