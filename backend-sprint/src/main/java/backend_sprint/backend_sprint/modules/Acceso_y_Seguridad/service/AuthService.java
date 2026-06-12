package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.LoginRequest;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.User;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder; // Inyectado como Bean de Spring

    public Map<String, String> authenticate(LoginRequest request) {
        User user = userRepository.findByName(request.getName())
                .orElseThrow(() -> new BadCredentialsException("Usuario o contraseña incorrecta"));

        if (!user.isActive()) {
            throw new DisabledException("Usuario bloqueado/inactivo. Por favor, contacte al administrador.");
        }

        if (!passwordEncoder.matches(request.getPasswordHash(), user.getPasswordHash())) {
            throw new BadCredentialsException("Usuario o contraseña incorrecta");
        }

        String token = jwtService.generateToken(user.getName());
        
        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("token", token);
        responseBody.put("user", user.getName());
        responseBody.put("role", user.getRole() != null ? user.getRole().getName() : "SIN_ROL");
        responseBody.put("departament", user.getDepartamento() != null ? user.getDepartamento().getName() : "SIN_DEPARTAMENTO");
        responseBody.put("departamentId", user.getDepartamento() != null ? user.getDepartamento().getId() : "SIN_DEPARTAMENTO");

        return responseBody;
    }
}