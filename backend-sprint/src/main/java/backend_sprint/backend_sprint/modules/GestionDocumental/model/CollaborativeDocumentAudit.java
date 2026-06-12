package backend_sprint.backend_sprint.modules.GestionDocumental.model;

import java.time.LocalDateTime;
import java.util.Map;

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
@Document(collection = "collaborative_document_audits")
public class CollaborativeDocumentAudit {

    @Id
    private String id;

    private String documentId;

    private String processInstanceId;
    private String policyId;
    private String nodeId;
    private String departmentId;

    private String action;

    private String userId;
    private String userName;

    private String description;

    private Map<String, Object> metadata;

    private LocalDateTime createdAt;
}