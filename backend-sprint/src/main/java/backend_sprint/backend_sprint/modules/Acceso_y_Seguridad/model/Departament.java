package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "departaments")
@Data
@NoArgsConstructor
@Getter
@Setter
public class Departament {

    @Id
    private String id;

    private String name;
}
