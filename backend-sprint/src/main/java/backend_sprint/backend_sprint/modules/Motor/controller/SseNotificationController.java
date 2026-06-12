package backend_sprint.backend_sprint.modules.Motor.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import backend_sprint.backend_sprint.modules.Motor.service.SseNotificationService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor // Genera el constructor de forma automática para el atributo final
@PreAuthorize("hasAnyAuthority('Funcionario', 'FUNCIONARIO')")
public class SseNotificationController {
    
    private static final Logger log = LoggerFactory.getLogger(SseNotificationController.class);
    private final SseNotificationService notificationService;

    // Endpoint de suscripción SSE
    @GetMapping(value = "/stream/{departmentId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String departmentId) {
        // Añadimos un log informativo para saber qué departamento está abriendo el canal de streaming
        log.info("🔌 [SSE] Nueva solicitud de suscripción en tiempo real para el departamento: {}", departmentId);
        
        return notificationService.subscribe(departmentId);
    }
}