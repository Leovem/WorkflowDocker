package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;
import java.util.Map;

import backend_sprint.backend_sprint.modules.GestionDocumental.model.DocumentAuditLog;

public class DocumentAuditLogResponse {

    private String id;

    private String documentId;
    private String policyId;
    private String processInstanceId;
    private String clientId;
    private String nodeId;

    private String action;

    private String userId;
    private String userName;

    private String previousStatus;
    private String newStatus;

    private String observation;

    private LocalDateTime createdAt;

    private Map<String, Object> metadata;

    public DocumentAuditLogResponse() {
    }

    public static DocumentAuditLogResponse fromEntity(DocumentAuditLog log) {
        DocumentAuditLogResponse response = new DocumentAuditLogResponse();

        response.setId(log.getId());
        response.setDocumentId(log.getDocumentId());
        response.setPolicyId(log.getPolicyId());
        response.setProcessInstanceId(log.getProcessInstanceId());
        response.setClientId(log.getClientId());
        response.setNodeId(log.getNodeId());

        response.setAction(log.getAction());

        response.setUserId(log.getUserId());
        response.setUserName(log.getUserName());

        response.setPreviousStatus(log.getPreviousStatus());
        response.setNewStatus(log.getNewStatus());

        response.setObservation(log.getObservation());

        response.setCreatedAt(log.getCreatedAt());

        response.setMetadata(log.getMetadata());

        return response;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    // Puedes generar los demás getters/setters automáticamente con tu IDE

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String observation) {
        this.observation = observation;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}