package backend_sprint.backend_sprint.modules.Motor.DTO;


import backend_sprint.backend_sprint.modules.Motor.model.Instance;
import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstanceResponse {
    private Instance instance;
    private EphemeralProfile profile;
}