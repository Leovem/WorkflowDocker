package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCollaborativeSessionRequest {

    private String userId;

    private String userName;

    private String userColor;
}