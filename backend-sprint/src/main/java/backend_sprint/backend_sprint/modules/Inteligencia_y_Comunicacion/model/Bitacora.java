package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "Bitacora")
@Getter @Setter
public class Bitacora {

    @Id
    private String id;
    
    private String instanceId;
    private String policyId;
    private String policyName;
    
    private String nodeId;
    private String nodeName;

    private ExecutionUser user;
    private ExecutionTiming timing;

    private String action;
    private boolean hasMultimedia;


    @Getter @Setter
    public static class ExecutionUser {
        private String name;
        private String departamentId;
        private String departamentName;
    }


    @Getter @Setter
    public static class ExecutionTiming {
        private LocalDateTime assignedAt;
        private LocalDateTime completedAt;
        private long durationMinutes;
    }
}