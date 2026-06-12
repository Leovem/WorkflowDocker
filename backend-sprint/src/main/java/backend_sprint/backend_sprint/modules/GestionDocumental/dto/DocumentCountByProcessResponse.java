package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class DocumentCountByProcessResponse {

    private String processInstanceId;
    private long totalDocuments;

    public DocumentCountByProcessResponse() {
    }

    public DocumentCountByProcessResponse(String processInstanceId, long totalDocuments) {
        this.processInstanceId = processInstanceId;
        this.totalDocuments = totalDocuments;
    }

    public String getProcessInstanceId() {
        return processInstanceId;
    }

    public void setProcessInstanceId(String processInstanceId) {
        this.processInstanceId = processInstanceId;
    }

    public long getTotalDocuments() {
        return totalDocuments;
    }

    public void setTotalDocuments(long totalDocuments) {
        this.totalDocuments = totalDocuments;
    }
}