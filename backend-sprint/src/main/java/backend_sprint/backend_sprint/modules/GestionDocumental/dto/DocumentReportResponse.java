package backend_sprint.backend_sprint.modules.GestionDocumental.dto;

import java.time.LocalDateTime;
import java.util.List;

public class DocumentReportResponse {

    private String title;
    private String description;
    private LocalDateTime generatedAt;

    private DocumentDashboardSummaryResponse summary;
    private List<DocumentCountByStatusResponse> documentsByStatus;
    private List<DocumentCountByProcessResponse> documentsByProcess;

    private List<String> conclusions;

    public DocumentReportResponse() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public DocumentDashboardSummaryResponse getSummary() {
        return summary;
    }

    public void setSummary(DocumentDashboardSummaryResponse summary) {
        this.summary = summary;
    }

    public List<DocumentCountByStatusResponse> getDocumentsByStatus() {
        return documentsByStatus;
    }

    public void setDocumentsByStatus(List<DocumentCountByStatusResponse> documentsByStatus) {
        this.documentsByStatus = documentsByStatus;
    }

    public List<DocumentCountByProcessResponse> getDocumentsByProcess() {
        return documentsByProcess;
    }

    public void setDocumentsByProcess(List<DocumentCountByProcessResponse> documentsByProcess) {
        this.documentsByProcess = documentsByProcess;
    }

    public List<String> getConclusions() {
        return conclusions;
    }

    public void setConclusions(List<String> conclusions) {
        this.conclusions = conclusions;
    }
}