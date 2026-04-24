package backend_sprint.backend_sprint.modules.Motor.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "instances")
@Getter @Setter
public class Instance {
    @Id
    private String id;
    private String policyId;
    private String profileId;

    private String status; // "active", "completed", "terminated"
    private String currentNodeId;
    private String currentDepartmentId;

    private Map<String, Object> workflow = new HashMap<>();

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();


    private List<Map<String, Object>> history;

    public List<Map<String, Object>> getHistory() { return history; }
    public void setHistory(List<Map<String, Object>> history) { this.history = history; }
    public Object map(Object object) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'map'");
    }

    private List<String> pendingNodes = new ArrayList<>();
    private List<String> activeDepartments = new ArrayList<>();


    private Map<String, Integer> joinState = new HashMap<>(); // Memoria del Join

}
