package backend_sprint.backend_sprint.modules.Motor.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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


@RestController
@RequestMapping("api/profiles")
public class ProfileController {

    private final EphemeralProfileRepository profileRepo;
    private final InstanceService instanceService;

    public ProfileController(EphemeralProfileRepository profileRepo, InstanceService instanceService) {
        this.profileRepo = profileRepo;
        this.instanceService = instanceService;
    }



    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String token = request.getToken();

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El token es obligatorio."));
        }

        // 1. Buscar el perfil por el token opaco
        Optional<EphemeralProfile> profileOpt = profileRepo.findByAccessToken(token);

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

        // 3. Verificar expiración (CU8 - Flujo alternativo 4)
        // Recordatorio: Si tokenExpiresAt es null, significa que el trámite está en curso.
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
    public ResponseEntity<?> updateFcmToken(@RequestBody FcmTokenRequest request) {
        
        Optional<EphemeralProfile> profileOpt = profileRepo.findByAccessToken(request.getAccessToken());

        if (profileOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Token de acceso inválido."));
        }
        System.err.println("🔔 [MÓVIL] Actualizando token FCM para el perfil: " + profileOpt.get().getId());

        EphemeralProfile profile = profileOpt.get();
        
        // Guardamos el token del celular en la base de datos
        profile.setFcmToken(request.getFcmToken());
        profileRepo.save(profile);

        return ResponseEntity.ok(Map.of("message", "Token de notificaciones actualizado correctamente."));
    }
    



    // 🚀 NUEVO: Endpoint para la app móvil del ciudadano
    @GetMapping("/profile/{profileId}")
    public ResponseEntity<?> getCitizenInstances(@PathVariable String profileId) {
        System.out.println("📱 [MÓVIL] Petición de historial recibida para el usuario: " + profileId);
        
        if (profileId == null || profileId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El ID del perfil es requerido"));
        }

        try {
            List<Map<String, Object>> respuesta = instanceService.getInstancesForMobile(profileId);
            
            System.out.println("✅ [MÓVIL] Se enviaron " + respuesta.size() + " trámites al ciudadano.");
            return ResponseEntity.ok(respuesta); // Retorna un array JSON 

        } catch (Exception e) {
            System.err.println("🔥 [MÓVIL] Error al obtener el historial del ciudadano: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Ocurrió un problema interno al cargar los trámites"
            ));
        }
    }
}
