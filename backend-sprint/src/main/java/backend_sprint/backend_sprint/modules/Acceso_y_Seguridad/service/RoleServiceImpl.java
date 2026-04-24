package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.RoleDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Role;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.RoleRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public List<RoleDTO> findAll() {
        return roleRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public RoleDTO findById(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado con ID: " + id));
        return mapToDTO(role);
    }

    @Override
    public RoleDTO create(RoleDTO request) {
        if (roleRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un rol con el nombre: " + request.getName());
        }
        Role role = new Role();
        role.setName(request.getName());
        Role savedRole = roleRepository.save(role);
        return mapToDTO(savedRole);
    }

    @Override
    public RoleDTO update(String id, RoleDTO request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado con ID: " + id));

        if (!role.getName().equals(request.getName()) && roleRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un rol con el nombre: " + request.getName());
        }

        role.setName(request.getName());
        Role updatedRole = roleRepository.save(role);
        return mapToDTO(updatedRole);
    }

    @Override
    public void delete(String id) {
        if (!roleRepository.existsById(id)) {
            throw new IllegalArgumentException("Rol no encontrado con ID: " + id);
        }
        roleRepository.deleteById(id);
    }

    private RoleDTO mapToDTO(Role role) {
        return RoleDTO.builder()
                .id(role.getId())
                .name(role.getName())
                .build();
    }
}
