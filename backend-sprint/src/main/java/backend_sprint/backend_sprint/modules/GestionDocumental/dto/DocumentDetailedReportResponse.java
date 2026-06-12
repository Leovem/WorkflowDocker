package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;
import java.util.List;

public class DocumentDetailedReportResponse {

    private String title;
    private String description;
    private LocalDateTime generatedAt;
    private String nodeId;
    private String departmentId;
    private String requiredDocumentName;
    private String uploadedByUserId;

    private String status;
    private String policyId;
    private String processInstanceId;
    private String clientId;

    private long totalDocuments;

    private List<WorkflowDocumentResponse> documents;

    public DocumentDetailedReportResponse() {
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public String getStatus() {
        return status;
    }

    public String getPolicyId() {
        return policyId;
    }

    public String getProcessInstanceId() {
        return processInstanceId;
    }

    public String getClientId() {
        return clientId;
    }

    public long getTotalDocuments() {
        return totalDocuments;
    }

    public List<WorkflowDocumentResponse> getDocuments() {
        return documents;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setPolicyId(String policyId) {
        this.policyId = policyId;
    }

    public void setProcessInstanceId(String processInstanceId) {
        this.processInstanceId = processInstanceId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setTotalDocuments(long totalDocuments) {
        this.totalDocuments = totalDocuments;
    }

    public void setDocuments(List<WorkflowDocumentResponse> documents) {
        this.documents = documents;
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

    public String getRequiredDocumentName() {
        return requiredDocumentName;
    }

    public void setRequiredDocumentName(String requiredDocumentName) {
        this.requiredDocumentName = requiredDocumentName;
    }

    public String getUploadedByUserId() {
        return uploadedByUserId;
    }

    public void setUploadedByUserId(String uploadedByUserId) {
        this.uploadedByUserId = uploadedByUserId;
    }
}