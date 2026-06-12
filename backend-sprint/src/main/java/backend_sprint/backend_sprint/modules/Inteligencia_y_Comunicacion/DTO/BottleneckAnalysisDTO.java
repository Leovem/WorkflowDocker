package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO;

import java.time.LocalDateTime;
import java.util.List;

public class BottleneckAnalysisDTO {

    private LocalDateTime generatedAt;

    private long totalTasksAnalyzed;
    private double averageDurationMinutes;

    private int totalBottlenecks;
    private String generalStatus;

    private List<BottleneckItemDTO> bottlenecks;

    public BottleneckAnalysisDTO() {
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public long getTotalTasksAnalyzed() {
        return totalTasksAnalyzed;
    }

    public double getAverageDurationMinutes() {
        return averageDurationMinutes;
    }

    public int getTotalBottlenecks() {
        return totalBottlenecks;
    }

    public String getGeneralStatus() {
        return generalStatus;
    }

    public List<BottleneckItemDTO> getBottlenecks() {
        return bottlenecks;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public void setTotalTasksAnalyzed(long totalTasksAnalyzed) {
        this.totalTasksAnalyzed = totalTasksAnalyzed;
    }

    public void setAverageDurationMinutes(double averageDurationMinutes) {
        this.averageDurationMinutes = averageDurationMinutes;
    }

    public void setTotalBottlenecks(int totalBottlenecks) {
        this.totalBottlenecks = totalBottlenecks;
    }

    public void setGeneralStatus(String generalStatus) {
        this.generalStatus = generalStatus;
    }

    public void setBottlenecks(List<BottleneckItemDTO> bottlenecks) {
        this.bottlenecks = bottlenecks;
    }
}