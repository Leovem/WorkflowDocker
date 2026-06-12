package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CollaborativeDocumentSessionResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CollaborativeSnapshotResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CreateCollaborativeDocumentRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CreateCollaborativeSessionRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.SaveCollaborativeSnapshotRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentAudit;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentSnapshot;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.CollaborativeDocumentAuditRepository;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.CollaborativeDocumentRepository;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.CollaborativeDocumentSnapshotRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CollaborativeDocumentService {

    private final CollaborativeDocumentRepository documentRepository;
    private final CollaborativeDocumentSnapshotRepository snapshotRepository;
    private final CollaborativeDocumentAuditRepository auditRepository;

    public CollaborativeDocument createDocument(CreateCollaborativeDocumentRequest request) {
        validateCreateDocumentRequest(request);

        CollaborativeDocument document = CollaborativeDocument.builder()
                .title(request.getTitle().trim())

                // Opcional. Puede quedar null porque ya no editamos archivos subidos.
                .workflowDocumentId(request.getWorkflowDocumentId())

                .processInstanceId(request.getProcessInstanceId())
                .policyId(request.getPolicyId())
                .nodeId(request.getNodeId())
                .departmentId(request.getDepartmentId())

                .createdByUserId(request.getCreatedByUserId())
                .createdByUserName(request.getCreatedByUserName())

                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .active(true)
                .build();

        CollaborativeDocument saved = documentRepository.save(document);

        registerAudit(
                saved,
                "CREATED",
                request.getCreatedByUserId(),
                request.getCreatedByUserName(),
                "Documento colaborativo creado.",
                Map.of(
                        "title", saved.getTitle(),
                        "roomName", buildRoomName(saved.getId())
                )
        );

        return saved;
    }

    public CollaborativeDocument getDocument(String documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Documento colaborativo no encontrado."));
    }

    public List<CollaborativeDocument> getByProcessInstance(String processInstanceId) {
        return documentRepository.findByProcessInstanceIdAndActiveTrue(processInstanceId);
    }

    public List<CollaborativeDocument> getByProcessInstanceAndNode(
            String processInstanceId,
            String nodeId
    ) {
        return documentRepository.findByProcessInstanceIdAndNodeIdAndActiveTrue(
                processInstanceId,
                nodeId
        );
    }

    public CollaborativeDocumentSessionResponse createSession(
            String documentId,
            CreateCollaborativeSessionRequest request
    ) {
        CollaborativeDocument document = getDocument(documentId);

        String userColor = request.getUserColor();

        if (userColor == null || userColor.trim().isEmpty()) {
            userColor = generateUserColor(request.getUserName());
        }

        registerAudit(
                document,
                "SESSION_STARTED",
                request.getUserId(),
                request.getUserName(),
                "Usuario ingresó al editor colaborativo.",
                Map.of(
                        "roomName", buildRoomName(document.getId()),
                        "userColor", userColor
                )
        );

        return CollaborativeDocumentSessionResponse.builder()
                .documentId(document.getId())
                .roomName(buildRoomName(document.getId()))
                .userId(request.getUserId())
                .userName(request.getUserName())
                .userColor(userColor)
                .build();
    }

    public CollaborativeSnapshotResponse saveSnapshot(
            String documentId,
            SaveCollaborativeSnapshotRequest request
    ) {
        CollaborativeDocument document = getDocument(documentId);

        Integer nextVersion = snapshotRepository
                .findTopByDocumentIdOrderByVersionNumberDesc(documentId)
                .map(snapshot -> snapshot.getVersionNumber() + 1)
                .orElse(1);

        CollaborativeDocumentSnapshot snapshot = CollaborativeDocumentSnapshot.builder()
                .documentId(documentId)

                // Contexto copiado desde CollaborativeDocument
                .processInstanceId(document.getProcessInstanceId())
                .policyId(document.getPolicyId())
                .nodeId(document.getNodeId())
                .departmentId(document.getDepartmentId())

                .versionNumber(nextVersion)
                .htmlContent(request.getHtmlContent())
                .plainText(request.getPlainText())
                .savedByUserId(request.getSavedByUserId())
                .savedByUserName(request.getSavedByUserName())
                .savedAt(LocalDateTime.now())
                .build();

        CollaborativeDocumentSnapshot savedSnapshot = snapshotRepository.save(snapshot);

        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);

        registerAudit(
                document,
                "SNAPSHOT_SAVED",
                request.getSavedByUserId(),
                request.getSavedByUserName(),
                "Snapshot guardado como versión " + nextVersion + ".",
                Map.of(
                        "versionNumber", nextVersion,
                        "plainTextLength", request.getPlainText() == null ? 0 : request.getPlainText().length(),
                        "htmlLength", request.getHtmlContent() == null ? 0 : request.getHtmlContent().length()
                )
        );

        return toSnapshotResponse(savedSnapshot);
    }

    public CollaborativeSnapshotResponse getLatestSnapshot(String documentId) {
        CollaborativeDocument document = getDocument(documentId);

        return snapshotRepository
                .findTopByDocumentIdOrderByVersionNumberDesc(documentId)
                .map(this::toSnapshotResponse)
                .orElse(
                        CollaborativeSnapshotResponse.builder()
                                .documentId(documentId)
                                .processInstanceId(document.getProcessInstanceId())
                                .policyId(document.getPolicyId())
                                .nodeId(document.getNodeId())
                                .departmentId(document.getDepartmentId())
                                .versionNumber(0)
                                .htmlContent("")
                                .plainText("")
                                .build()
                );
    }

    public List<CollaborativeSnapshotResponse> getVersions(String documentId) {
        return snapshotRepository
                .findByDocumentIdOrderByVersionNumberDesc(documentId)
                .stream()
                .map(this::toSnapshotResponse)
                .toList();
    }

    public List<CollaborativeDocumentAudit> getAudit(String documentId) {
        return auditRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    private void registerAudit(
            CollaborativeDocument document,
            String action,
            String userId,
            String userName,
            String description,
            Map<String, Object> metadata
    ) {
        CollaborativeDocumentAudit audit = CollaborativeDocumentAudit.builder()
                .documentId(document.getId())

                .processInstanceId(document.getProcessInstanceId())
                .policyId(document.getPolicyId())
                .nodeId(document.getNodeId())
                .departmentId(document.getDepartmentId())

                .action(action)
                .userId(userId)
                .userName(userName)
                .description(description)
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        auditRepository.save(audit);
    }

    private CollaborativeSnapshotResponse toSnapshotResponse(
            CollaborativeDocumentSnapshot snapshot
    ) {
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

    private void validateCreateDocumentRequest(CreateCollaborativeDocumentRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La solicitud para crear el documento es obligatoria.");
        }

        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("El título del documento colaborativo es obligatorio.");
        }

        if (request.getProcessInstanceId() == null || request.getProcessInstanceId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID de la instancia del trámite es obligatorio.");
        }

        if (request.getPolicyId() == null || request.getPolicyId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID de la política es obligatorio.");
        }

        if (request.getNodeId() == null || request.getNodeId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID del nodo actual es obligatorio.");
        }

        if (request.getDepartmentId() == null || request.getDepartmentId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID del departamento es obligatorio.");
        }

        if (request.getCreatedByUserId() == null || request.getCreatedByUserId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID del usuario creador es obligatorio.");
        }

        if (request.getCreatedByUserName() == null || request.getCreatedByUserName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del usuario creador es obligatorio.");
        }
    }

    private String buildRoomName(String documentId) {
        return "workflow-doc-" + documentId;
    }

    private String generateUserColor(String userName) {
        String[] colors = {
                "#22d3ee",
                "#a855f7",
                "#22c55e",
                "#f97316",
                "#ef4444",
                "#eab308",
                "#3b82f6"
        };

        int index = Math.abs(
                (userName == null ? new Random().nextInt() : userName.hashCode())
        ) % colors.length;

        return colors[index];
    }
}