package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.UserRequestDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.UserResponseDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Departament;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Role;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.User;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public List<UserResponseDTO> findAll() {
        return userRepository.findByIsActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO findById(String id) {
        User user = userRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
        return mapToDTO(user);
    }

    @Override
    public UserResponseDTO create(UserRequestDTO request) {
        if (userRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un usuario con el nombre: " + request.getName());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Ya existe un usuario con el email: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        if (request.getRoleId() != null) {
            Role role = new Role();
            role.setId(request.getRoleId());
            user.setRole(role);
        }

        if (request.getDepartamentoId() != null) {
            Departament dept = new Departament();
            dept.setId(request.getDepartamentoId());
            user.setDepartamento(dept);
        }

        User savedUser = userRepository.save(user);
        return mapToDTO(savedUser);
    }

    @Override
    public UserResponseDTO update(String id, UserRequestDTO request) {
        User user = userRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));

        if (!user.getName().equals(request.getName()) && userRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un usuario con el nombre: " + request.getName());
        }
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Ya existe un usuario con el email: " + request.getEmail());
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoleId() != null) {
            Role role = new Role();
            role.setId(request.getRoleId());
            user.setRole(role);
        } else {
            user.setRole(null);
        }

        if (request.getDepartamentoId() != null) {
            Departament dept = new Departament();
            dept.setId(request.getDepartamentoId());
            user.setDepartamento(dept);
        } else {
            user.setDepartamento(null);
        }

        User updatedUser = userRepository.save(user);
        return mapToDTO(updatedUser);
    }

    @Override
    public void delete(String id) {
        User user = userRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));

        user.setActive(false);
        userRepository.save(user);
    }

    private UserResponseDTO mapToDTO(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .departamento(user.getDepartamento())
                .createAt(user.getCreateAt())
                .isActive(user.isActive())
                .build();
    }
}
