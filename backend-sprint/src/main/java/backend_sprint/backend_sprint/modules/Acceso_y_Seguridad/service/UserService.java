package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.UserRequestDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.UserResponseDTO;

public interface UserService {
    List<UserResponseDTO> findAll();

    UserResponseDTO findById(String id);

    UserResponseDTO create(UserRequestDTO request);

    UserResponseDTO update(String id, UserRequestDTO request);

    void delete(String id);
}
