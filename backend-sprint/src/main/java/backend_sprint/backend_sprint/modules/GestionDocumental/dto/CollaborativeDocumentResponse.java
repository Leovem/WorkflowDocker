package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CollaborativeDocumentResponse {

    private String id;

    private String title;

    private String workflowDocumentId;

    private String processInstanceId;

    private String policyId;

    private String nodeId;

    private String departmentId;

    private String createdByUserId;

    private String createdByUserName;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Boolean active;

    public static CollaborativeDocumentResponse fromEntity(
            CollaborativeDocument document
    ) {
        if (document == null) {
            return null;
        }

        return CollaborativeDocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .workflowDocumentId(document.getWorkflowDocumentId())
                .processInstanceId(document.getProcessInstanceId())
                .policyId(document.getPolicyId())
                .nodeId(document.getNodeId())
                .departmentId(document.getDepartmentId())
                .createdByUserId(document.getCreatedByUserId())
                .createdByUserName(document.getCreatedByUserName())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .active(document.getActive())
                .build();
    }
}