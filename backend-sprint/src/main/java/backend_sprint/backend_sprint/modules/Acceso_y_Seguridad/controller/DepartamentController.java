package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.DepartamentDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.DepartamentService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/departaments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('Root', 'ROOT', 'Administrador', 'ADMINISTRADOR')")
public class DepartamentController {

    private final DepartamentService departamentService;

    @GetMapping
    public ResponseEntity<?> getAllDepartaments() {
        try {
            return ResponseEntity.ok(departamentService.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDepartamentById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(departamentService.findById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createDepartament(@RequestBody DepartamentDTO request) {
        try {
            DepartamentDTO createdDepartament = departamentService.create(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdDepartament);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDepartament(@PathVariable String id, @RequestBody DepartamentDTO request) {
        try {
            return ResponseEntity.ok(departamentService.update(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDepartament(@PathVariable String id) {
        try {
            departamentService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}
