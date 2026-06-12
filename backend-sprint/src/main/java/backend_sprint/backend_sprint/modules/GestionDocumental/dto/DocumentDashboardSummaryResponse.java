package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

public class DocumentDashboardSummaryResponse {

    private long totalDocuments;
    private long pendingDocuments;
    private long approvedDocuments;
    private long rejectedDocuments;
    private long observedDocuments;

    private long totalUploaded;
    private long totalReviewed;
    private long totalViewed;
    private long totalDownloaded;

    public DocumentDashboardSummaryResponse() {
    }

    public long getTotalDocuments() {
        return totalDocuments;
    }

    public void setTotalDocuments(long totalDocuments) {
        this.totalDocuments = totalDocuments;
    }

    public long getPendingDocuments() {
        return pendingDocuments;
    }

    public void setPendingDocuments(long pendingDocuments) {
        this.pendingDocuments = pendingDocuments;
    }

    public long getApprovedDocuments() {
        return approvedDocuments;
    }

    public void setApprovedDocuments(long approvedDocuments) {
        this.approvedDocuments = approvedDocuments;
    }

    public long getRejectedDocuments() {
        return rejectedDocuments;
    }

    public void setRejectedDocuments(long rejectedDocuments) {
        this.rejectedDocuments = rejectedDocuments;
    }

    public long getObservedDocuments() {
        return observedDocuments;
    }

    public void setObservedDocuments(long observedDocuments) {
        this.observedDocuments = observedDocuments;
    }

    public long getTotalUploaded() {
        return totalUploaded;
    }

    public void setTotalUploaded(long totalUploaded) {
        this.totalUploaded = totalUploaded;
    }

    public long getTotalReviewed() {
        return totalReviewed;
    }

    public void setTotalReviewed(long totalReviewed) {
        this.totalReviewed = totalReviewed;
    }

    public long getTotalViewed() {
        return totalViewed;
    }

    public void setTotalViewed(long totalViewed) {
        this.totalViewed = totalViewed;
    }

    public long getTotalDownloaded() {
        return totalDownloaded;
    }

    public void setTotalDownloaded(long totalDownloaded) {
        this.totalDownloaded = totalDownloaded;
    }
}