package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO;

public class BottleneckItemDTO {

    private String type;
    private String severity;

    private String policyName;
    private String nodeName;

    private Long taskCount;
    private Double averageDurationMinutes;
    private Double maxDurationMinutes;

    private String message;
    private String recommendation;

    public BottleneckItemDTO() {
    }

    public String getType() {
        return type;
    }

    public String getSeverity() {
        return severity;
    }

    public String getPolicyName() {
        return policyName;
    }

    public String getNodeName() {
        return nodeName;
    }

    public Long getTaskCount() {
        return taskCount;
    }

    public Double getAverageDurationMinutes() {
        return averageDurationMinutes;
    }

    public Double getMaxDurationMinutes() {
        return maxDurationMinutes;
    }

    public String getMessage() {
        return message;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public void setPolicyName(String policyName) {
        this.policyName = policyName;
    }

    public void setNodeName(String nodeName) {
        this.nodeName = nodeName;
    }

    public void setTaskCount(Long taskCount) {
        this.taskCount = taskCount;
    }

    public void setAverageDurationMinutes(Double averageDurationMinutes) {
        this.averageDurationMinutes = averageDurationMinutes;
    }

    public void setMaxDurationMinutes(Double maxDurationMinutes) {
        this.maxDurationMinutes = maxDurationMinutes;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }
}