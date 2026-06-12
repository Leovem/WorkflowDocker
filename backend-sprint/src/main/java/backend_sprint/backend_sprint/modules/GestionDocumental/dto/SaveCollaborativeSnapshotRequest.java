package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveCollaborativeSnapshotRequest {

    private String htmlContent;

    private String plainText;

    private String savedByUserId;

    private String savedByUserName;
}