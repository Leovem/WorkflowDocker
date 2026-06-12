package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCollaborativeDocumentRequest {

    private String title;

    private String workflowDocumentId;

    private String processInstanceId;

    private String policyId;

    private String nodeId;

    private String departmentId;

    private String createdByUserId;

    private String createdByUserName;
}