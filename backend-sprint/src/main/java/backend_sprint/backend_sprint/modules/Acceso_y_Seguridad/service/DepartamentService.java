package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.DepartamentDTO;

public interface DepartamentService {
    List<DepartamentDTO> findAll();

    DepartamentDTO findById(String id);

    DepartamentDTO create(DepartamentDTO request);

    DepartamentDTO update(String id, DepartamentDTO request);

    void delete(String id);
}
