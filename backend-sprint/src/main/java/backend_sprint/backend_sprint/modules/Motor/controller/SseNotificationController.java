package backend_sprint.backend_sprint.modules.Motor.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import backend_sprint.backend_sprint.modules.Motor.service.SseNotificationService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;


@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasAnyAuthority('Funcionario', 'FUNCIONARIO')")
public class SseNotificationController {
    
    private final SseNotificationService notificationService;

    public SseNotificationController(SseNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // Endpoint de suscripción SSE
    @GetMapping(value = "/stream/{departmentId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String departmentId) {
        return notificationService.subscribe(departmentId);
    }
}
