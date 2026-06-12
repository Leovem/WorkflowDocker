package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentVersion;

public class DocumentVersionResponse {

    private String id;
    private String documentId;

    private Integer versionNumber;

    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private Long size;

    private String downloadUrl;

    private String uploadedByUserId;
    private String uploadedByUserName;

    private String changeReason;

    private LocalDateTime createdAt;

    public DocumentVersionResponse() {
    }

    public static DocumentVersionResponse fromEntity(DocumentVersion version) {
        DocumentVersionResponse response = new DocumentVersionResponse();

        response.setId(version.getId());
        response.setDocumentId(version.getDocumentId());

        response.setVersionNumber(version.getVersionNumber());

        response.setOriginalFileName(version.getOriginalFileName());
        response.setStoredFileName(version.getStoredFileName());
        response.setContentType(version.getContentType());
        response.setSize(version.getSize());

        response.setDownloadUrl(version.getDownloadUrl());

        response.setUploadedByUserId(version.getUploadedByUserId());
        response.setUploadedByUserName(version.getUploadedByUserName());

        response.setChangeReason(version.getChangeReason());
        response.setCreatedAt(version.getCreatedAt());

        return response;
    }

    public String getId() {
        return id;
    }

    public String getDocumentId() {
        return documentId;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public Long getSize() {
        return size;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public String getUploadedByUserId() {
        return uploadedByUserId;
    }

    public String getUploadedByUserName() {
        return uploadedByUserName;
    }

    public String getChangeReason() {
        return changeReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    public void setUploadedByUserId(String uploadedByUserId) {
        this.uploadedByUserId = uploadedByUserId;
    }

    public void setUploadedByUserName(String uploadedByUserName) {
        this.uploadedByUserName = uploadedByUserName;
    }

    public void setChangeReason(String changeReason) {
        this.changeReason = changeReason;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}