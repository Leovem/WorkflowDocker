package backend_sprint.backend_sprint.modules.GestionDocumental.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

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
@Document(collection = "collaborative_documents")
public class CollaborativeDocument {

    @Id
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
}