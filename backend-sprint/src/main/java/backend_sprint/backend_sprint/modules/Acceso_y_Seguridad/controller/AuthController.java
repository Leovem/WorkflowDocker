package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.LoginRequest;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.AuthService;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    
    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@Valid @RequestBody LoginRequest request) {
        log.info("🔐 Intentando iniciar sesión para el usuario: {}", request.getName());
        
        // Toda la lógica pesada pasa al servicio, manteniendo el controlador impecable
        Map<String, String> responseBody = authService.authenticate(request);
        
        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtService.invalidateToken(token);
            log.info("🚪 Sesión cerrada correctamente e invalidación de token completada.");
        }
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada exitosamente, token invalidado."));
    }
}