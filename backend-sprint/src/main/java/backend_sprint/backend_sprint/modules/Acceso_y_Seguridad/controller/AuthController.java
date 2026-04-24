package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.LoginRequest;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.UserRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.JwtService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return userRepository.findByName(request.getName())
                    .map(user -> {
                        if (!user.isActive()) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("message",
                                            "Usuario bloqueado/inactivo. Por favor, contacte al administrador."));
                        }

                        if (passwordEncoder.matches(request.getPasswordHash(), user.getPasswordHash())) {
                            String token = jwtService.generateToken(user.getName());
                            // 1. Usamos HashMap en lugar de Map.of
                            Map<String, String> responseBody = new HashMap<>();
                            responseBody.put("token", token);
                            responseBody.put("user", user.getName());
                            
                            // 2. Protegemos el Rol (Si es null, devolvemos "SIN_ROL")
                            responseBody.put("role", user.getRole() != null ? user.getRole().getName() : "SIN_ROL");
                            
                            // 3. Protegemos el Departamento (Si es null, devolvemos "SIN_DEPARTAMENTO")
                            responseBody.put("departament", user.getDepartamento() != null ? user.getDepartamento().getName() : "SIN_DEPARTAMENTO");

                            responseBody.put("departamentId", user.getDepartamento() != null ? user.getDepartamento().getId() : "SIN_DEPARTAMENTO");

                            return ResponseEntity.ok(responseBody);
                        } else {
                            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                    .body(Map.of("message", "Usuario o contraseña incorrecta"));
                        }
                    })
                    .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Usuario o contraseña incorrecta")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "El servicio de autenticación no está disponible momentáneamente."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtService.invalidateToken(token);
        }
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada exitosamente, token invalidado."));
    }

}
