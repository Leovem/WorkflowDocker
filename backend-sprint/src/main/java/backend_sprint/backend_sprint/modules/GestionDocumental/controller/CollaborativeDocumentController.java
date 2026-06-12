package backend_sprint.backend_sprint.modules.GestionDocumental.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CollaborativeDocumentResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CollaborativeDocumentSessionResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CollaborativeSnapshotResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CreateCollaborativeDocumentRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.CreateCollaborativeSessionRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.SaveCollaborativeSnapshotRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.CollaborativeDocumentAudit;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.CollaborativeDocumentService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/collaborative-documents")
@RequiredArgsConstructor
public class CollaborativeDocumentController {

    private final CollaborativeDocumentService service;

    @PostMapping
    public CollaborativeDocumentResponse createDocument(
            @RequestBody CreateCollaborativeDocumentRequest request
    ) {
        return CollaborativeDocumentResponse.fromEntity(
                service.createDocument(request)
        );
    }

    @GetMapping("/{documentId}")
    public CollaborativeDocumentResponse getDocument(
            @PathVariable String documentId
    ) {
        return CollaborativeDocumentResponse.fromEntity(
                service.getDocument(documentId)
        );
    }

    @GetMapping("/process-instance/{processInstanceId}")
    public List<CollaborativeDocumentResponse> getByProcessInstance(
            @PathVariable String processInstanceId
    ) {
        return service.getByProcessInstance(processInstanceId)
                .stream()
                .map(CollaborativeDocumentResponse::fromEntity)
                .toList();
    }

    @GetMapping("/process-instance/{processInstanceId}/node/{nodeId}")
    public List<CollaborativeDocumentResponse> getByProcessInstanceAndNode(
            @PathVariable String processInstanceId,
            @PathVariable String nodeId
    ) {
        return service.getByProcessInstanceAndNode(processInstanceId, nodeId)
                .stream()
                .map(CollaborativeDocumentResponse::fromEntity)
                .toList();
    }

    @PostMapping("/{documentId}/session")
    public CollaborativeDocumentSessionResponse createSession(
            @PathVariable String documentId,
            @RequestBody CreateCollaborativeSessionRequest request
    ) {
        return service.createSession(documentId, request);
    }

    @PostMapping("/{documentId}/snapshot")
    public CollaborativeSnapshotResponse saveSnapshot(
            @PathVariable String documentId,
            @RequestBody SaveCollaborativeSnapshotRequest request
    ) {
        return service.saveSnapshot(documentId, request);
    }

    @GetMapping("/{documentId}/snapshot")
    public CollaborativeSnapshotResponse getLatestSnapshot(
            @PathVariable String documentId
    ) {
        return service.getLatestSnapshot(documentId);
    }

    @GetMapping("/{documentId}/versions")
    public List<CollaborativeSnapshotResponse> getVersions(
            @PathVariable String documentId
    ) {
        return service.getVersions(documentId);
    }

    @GetMapping("/{documentId}/audit")
    public List<CollaborativeDocumentAudit> getAudit(
            @PathVariable String documentId
    ) {
        return service.getAudit(documentId);
    }
}