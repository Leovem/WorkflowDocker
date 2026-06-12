package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class DocumentReportFilterRequest {

    private String status;
    private String policyId;
    private String processInstanceId;
    private String clientId;
    private String nodeId;
    private String departmentId;
    private String requiredDocumentName;
    private String uploadedByUserId;

    public DocumentReportFilterRequest() {
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