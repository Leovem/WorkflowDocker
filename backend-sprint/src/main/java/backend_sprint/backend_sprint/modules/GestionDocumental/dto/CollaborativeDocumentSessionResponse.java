package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborativeDocumentSessionResponse {

    private String documentId;

    private String roomName;

    private String userId;

    private String userName;

    private String userColor;
}