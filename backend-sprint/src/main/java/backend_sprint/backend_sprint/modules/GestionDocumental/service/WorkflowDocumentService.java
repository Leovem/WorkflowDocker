package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.WorkflowDocumentUploadRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.repository.WorkflowDocumentRepository;

@Service
public class WorkflowDocumentService {

    private final WorkflowDocumentRepository documentRepository;
    private final DocumentAuditLogService auditLogService;
    private final S3StorageService s3StorageService;

    public WorkflowDocumentService(
            WorkflowDocumentRepository documentRepository,
            DocumentAuditLogService auditLogService,
            S3StorageService s3StorageService
    ) {
        this.documentRepository = documentRepository;
        this.auditLogService = auditLogService;
        this.s3StorageService = s3StorageService;
    }

    public WorkflowDocument uploadDocument(
            MultipartFile file,
            WorkflowDocumentUploadRequest request
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo no puede estar vacío");
        }

        if (request == null) {
            throw new IllegalArgumentException("Los metadatos del documento no pueden ser nulos");
        }

        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || originalFileName.trim().isEmpty()) {
            originalFileName = "archivo_sin_nombre";
        }

        String cleanFileName = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedFileName = UUID.randomUUID() + "_" + cleanFileName;

        String storagePath = s3StorageService.uploadFile(file, storedFileName);

        WorkflowDocument document = new WorkflowDocument();

        document.setPolicyId(request.getPolicyId());
        document.setProcessInstanceId(request.getProcessInstanceId());
        document.setClientId(request.getClientId());
        document.setNodeId(request.getNodeId());
        document.setDepartmentId(request.getDepartmentId());
        document.setRequiredDocumentId(request.getRequiredDocumentId());
        document.setRequiredDocumentName(request.getRequiredDocumentName());

        document.setOriginalFileName(originalFileName);
        document.setStoredFileName(storedFileName);
        document.setContentType(file.getContentType());
        document.setSize(file.getSize());

        document.setStoragePath(storagePath);
        document.setDownloadUrl("/api/documents/download/" + storedFileName);

        document.setUploadedByUserId(request.getUploadedByUserId());
        document.setUploadedByUserName(request.getUploadedByUserName());

        document.setDocumentStatus("PENDING");
        document.setVersion(1);

        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());

        WorkflowDocument savedDocument = documentRepository.save(document);

        auditLogService.registerAction(
                savedDocument,
                "UPLOADED",
                request.getUploadedByUserId(),
                request.getUploadedByUserName(),
                null,
                savedDocument.getDocumentStatus(),
                "Documento subido al repositorio documental en S3",
                buildUploadMetadata(savedDocument)
        );

        return savedDocument;
    }

    public List<WorkflowDocument> findAll() {
        return documentRepository.findAll();
    }

    public WorkflowDocument findById(String id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));
    }

    public List<WorkflowDocument> findByProcessInstanceId(String processInstanceId) {
        return documentRepository.findByProcessInstanceId(processInstanceId);
    }

    public List<WorkflowDocument> findByClientId(String clientId) {
        return documentRepository.findByClientId(clientId);
    }

    public List<WorkflowDocument> findByPolicyId(String policyId) {
        return documentRepository.findByPolicyId(policyId);
    }

    public List<WorkflowDocument> findByProcessInstanceIdAndNodeId(
            String processInstanceId,
            String nodeId
    ) {
        return documentRepository.findByProcessInstanceIdAndNodeId(processInstanceId, nodeId);
    }

    public Resource loadFileAsResourceAndRegisterDownload(
            String storedFileName,
            String userId,
            String userName
    ) {
        WorkflowDocument document = documentRepository.findByStoredFileName(storedFileName)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado para descarga"));

        if (document.getStoragePath() == null || document.getStoragePath().trim().isEmpty()) {
            throw new RuntimeException("El documento no tiene ruta de almacenamiento en S3");
        }

        Resource resource = s3StorageService.loadFileAsResource(
                document.getStoragePath(),
                document.getOriginalFileName()
        );

        auditLogService.registerAction(
                document,
                "DOWNLOADED",
                userId,
                userName,
                document.getDocumentStatus(),
                document.getDocumentStatus(),
                "Documento descargado desde S3",
                buildDownloadMetadata(document)
        );

        return resource;
    }

    public WorkflowDocument updateDocumentStatus(
            String documentId,
            String status,
            String observation,
            String reviewedByUserId,
            String reviewedByUserName
    ) {
        WorkflowDocument document = findById(documentId);

        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("El estado del documento es obligatorio");
        }

        String previousStatus = document.getDocumentStatus();
        String normalizedStatus = status.trim().toUpperCase();

        if (!normalizedStatus.equals("PENDING")
                && !normalizedStatus.equals("APPROVED")
                && !normalizedStatus.equals("REJECTED")
                && !normalizedStatus.equals("OBSERVED")) {
            throw new IllegalArgumentException("Estado de documento inválido: " + status);
        }

        document.setDocumentStatus(normalizedStatus);
        document.setObservation(observation);
        document.setReviewedByUserId(reviewedByUserId);
        document.setReviewedByUserName(reviewedByUserName);
        document.setReviewedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());

        WorkflowDocument updatedDocument = documentRepository.save(document);

        auditLogService.registerAction(
                updatedDocument,
                "REVIEWED",
                reviewedByUserId,
                reviewedByUserName,
                previousStatus,
                normalizedStatus,
                observation,
                buildReviewMetadata(updatedDocument)
        );

        return updatedDocument;
    }

    public WorkflowDocument registerView(
            String documentId,
            String userId,
            String userName
    ) {
        WorkflowDocument document = findById(documentId);

        auditLogService.registerAction(
                document,
                "VIEWED",
                userId,
                userName,
                document.getDocumentStatus(),
                document.getDocumentStatus(),
                "Documento visualizado",
                buildViewMetadata(document)
        );

        return document;
    }

    private Map<String, Object> buildUploadMetadata(WorkflowDocument document) {
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("documentId", document.getId());
        metadata.put("originalFileName", document.getOriginalFileName());
        metadata.put("storedFileName", document.getStoredFileName());
        metadata.put("storagePath", document.getStoragePath());
        metadata.put("contentType", document.getContentType());
        metadata.put("size", document.getSize());
        metadata.put("policyId", document.getPolicyId());
        metadata.put("processInstanceId", document.getProcessInstanceId());
        metadata.put("clientId", document.getClientId());
        metadata.put("nodeId", document.getNodeId());
        metadata.put("departmentId", document.getDepartmentId());
        metadata.put("requiredDocumentId", document.getRequiredDocumentId());
        metadata.put("requiredDocumentName", document.getRequiredDocumentName());

        return metadata;
    }

    private Map<String, Object> buildDownloadMetadata(WorkflowDocument document) {
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("documentId", document.getId());
        metadata.put("storedFileName", document.getStoredFileName());
        metadata.put("storagePath", document.getStoragePath());
        metadata.put("originalFileName", document.getOriginalFileName());

        return metadata;
    }

    private Map<String, Object> buildReviewMetadata(WorkflowDocument document) {
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("documentId", document.getId());
        metadata.put("reviewedAt", document.getReviewedAt() != null
                ? document.getReviewedAt().toString()
                : null);
        metadata.put("reviewedByUserId", document.getReviewedByUserId());
        metadata.put("reviewedByUserName", document.getReviewedByUserName());
        metadata.put("status", document.getDocumentStatus());
        metadata.put("observation", document.getObservation());

        return metadata;
    }

    private Map<String, Object> buildViewMetadata(WorkflowDocument document) {
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("documentId", document.getId());
        metadata.put("originalFileName", document.getOriginalFileName());
        metadata.put("storedFileName", document.getStoredFileName());
        metadata.put("storagePath", document.getStoragePath());

        return metadata;
    }
}