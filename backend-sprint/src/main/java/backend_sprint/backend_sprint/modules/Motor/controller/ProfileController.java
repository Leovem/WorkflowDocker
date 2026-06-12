package backend_sprint.backend_sprint.modules.Motor.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Motor.DTO.FcmTokenRequest;
import backend_sprint.backend_sprint.modules.Motor.DTO.LoginRequest;
import backend_sprint.backend_sprint.modules.Motor.model.EphemeralProfile;
import backend_sprint.backend_sprint.modules.Motor.repository.EphemeralProfileRepository;
import backend_sprint.backend_sprint.modules.Motor.service.InstanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("api/profiles")
public class ProfileController {

    private static final Logger log = LoggerFactory.getLogger(ProfileController.class);

    private final EphemeralProfileRepository profileRepo;
    private final InstanceService instanceService;

    public ProfileController(EphemeralProfileRepository profileRepo, InstanceService instanceService) {
        this.profileRepo = profileRepo;
        this.instanceService = instanceService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        // Al usar @Valid, si el token viene vacío, Spring arroja la excepción automáticamente

        // 1. Buscar el perfil por el token opaco
        Optional<EphemeralProfile> profileOpt = profileRepo.findByAccessToken(request.getToken());

        if (profileOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Token inválido o no encontrado."));
        }

        EphemeralProfile profile = profileOpt.get();

        // 2. Verificar si el perfil está activo (Seguridad)
        if (!profile.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Este perfil ha sido desactivado."));
        }

        // 3. Verificar expiración
        if (profile.getTokenExpiresAt() != null && profile.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            profile.setActive(false);
            profileRepo.save(profile);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "El token ha expirado (período de 5 días finalizado)."));
        }

        // 4. Acceso Concedido
        return ResponseEntity.ok(Map.of(
            "message", "Acceso concedido",
            "profile", Map.of(
                "id", profile.getId(),
                "name", profile.getName(),
                "email", profile.getEmail(),
                "isExpiredSoon", profile.getTokenExpiresAt() != null
            )
        ));
    }

    @PostMapping("/update-fcm-token")
    public ResponseEntity<?> updateFcmToken(@Valid @RequestBody FcmTokenRequest request) {
        
        Optional<EphemeralProfile> profileOpt = profileRepo.findByAccessToken(request.getAccessToken());

        if (profileOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Token de acceso inválido."));
        }
        
        // CORREGIDO: Uso de Logger en vez de System.err
        log.info("🔔 [MÓVIL] Actualizando token FCM para el perfil: {}", profileOpt.get().getId());

        EphemeralProfile profile = profileOpt.get();
        profile.setFcmToken(request.getFcmToken());
        profileRepo.save(profile);

        return ResponseEntity.ok(Map.of("message", "Token de notificaciones actualizado correctamente."));
    }
    
    @GetMapping("/profile/{profileId}")
    public ResponseEntity<List<Map<String, Object>>> getCitizenInstances(@PathVariable String profileId) {
        // CORREGIDO: Uso de Logger en vez de System.out
        log.info("📱 [MÓVIL] Petición de historial recibida para el usuario: {}", profileId);
        
        if (profileId == null || profileId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // CORREGIDO: Eliminamos el try-catch genérico. Cualquier excepción vuela directamente al GlobalExceptionHandler
        List<Map<String, Object>> respuesta = instanceService.getInstancesForMobile(profileId);
        
        log.info("✅ [MÓVIL] Se enviaron {} trámites al ciudadano.", respuesta.size());
        return ResponseEntity.ok(respuesta); 
    }
}