package backend_sprint.backend_sprint.modules.Proccess.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend_sprint.backend_sprint.modules.Proccess.service.PolicyService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/policies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('Root', 'ROOT', 'Administrador', 'ADMINISTRADOR', 'Recepcionista', 'RECEPCIONISTA')")
public class PolicyController {

    private final PolicyService policyService;

    @GetMapping
    public ResponseEntity<?> getAllPolicies() {
        return ResponseEntity.ok(policyService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActivePolicies() {
        return ResponseEntity.ok(policyService.findActivePolicies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPolicyById(@PathVariable String id) {
        return ResponseEntity.ok(policyService.findById(id));
    }

    @PostMapping
    public ResponseEntity<?> createPolicy(@RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(policyService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePolicy(@PathVariable String id, @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(policyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePolicy(@PathVariable String id) {
        policyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}