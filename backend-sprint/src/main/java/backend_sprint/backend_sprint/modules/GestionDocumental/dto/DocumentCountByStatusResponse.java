package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class DocumentCountByStatusResponse {

    private String status;
    private long total;

    public DocumentCountByStatusResponse() {
    }

    public DocumentCountByStatusResponse(String status, long total) {
        this.status = status;
        this.total = total;
    }

    public String getStatus() {
        return status;
    }

    public long getTotal() {
        return total;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setTotal(long total) {
        this.total = total;
    }
}