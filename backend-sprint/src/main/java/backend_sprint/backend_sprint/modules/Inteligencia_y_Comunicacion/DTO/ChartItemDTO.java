package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.DTO;

public class ChartItemDTO {
    private String name;
    private long count;

    public ChartItemDTO() {}

    public ChartItemDTO(String name, long count) {
        this.name = name;
        this.count = count;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}