package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class UpdateDocumentStatusRequest {

    private String status;
    private String observation;
    private String reviewedByUserId;
    private String reviewedByUserName;

    public UpdateDocumentStatusRequest() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
}