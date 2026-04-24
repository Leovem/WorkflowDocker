package backend_sprint.backend_sprint.modules.Motor.DTO;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FcmTokenRequest {
    
    private String accessToken;
    private String fcmToken;
}
