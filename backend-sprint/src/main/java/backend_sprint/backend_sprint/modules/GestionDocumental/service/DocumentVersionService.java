package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentVersionUploadRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentVersion;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.DocumentVersionRepository;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.WorkflowDocumentRepository;

@Service
public class DocumentVersionService {

    private final DocumentVersionRepository versionRepository;
    private final WorkflowDocumentRepository documentRepository;
    private final DocumentAuditLogService auditLogService;

    private final Path rootLocation = Paths.get("uploads", "documents", "versions").toAbsolutePath().normalize();

    public DocumentVersionService(
            DocumentVersionRepository versionRepository,
            WorkflowDocumentRepository documentRepository,
            DocumentAuditLogService auditLogService) {
        this.versionRepository = versionRepository;
        this.documentRepository = documentRepository;
        this.auditLogService = auditLogService;
    }

    public DocumentVersion createNewVersion(
            String documentId,
            MultipartFile file,
            DocumentVersionUploadRequest request) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de la nueva versión no puede estar vacío");
        }

        if (request == null) {
            throw new IllegalArgumentException("Los metadatos de la versión no pueden ser nulos");
        }

        WorkflowDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Documento principal no encontrado"));

        if (!Files.exists(rootLocation)) {
            Files.createDirectories(rootLocation);
        }

        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || originalFileName.trim().isEmpty()) {
            originalFileName = "archivo_sin_nombre";
        }

        String cleanFileName = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedFileName = UUID.randomUUID() + "_v" + nextVersionNumber(document) + "_" + cleanFileName;

        Path destinationFile = rootLocation.resolve(storedFileName).normalize();

        if (!destinationFile.startsWith(rootLocation)) {
            throw new SecurityException("Ruta de archivo inválida");
        }

        Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);

        int versionNumber = nextVersionNumber(document);

        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(document.getId());
        version.setVersionNumber(versionNumber);

        version.setOriginalFileName(originalFileName);
        version.setStoredFileName(storedFileName);
        version.setContentType(file.getContentType());
        version.setSize(file.getSize());

        version.setStoragePath(destinationFile.toString());
        version.setDownloadUrl("/api/documents/" + documentId + "/versions/" + versionNumber + "/download");

        version.setUploadedByUserId(request.getUploadedByUserId());
        version.setUploadedByUserName(request.getUploadedByUserName());
        version.setChangeReason(request.getChangeReason());

        version.setCreatedAt(LocalDateTime.now());

        String previousStatus = document.getDocumentStatus();
        Integer previousVersion = document.getVersion();

        DocumentVersion savedVersion = versionRepository.save(version);

        updateMainDocumentWithNewVersion(document, savedVersion);

        auditLogService.registerAction(
                document,
                "VERSION_CREATED",
                request.getUploadedByUserId(),
                request.getUploadedByUserName(),
                previousStatus,
                "PENDING",
                request.getChangeReason(),
                Map.of(
                        "documentId", documentId,
                        "previousVersion", previousVersion != null ? previousVersion : 1,
                        "newVersion", versionNumber,
                        "originalFileName", savedVersion.getOriginalFileName(),
                        "storedFileName", savedVersion.getStoredFileName()));

        return savedVersion;
    }

    public List<DocumentVersion> findVersionsByDocumentId(String documentId) {
        return versionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
    }

    public DocumentVersion findByDocumentIdAndVersionNumber(String documentId, Integer versionNumber) {
        return versionRepository.findByDocumentIdAndVersionNumber(documentId, versionNumber)
                .orElseThrow(() -> new RuntimeException("Versión documental no encontrada"));
    }

    public Resource loadVersionAsResource(String documentId, Integer versionNumber) {
        DocumentVersion version = findByDocumentIdAndVersionNumber(documentId, versionNumber);

        try {
            Path filePath = rootLocation.resolve(version.getStoredFileName()).normalize();

            if (!filePath.startsWith(rootLocation)) {
                throw new SecurityException("Ruta de archivo inválida");
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                throw new RuntimeException("Archivo físico de versión no encontrado");
            }

            return resource;

        } catch (MalformedURLException e) {
            throw new RuntimeException("No se pudo cargar la versión documental", e);
        }
    }

    private int nextVersionNumber(WorkflowDocument document) {
        Integer currentVersion = document.getVersion();

        if (currentVersion == null || currentVersion < 1) {
            return 2;
        }

        return currentVersion + 1;
    }

    private void updateMainDocumentWithNewVersion(
            WorkflowDocument document,
            DocumentVersion version) {
        document.setOriginalFileName(version.getOriginalFileName());
        document.setStoredFileName(version.getStoredFileName());
        document.setContentType(version.getContentType());
        document.setSize(version.getSize());
        document.setStoragePath(version.getStoragePath());
        document.setDownloadUrl(
                "/api/documents/" + document.getId() + "/versions/" + version.getVersionNumber() + "/download");

        document.setVersion(version.getVersionNumber());
        document.setDocumentStatus("PENDING");

        document.setObservation(null);
        document.setReviewedByUserId(null);
        document.setReviewedByUserName(null);
        document.setReviewedAt(null);

        document.setUpdatedAt(LocalDateTime.now());

        documentRepository.save(document);
    }
}