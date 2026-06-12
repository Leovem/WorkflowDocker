package backend_sprint.backend_sprint.modules.GestionDocumental.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentVersionResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentVersionUploadRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentVersion;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.DocumentVersionService;

@RestController
@RequestMapping("/api/documents")
public class DocumentVersionController {

    private final DocumentVersionService versionService;

    public DocumentVersionController(DocumentVersionService versionService) {
        this.versionService = versionService;
    }

    @PostMapping(value = "/{documentId}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentVersionResponse> uploadNewVersion(
            @PathVariable String documentId,
            @RequestPart("file") MultipartFile file,
            @RequestParam("uploadedByUserId") String uploadedByUserId,
            @RequestParam("uploadedByUserName") String uploadedByUserName,
            @RequestParam(value = "changeReason", required = false) String changeReason
    ) throws IOException {

        DocumentVersionUploadRequest request = new DocumentVersionUploadRequest();
        request.setUploadedByUserId(uploadedByUserId);
        request.setUploadedByUserName(uploadedByUserName);
        request.setChangeReason(changeReason);

        DocumentVersion version = versionService.createNewVersion(documentId, file, request);

        return ResponseEntity.ok(DocumentVersionResponse.fromEntity(version));
    }

    @GetMapping("/{documentId}/versions")
    public ResponseEntity<List<DocumentVersionResponse>> getDocumentVersions(
            @PathVariable String documentId
    ) {
        List<DocumentVersionResponse> versions = versionService.findVersionsByDocumentId(documentId)
                .stream()
                .map(DocumentVersionResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(versions);
    }

    @GetMapping("/{documentId}/versions/{versionNumber}")
    public ResponseEntity<DocumentVersionResponse> getDocumentVersion(
            @PathVariable String documentId,
            @PathVariable Integer versionNumber
    ) {
        DocumentVersion version = versionService.findByDocumentIdAndVersionNumber(documentId, versionNumber);

        return ResponseEntity.ok(DocumentVersionResponse.fromEntity(version));
    }

    @GetMapping("/{documentId}/versions/{versionNumber}/download")
    public ResponseEntity<Resource> downloadDocumentVersion(
            @PathVariable String documentId,
            @PathVariable Integer versionNumber
    ) {
        Resource resource = versionService.loadVersionAsResource(documentId, versionNumber);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\""
                )
                .body(resource);
    }
}