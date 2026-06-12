package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;
import java.util.List;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;

public class WorkflowDocumentResponse {

    private String id;

    private String policyId;
    private String processInstanceId;
    private String clientId;
    private String nodeId;
    private String departmentId;
    private String requiredDocumentId;
    private String requiredDocumentName;

    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private Long size;

    private String downloadUrl;

    private String uploadedByUserId;
    private String uploadedByUserName;

    private String observation;

    private String reviewedByUserId;
    private String reviewedByUserName;
    private LocalDateTime reviewedAt;

    private String documentStatus;
    private Integer version;
    private List<String> tags;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WorkflowDocumentResponse() {
    }

    public static WorkflowDocumentResponse fromEntity(WorkflowDocument document) {
        WorkflowDocumentResponse response = new WorkflowDocumentResponse();

        response.setId(document.getId());
        response.setPolicyId(document.getPolicyId());
        response.setProcessInstanceId(document.getProcessInstanceId());
        response.setClientId(document.getClientId());
        response.setNodeId(document.getNodeId());
        response.setDepartmentId(document.getDepartmentId());
        response.setRequiredDocumentId(document.getRequiredDocumentId());
        response.setRequiredDocumentName(document.getRequiredDocumentName());
        response.setOriginalFileName(document.getOriginalFileName());
        response.setStoredFileName(document.getStoredFileName());
        response.setContentType(document.getContentType());
        response.setSize(document.getSize());

        response.setDownloadUrl(document.getDownloadUrl());

        response.setUploadedByUserId(document.getUploadedByUserId());
        response.setUploadedByUserName(document.getUploadedByUserName());

        response.setObservation(document.getObservation());
        response.setReviewedByUserId(document.getReviewedByUserId());
        response.setReviewedByUserName(document.getReviewedByUserName());
        response.setReviewedAt(document.getReviewedAt());

        response.setDocumentStatus(document.getDocumentStatus());
        response.setVersion(document.getVersion());
        response.setTags(document.getTags());

        response.setCreatedAt(document.getCreatedAt());
        response.setUpdatedAt(document.getUpdatedAt());

        return response;
    }

    public String getId() {
        return id;
    }

    public String getPolicyId() {
        return policyId;
    }

    public void setPolicyId(String policyId) {
        this.policyId = policyId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProcessInstanceId() {
        return processInstanceId;
    }

    public void setProcessInstanceId(String processInstanceId) {
        this.processInstanceId = processInstanceId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getRequiredDocumentId() {
        return requiredDocumentId;
    }

    public void setRequiredDocumentId(String requiredDocumentId) {
        this.requiredDocumentId = requiredDocumentId;
    }

    public String getRequiredDocumentName() {
        return requiredDocumentName;
    }

    public void setRequiredDocumentName(String requiredDocumentName) {
        this.requiredDocumentName = requiredDocumentName;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    public String getUploadedByUserId() {
        return uploadedByUserId;
    }

    public void setUploadedByUserId(String uploadedByUserId) {
        this.uploadedByUserId = uploadedByUserId;
    }

    public String getUploadedByUserName() {
        return uploadedByUserName;
    }

    public void setUploadedByUserName(String uploadedByUserName) {
        this.uploadedByUserName = uploadedByUserName;
    }

    public String getDocumentStatus() {
        return documentStatus;
    }

    public void setDocumentStatus(String documentStatus) {
        this.documentStatus = documentStatus;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String observation) {
        this.observation = observation;
    }

    public String getReviewedByUserId() {
        return reviewedByUserId;
    }

    public void setReviewedByUserId(String reviewedByUserId) {
        this.reviewedByUserId = reviewedByUserId;
    }

    public String getReviewedByUserName() {
        return reviewedByUserName;
    }

    public void setReviewedByUserName(String reviewedByUserName) {
        this.reviewedByUserName = reviewedByUserName;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}