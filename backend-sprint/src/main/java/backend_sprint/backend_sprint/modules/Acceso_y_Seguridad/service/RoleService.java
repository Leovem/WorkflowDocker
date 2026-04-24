package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.RoleDTO;

public interface RoleService {
    List<RoleDTO> findAll();

    RoleDTO findById(String id);

    RoleDTO create(RoleDTO request);

    RoleDTO update(String id, RoleDTO request);

    void delete(String id);
}
