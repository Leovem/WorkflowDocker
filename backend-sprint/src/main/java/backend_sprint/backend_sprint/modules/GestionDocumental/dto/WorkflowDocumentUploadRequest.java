package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class WorkflowDocumentUploadRequest {

    private String policyId;
    private String processInstanceId;
    private String clientId;
    private String nodeId;
    private String departmentId;
    private String requiredDocumentId;
    private String requiredDocumentName;
    private String uploadedByUserId;
    private String uploadedByUserName;

    public WorkflowDocumentUploadRequest() {
    }

    public String getPolicyId() {
        return policyId;
    }

    public void setPolicyId(String policyId) {
        this.policyId = policyId;
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
}