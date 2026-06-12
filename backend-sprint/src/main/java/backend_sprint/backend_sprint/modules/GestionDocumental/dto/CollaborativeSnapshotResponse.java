package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentSnapshot;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CollaborativeSnapshotResponse {

    private String documentId;

    private String processInstanceId;

    private String policyId;

    private String nodeId;

    private String departmentId;

    private Integer versionNumber;

    private String htmlContent;

    private String plainText;

    private String savedByUserId;

    private String savedByUserName;

    private LocalDateTime savedAt;

    public static CollaborativeSnapshotResponse fromEntity(
            CollaborativeDocumentSnapshot snapshot
    ) {
        if (snapshot == null) {
            return null;
        }

        return CollaborativeSnapshotResponse.builder()
                .documentId(snapshot.getDocumentId())
                .processInstanceId(snapshot.getProcessInstanceId())
                .policyId(snapshot.getPolicyId())
                .nodeId(snapshot.getNodeId())
                .departmentId(snapshot.getDepartmentId())
                .versionNumber(snapshot.getVersionNumber())
                .htmlContent(snapshot.getHtmlContent())
                .plainText(snapshot.getPlainText())
                .savedByUserId(snapshot.getSavedByUserId())
                .savedByUserName(snapshot.getSavedByUserName())
                .savedAt(snapshot.getSavedAt())
                .build();
    }
}